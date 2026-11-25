/**
 * leasingQueueWorkerService.ts
 * White Caves Real Estate LLC — Background Worker for FollowUpQueue Messaging
 *
 * Processes due WhatsApp messages and notifications (e.g. stage care updates,
 * viewing reminders, T-7d PDC cheque alerts, 90-day RERA renewal notices, Hunter touches).
 * Preserves pending queue items whenever the target SIM is offline instead of silently dropping them.
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { lindaMultiSimPool } from '../whatsapp/LindaMultiSimPoolService.js';
import { isPhoneSuppressed } from '../whatsapp/dh2OutreachGovernanceService.js';
import { PRIMARY_MASTER_PHONE } from '../whatsapp/leasingSimOutreachFormula.js';
import { isDubaiBusinessHours, isFridayPrayerPause } from '../whatsapp/anti-ban/index.js';

const log = createLogger('LeasingQueueWorker');
const defaultDb = prisma as any;
const MAX_DELIVERY_RETRIES = 5;

let schedulerHandle: ReturnType<typeof setInterval> | null = null;
let workerTickRunning = false;

export async function processDueQueueBatch(limit = 20, dbOverride?: any) {
  const db = dbOverride || defaultDb;
  const now = new Date();

  if (!isDubaiBusinessHours(now) || isFridayPrayerPause(now)) {
    return {
      processed: 0,
      deferredOffline: 0,
      failed: 0,
      totalChecked: 0,
      reason: 'outside_business_hours_or_friday_pause',
    };
  }

  let items: any[] = [];
  try {
    items =
      (await db.followUpQueue?.findMany?.({
        where: {
          status: 'pending',
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
      })) || [];
  } catch (err) {
    log.warn('Failed querying FollowUpQueue:', err);
    return {
      processed: 0,
      deferredOffline: 0,
      failed: 0,
      totalChecked: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let processedCount = 0;
  let deferredOffline = 0;
  let failedCount = 0;

  for (const item of items) {
    const payload = (item.payload || {}) as Record<string, any>;
    const recipientPhone =
      payload.tenantPhone || payload.landlordPhone || payload.recipientPhone || item.entityId;

    if (!recipientPhone) {
      await db.followUpQueue.update({
        where: { id: item.id },
        data: { status: 'failed', processedAt: now },
      });
      failedCount++;
      continue;
    }

    if (await isPhoneSuppressed(recipientPhone, db)) {
      await db.followUpQueue.update({
        where: { id: item.id },
        data: { status: 'suppressed_dnc', processedAt: now },
      });
      continue;
    }

    const message = payload.message || payload.whatsappMessage;
    if (!message) {
      await db.followUpQueue.update({
        where: { id: item.id },
        data: { status: 'processed', processedAt: now },
      });
      processedCount++;
      continue;
    }

    const senderSimPhone = payload.senderWhatsApp || payload.hunterSimPhone || PRIMARY_MASTER_PHONE;
    const account = lindaMultiSimPool.findAccount(senderSimPhone);
    const engine = account ? lindaMultiSimPool.getEngineForAccount(account) : null;

    if (!engine || !engine.isConnected()) {
      // Do NOT mark as processed while SIM is offline — defer for next scheduler tick
      deferredOffline++;
      log.warn(`Deferred queue item ${item.id}: SIM ${senderSimPhone} is offline.`);
      continue;
    }

    try {
      await engine.sendMessage(String(recipientPhone), String(message));
      await db.followUpQueue.update({
        where: { id: item.id },
        data: { status: 'processed', processedAt: now },
      });
      processedCount++;
    } catch (sendErr) {
      const retries = Number(payload.retryCount || 0) + 1;
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      log.warn(`Failed sending queued message ${item.id} (attempt ${retries}/${MAX_DELIVERY_RETRIES}):`, errMsg);
      await db.followUpQueue.update({
        where: { id: item.id },
        data: {
          status: retries >= MAX_DELIVERY_RETRIES ? 'failed' : 'pending',
          processedAt: retries >= MAX_DELIVERY_RETRIES ? now : undefined,
          payload: { ...payload, retryCount: retries, lastError: errMsg },
        },
      });
      if (retries >= MAX_DELIVERY_RETRIES) failedCount++;
    }
  }

  return {
    processed: processedCount,
    deferredOffline,
    failed: failedCount,
    totalChecked: items.length,
  };
}

/**
 * Starts the 60-second background worker loop for FollowUpQueue delivery.
 */
export function startLeasingQueueScheduler(intervalMs = 60_000): void {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return;
  if (schedulerHandle) return;

  schedulerHandle = setInterval(() => {
    if (workerTickRunning) return;
    workerTickRunning = true;
    void processDueQueueBatch(20)
      .catch(err => log.warn('Scheduled FollowUpQueue tick failed:', err))
      .finally(() => {
        workerTickRunning = false;
      });
  }, intervalMs);

  log.info(`Leasing FollowUpQueue scheduler active (every ${Math.round(intervalMs / 1000)}s).`);
}

export function stopLeasingQueueScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
