/**
 * leasingQueueWorkerService.ts
 * White Caves Real Estate LLC — Background Worker for FollowUpQueue Messaging
 *
 * Processes due WhatsApp messages and notifications (e.g. stage care updates,
 * viewing reminders, T-7d PDC cheque alerts, 90-day RERA renewal notices, Hunter touches).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { lindaMultiSimPool } from '../whatsapp/LindaMultiSimPoolService.js';
import { isPhoneSuppressed } from '../whatsapp/dh2OutreachGovernanceService.js';
import { PRIMARY_MASTER_PHONE } from '../whatsapp/leasingSimOutreachFormula.js';
import { isDubaiBusinessHours, isFridayPrayerPause } from '../whatsapp/anti-ban/index.js';

const log = createLogger('LeasingQueueWorker');
const defaultDb = prisma as any;

export async function processDueQueueBatch(limit = 20, dbOverride?: any) {
  const db = dbOverride || defaultDb;
  const now = new Date();

  // Guard against sending outside Dubai business hours or Friday prayer
  if (!isDubaiBusinessHours(now) || isFridayPrayerPause(now)) {
    return { processed: 0, reason: 'outside_business_hours_or_friday_pause' };
  }

  let items: any[] = [];
  try {
    items = (await db.followUpQueue?.findMany?.({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    })) || [];
  } catch (err) {
    log.warn('Failed querying FollowUpQueue:', err);
    return { processed: 0, error: err instanceof Error ? err.message : String(err) };
  }

  let processedCount = 0;
  for (const item of items) {
    const payload = item.payload || {};
    const recipientPhone = payload.tenantPhone || payload.landlordPhone || payload.recipientPhone || item.entityId;

    if (!recipientPhone) {
      await db.followUpQueue.update({
        where: { id: item.id },
        data: { status: 'failed', processedAt: now },
      });
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
      continue;
    }

    // Determine sending SIM: Primary Master for closing/care/reminders, Hunter for discovery
    const senderSimPhone = payload.senderWhatsApp || payload.hunterSimPhone || PRIMARY_MASTER_PHONE;
    const account = lindaMultiSimPool.findAccount(senderSimPhone);

    if (account) {
      const engine = lindaMultiSimPool.getEngineForAccount(account);
      if (engine.isConnected()) {
        try {
          await engine.sendMessage(recipientPhone, message);
        } catch (sendErr) {
          log.warn(`Failed sending message to ${recipientPhone}:`, sendErr);
        }
      }
    }

    await db.followUpQueue.update({
      where: { id: item.id },
      data: { status: 'processed', processedAt: now },
    });
    processedCount++;
  }

  return { processed: processedCount, totalChecked: items.length };
}
