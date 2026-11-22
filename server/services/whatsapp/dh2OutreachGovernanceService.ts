/**
 * dh2OutreachGovernanceService.ts
 * White Caves Real Estate LLC — Global DNC Suppression, 7-Day SIM Warmup & 3-Touch Hunter Cadence
 *
 * Enforces:
 * 1. Persisted Global DNC (Prisma `WhatsAppConsent`) so no Hunter SIM ever re-messages opted-out landlords.
 * 2. 7-Day SIM Warmup schedule: Days 0–2 => 5/hr, Days 2–4 => 10/hr, Day 5+ => 18/hr.
 * 3. Day 0 / Day 4 / Day 14 Hunter follow-up cadence persisted in Prisma `FollowUpQueue`.
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('Dh2OutreachGovernance');
const defaultDb = prisma as any;

const OPT_OUT_REGEX =
  /\b(stop|unsubscribe|remove me|do not contact|don't contact|dont contact|not interested|already rented|rented out|rented|sold|wrong number|no thanks|leave me alone|block)\b/i;

const memoryDncCache = new Map<string, { phone: string; reason: string; optedOutAt: string }>();

export function normalizeCanonicalPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('971')) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `971${digits.slice(1)}`;
  return digits;
}

export function detectOptOutIntent(message: string): { isOptOut: boolean; matchedTerm: string | null } {
  const match = String(message || '').match(OPT_OUT_REGEX);
  return { isOptOut: Boolean(match), matchedTerm: match ? match[1].toLowerCase() : null };
}

export async function suppressPhoneOptOut(input: {
  phone: string;
  reason?: string;
  dbOverride?: any;
}): Promise<{ phone: string; suppressed: true; reason: string; optedOutAt: string }> {
  const phone = normalizeCanonicalPhone(input.phone);
  const reason = input.reason || 'opt_out_detected';
  const now = new Date();
  const optedOutAt = now.toISOString();

  memoryDncCache.set(phone, { phone, reason, optedOutAt });

  const db = input.dbOverride || defaultDb;
  try {
    if (db.whatsAppConsent?.upsert) {
      await db.whatsAppConsent.upsert({
        where: { phone },
        update: { consent: false, optedOutAt: now },
        create: { phone, consent: false, optedOutAt: now },
      });
    }
  } catch (err) {
    log.warn('DNC Prisma persistence skipped:', err instanceof Error ? err.message : err);
  }

  await cancelPendingLandlordCadence(phone, `dnc:${reason}`, db);
  return { phone, suppressed: true, reason, optedOutAt };
}

export async function isPhoneSuppressed(phone: string, dbOverride?: any): Promise<boolean> {
  const clean = normalizeCanonicalPhone(phone);
  if (!clean) return true;
  if (memoryDncCache.has(clean)) return true;

  const db = dbOverride || defaultDb;
  try {
    const rec = await db.whatsAppConsent?.findUnique?.({
      where: { phone: clean },
      select: { consent: true },
    });
    if (rec && rec.consent === false) {
      memoryDncCache.set(clean, { phone: clean, reason: 'prisma_dnc', optedOutAt: new Date().toISOString() });
      return true;
    }
  } catch (err) {
    log.warn('DNC Prisma lookup skipped:', err instanceof Error ? err.message : err);
  }
  return false;
}

export async function listSuppressedPhones(dbOverride?: any): Promise<Array<{ phone: string; optedOutAt: string | null }>> {
  const db = dbOverride || defaultDb;
  const results = new Map<string, string | null>();
  for (const [p, entry] of memoryDncCache.entries()) results.set(p, entry.optedOutAt);
  try {
    const rows = await db.whatsAppConsent?.findMany?.({
      where: { consent: false },
      orderBy: { optedOutAt: 'desc' },
      take: 500,
    });
    for (const r of rows || []) {
      results.set(r.phone, r.optedOutAt ? new Date(r.optedOutAt).toISOString() : null);
    }
  } catch (err) {
    log.warn('DNC list query skipped:', err instanceof Error ? err.message : err);
  }
  return Array.from(results.entries()).map(([phone, optedOutAt]) => ({ phone, optedOutAt }));
}

export function clearMemoryDncCacheForTests(): void {
  memoryDncCache.clear();
}

export interface SimWarmupPolicy {
  ageDays: number;
  hourlyCap: 5 | 10 | 18;
  stage: 'WARMUP_DAY_1_2' | 'WARMUP_DAY_3_4' | 'FULL_VELOCITY_DAY_5_PLUS';
}

/**
 * 7-Day SIM Warmup Enforcement:
 * - Days 0–2 (< 2 days active): 5 msgs/hr
 * - Days 2–4 (2 to < 4 days active): 10 msgs/hr
 * - Day 5+ (>= 4 days active): 18 msgs/hr (full Hunter cap)
 */
