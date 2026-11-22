import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDubaiBusinessHours, isFridayPrayerPause } from './anti-ban/dubaiBusinessHoursGuard.js';
import {
  clearMemoryDncCacheForTests,
  computeSimWarmupPolicy,
  detectOptOutIntent,
  getDueHunterCadenceTouches,
  isPhoneSuppressed,
  scheduleHunter3TouchCadence,
  suppressPhoneOptOut,
} from './dh2OutreachGovernanceService.js';
import {
  enqueueMdPrimaryMasterFollowUp,
  extractStructuredUnitFacts,
  listMdPrimaryMasterQueue,
  recordWhatsAppConversationTurn,
} from './aiConversationAnalyzerService.js';
import { processLandlordAvailabilityReply } from './dh2LandlordReplyVaultSync.js';
import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';

describe('Wave 1 — Global DNC, 7-Day SIM Warmup, Friday Pause, 3-Touch Cadence & AI Analyzer', () => {
  beforeEach(() => {
    clearMemoryDncCacheForTests();
  });

  it('enforces Friday prayer pause (12:00–14:30 GST) and allows normal GST business hours', () => {
    // 2026-11-27 is a Friday. 08:30 UTC = 12:30 GST (inside Friday prayer pause)
    const fridayPrayer = new Date('2026-11-27T08:30:00Z');
    // 2026-11-27 11:00 UTC = 15:00 GST (after Friday prayer pause)
    const fridayAfternoon = new Date('2026-11-27T11:00:00Z');
    // 2026-11-26 is a Thursday. 08:30 UTC = 12:30 GST (normal business hours)
    const thursdayMidday = new Date('2026-11-26T08:30:00Z');

    expect(isFridayPrayerPause(fridayPrayer)).toBe(true);
    expect(isDubaiBusinessHours(fridayPrayer)).toBe(false);
    expect(isFridayPrayerPause(fridayAfternoon)).toBe(false);
    expect(isDubaiBusinessHours(fridayAfternoon)).toBe(true);
    expect(isFridayPrayerPause(thursdayMidday)).toBe(false);
    expect(isDubaiBusinessHours(thursdayMidday)).toBe(true);
  });

  it('computes 7-day SIM warmup hourly caps (5 -> 10 -> 18/hr)', () => {
    const now = new Date('2026-11-22T10:00:00Z');
    const day1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day6 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    expect(computeSimWarmupPolicy(day1, now)).toMatchObject({ hourlyCap: 5, stage: 'WARMUP_DAY_1_2' });
    expect(computeSimWarmupPolicy(day3, now)).toMatchObject({ hourlyCap: 10, stage: 'WARMUP_DAY_3_4' });
    expect(computeSimWarmupPolicy(day6, now)).toMatchObject({ hourlyCap: 18, stage: 'FULL_VELOCITY_DAY_5_PLUS' });
  });

  it('persists Global DNC opt-outs and blocks Hunter SIMs from re-messaging suppressed numbers', async () => {
    const consentUpsert = vi.fn().mockResolvedValue({ phone: '971501112233', consent: false });
    const queueUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const mockDb = {
      whatsAppConsent: {
        upsert: consentUpsert,
        findUnique: vi.fn().mockImplementation(async ({ where }) =>
          where?.phone === '971501112233' ? { consent: false } : null
        ),
      },
      followUpQueue: { updateMany: queueUpdateMany },
    };

    expect(detectOptOutIntent('STOP please, already rented out')).toMatchObject({ isOptOut: true });
    await suppressPhoneOptOut({ phone: '+971 50 111 2233', reason: 'landlord_stop', dbOverride: mockDb });

    expect(consentUpsert).toHaveBeenCalledTimes(1);
    expect(queueUpdateMany).toHaveBeenCalledTimes(1);
    expect(await isPhoneSuppressed('971501112233', mockDb)).toBe(true);

    const dispatch = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients: [
        { phone: '+971501112233', ownerName: 'Opted Out Owner', cluster: 'Camelia', unitRef: '101' },
        { phone: '+971509998877', ownerName: 'Active Owner', cluster: 'Pacifica', unitRef: '202' },
      ],
      dryRun: true,
      dbOverride: mockDb,
    });

    expect(dispatch.dncSuppressedCount).toBe(1);
    expect(dispatch.plan[0].status).toBe('dnc_suppressed');
    expect(dispatch.plan[1].status).toBe('dry_run');
  });

  it('schedules Day 4 & Day 14 Hunter cadence touches and filters out DNC numbers when due', async () => {
    const createdRows: any[] = [];
    const mockDb = {
      whatsAppConsent: { findUnique: vi.fn().mockResolvedValue(null) },
      followUpQueue: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const row = { id: `fq-${createdRows.length + 1}`, ...data };
          createdRows.push(row);
          return row;
        }),
        findMany: vi.fn().mockImplementation(async () => createdRows),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const baseDate = new Date('2026-11-22T09:00:00Z');
    const cadence = await scheduleHunter3TouchCadence({
      landlordPhone: '+971504445566',
      ownerName: 'Tariq',
      cluster: 'Basswood',
      unitRef: '343',
      bedrooms: '3',
      hunterSimPhone: '+971503869886',
      now: baseDate,
      dbOverride: mockDb,
    });

    expect(cadence.scheduled).toHaveLength(2);
    expect(cadence.scheduled[0].actionType).toBe('HUNTER_TOUCH_2_DAY4');
    expect(cadence.scheduled[1].actionType).toBe('HUNTER_TOUCH_3_DAY14');

    const due = await getDueHunterCadenceTouches(new Date('2026-12-10T09:00:00Z'), mockDb);
    expect(due).toHaveLength(2);
  });

  it('extracts structured unit facts from multi-turn replies + voice note + Title Deed & enqueues MD Primary Master Queue', async () => {
    const facts = extractStructuredUnitFacts({
      text: 'Yes vacant now, asking 115,000 AED in 4 cheques, semi-furnished, keys are with me.',
      attachments: [
        { mimeType: 'application/pdf', fileName: 'Title_Deed_Unit_214.pdf' },
        { mimeType: 'audio/ogg', isVoiceNote: true, transcript: 'Ready to move immediately in Albizia' },
      ],
    });

    expect(facts.askingRentAed).toBe(115000);
    expect(facts.chequesCount).toBe(4);
    expect(facts.vacantDate).toBe('IMMEDIATE');
    expect(facts.furnishing).toBe('SEMI_FURNISHED');
    expect(facts.keyStatus).toBe('WITH_LANDLORD');
    expect(facts.hasTitleDeedMedia).toBe(true);
    expect(facts.hasVoiceNote).toBe(true);

    const queueRows: any[] = [];
    const mockDb = {
      aIConversation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'conv-1' }),
      },
      property: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'prop-albizia-214' }),
      },
      followUpQueue: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          const rec = { id: `mdq-${queueRows.length + 1}`, createdAt: new Date(), ...data };
          queueRows.push(rec);
          return rec;
        }),
        findMany: vi.fn().mockImplementation(async () => queueRows),
      },
    };

    const result = await processLandlordAvailabilityReply({
      hunterSimPhone: '+971503869886',
      landlordPhone: '+971507778899',
      landlordName: 'Mr. Khalid',
      message: 'Yes vacant now in Albizia unit 214, 3BR asking 115,000 in 4 cheques, unfurnished, keys are with me',
      attachments: [{ mimeType: 'application/pdf', fileName: 'Title_Deed_214.pdf' }],
      dbOverride: mockDb,
    });

    expect(result.syncedToMaryVault).toBe(true);
    expect(result.mdQueueItem?.primaryMasterPhone).toBe('+971505760056');
    expect(result.mdQueueItem?.priority).toBe('HIGH');

    const listed = await listMdPrimaryMasterQueue('pending', mockDb);
    expect(listed).toHaveLength(1);
    expect(listed[0].cluster).toBe('Albizia');
  });
});