export function computeSimWarmupPolicy(simActivatedAt?: Date | string | null, now = new Date()): SimWarmupPolicy {
  if (!simActivatedAt) {
    return { ageDays: 7, hourlyCap: 18, stage: 'FULL_VELOCITY_DAY_5_PLUS' };
  }
  const activated = simActivatedAt instanceof Date ? simActivatedAt : new Date(simActivatedAt);
  if (Number.isNaN(activated.getTime())) {
    return { ageDays: 7, hourlyCap: 18, stage: 'FULL_VELOCITY_DAY_5_PLUS' };
  }
  const ageDays = Math.max(0, (now.getTime() - activated.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays < 2) return { ageDays: Number(ageDays.toFixed(2)), hourlyCap: 5, stage: 'WARMUP_DAY_1_2' };
  if (ageDays < 4) return { ageDays: Number(ageDays.toFixed(2)), hourlyCap: 10, stage: 'WARMUP_DAY_3_4' };
  return { ageDays: Number(ageDays.toFixed(2)), hourlyCap: 18, stage: 'FULL_VELOCITY_DAY_5_PLUS' };
}

export const HUNTER_3_TOUCH_CADENCE_DAYS = [0, 4, 14] as const;

export const HUNTER_FOLLOWUP_TEMPLATES: Record<'TOUCH_2_DAY4' | 'TOUCH_3_DAY14', string> = {
  TOUCH_2_DAY4:
    'Hi {{ownerName}}, quick follow-up from Linda at White Caves Real Estate LLC regarding your {{bedrooms}}BR in {{cluster}}, DAMAC Hills 2 (unit {{unitRef}}). We still have verified tenants ready for viewings this week — is it becoming available soon?',
  TOUCH_3_DAY14:
    'Hello {{ownerName}}, final polite check-in from White Caves Real Estate (DAMAC Hills 2 Leasing Desk) for unit {{unitRef}} in {{cluster}}. Whenever you decide to lease or renew, feel free to reply here anytime — or reply STOP if you prefer no further messages.',
};

export async function scheduleHunter3TouchCadence(input: {
  landlordPhone: string;
  ownerName?: string;
  cluster: string;
  unitRef: string;
  bedrooms?: string;
  hunterSimPhone: string;
  now?: Date;
  dbOverride?: any;
}) {
  const cleanPhone = normalizeCanonicalPhone(input.landlordPhone);
  const now = input.now ?? new Date();
  const db = input.dbOverride || defaultDb;

  const touches = [
    {
      touchNumber: 2,
      actionType: 'HUNTER_TOUCH_2_DAY4',
      scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      template: HUNTER_FOLLOWUP_TEMPLATES.TOUCH_2_DAY4,
    },
    {
      touchNumber: 3,
      actionType: 'HUNTER_TOUCH_3_DAY14',
      scheduledAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      template: HUNTER_FOLLOWUP_TEMPLATES.TOUCH_3_DAY14,
    },
  ];

  const scheduled: Array<{ id?: string; touchNumber: number; actionType: string; scheduledAt: string }> = [];
  for (const t of touches) {
    const message = t.template
      .replace(/\{\{ownerName\}\}/g, input.ownerName || 'Valued Owner')
      .replace(/\{\{cluster\}\}/g, input.cluster)
      .replace(/\{\{unitRef\}\}/g, input.unitRef)
      .replace(/\{\{bedrooms\}\}/g, input.bedrooms || '3');

    let id: string | undefined;
    try {
      if (db.followUpQueue?.create) {
        const rec = await db.followUpQueue.create({
          data: {
            entityId: cleanPhone,
            entityType: 'DH2_LANDLORD_OUTREACH',
            sequenceId: 'DH2_3TOUCH_HUNTER_CADENCE',
            actionType: t.actionType,
            scheduledAt: t.scheduledAt,
            status: 'pending',
            payload: {
              landlordPhone: `+${cleanPhone}`,
              ownerName: input.ownerName || 'Valued Owner',
              cluster: input.cluster,
              unitRef: input.unitRef,
              bedrooms: input.bedrooms || '3',
              hunterSimPhone: input.hunterSimPhone,
              touchNumber: t.touchNumber,
              message,
            },
          },
        });
        id = rec?.id;
      }
    } catch (err) {
      log.warn('Cadence FollowUpQueue persistence skipped:', err instanceof Error ? err.message : err);
    }
    scheduled.push({ id, touchNumber: t.touchNumber, actionType: t.actionType, scheduledAt: t.scheduledAt.toISOString() });
  }
  return { landlordPhone: `+${cleanPhone}`, scheduled };
}

export async function cancelPendingLandlordCadence(landlordPhone: string, reason: string, dbOverride?: any) {
  const cleanPhone = normalizeCanonicalPhone(landlordPhone);
  const db = dbOverride || defaultDb;
  try {
    if (db.followUpQueue?.updateMany) {
      const res = await db.followUpQueue.updateMany({
        where: { entityId: cleanPhone, entityType: 'DH2_LANDLORD_OUTREACH', status: 'pending' },
        data: { status: 'paused', processedAt: new Date() },
      });
      return { cancelled: res?.count ?? 0, reason };
    }
  } catch (err) {
    log.warn('Cadence cancellation skipped:', err instanceof Error ? err.message : err);
  }
  return { cancelled: 0, reason };
}

export async function getDueHunterCadenceTouches(now = new Date(), dbOverride?: any) {
  const db = dbOverride || defaultDb;
  try {
    const rows = (await db.followUpQueue?.findMany?.({
      where: {
        entityType: 'DH2_LANDLORD_OUTREACH',
        status: 'pending',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    })) || [];

    const eligible = [];
    for (const row of rows) {
      if (await isPhoneSuppressed(row.entityId, db)) {
        await cancelPendingLandlordCadence(row.entityId, 'dnc_suppressed', db);
        continue;
      }
      eligible.push(row);
    }
    return eligible;
  } catch (err) {
    log.warn('Due cadence query skipped:', err instanceof Error ? err.message : err);
    return [];
  }
}
