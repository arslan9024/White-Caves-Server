import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMemoryDncCacheForTests,
  isPhoneSuppressed,
  removePhoneOptOut,
  suppressPhoneOptOut,
} from './dh2OutreachGovernanceService.js';
import { classifyWarmContact, getDh2WarmContacts } from './dh2WarmContactsService.js';
import {
  CAMPAIGN_SEQUENCE_LIBRARY,
  getRecentDeliveryLogs,
  launchWarmSequenceCampaign,
  runEndToEndDispatchAndTriageTest,
  sanitizeAndAuditOutboundMessage,
} from './dh2CampaignSequencesService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';

describe('AI Linda — DH2 Warm Contacts, Privacy/DLD Sequences & E2E Triage', () => {
  beforeEach(() => {
    clearMemoryDncCacheForTests();
  });

  it('extracts & categorizes Henry Drive tenancy contracts + local DH2 registry into Landlord Retention & Tenant Follow-up', async () => {
    const now = new Date('2026-11-25T10:00:00Z');
    const mockDb = {
      tenancyContract: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'tc-1',
            endDate: new Date('2026-12-15T00:00:00Z'), // 20 days -> EXPIRING_SOON
            annualRentAed: 105000,
            property: { subCommunity: 'Pacifica', bedrooms: 3 },
            chequesSchedule: {
              lifecycleState: {
                project: 'Pacifica',
                landlordName: 'Khalid Al Mansoori',
                landlordPhone: '+971501234501',
                tenantName: 'Elena Rossi',
                tenantPhone: '+971529876501',
              },
            },
          },
          {
            id: 'tc-2',
            endDate: new Date('2027-02-10T00:00:00Z'), // ~77 days -> RERA_90D_RENEWAL_WINDOW
            annualRentAed: 120000,
            property: { subCommunity: 'Camelia', bedrooms: 4 },
            chequesSchedule: {
              lifecycleState: {
                project: 'Camelia',
                landlordName: 'Mariam Al Suwaidi',
                landlordPhone: '+971551234502',
                tenantName: 'David Chen',
                tenantPhone: '+971569876502',
              },
            },
          },
        ]),
      },
      lease: { findMany: vi.fn().mockResolvedValue([]) },
      whatsAppConsent: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const summary = await getDh2WarmContacts({ limit: 120, now, dbOverride: mockDb });

    expect(summary.total).toBeGreaterThanOrEqual(4);
    expect(summary.landlordRetentionCount).toBeGreaterThanOrEqual(2);
    expect(summary.tenantFollowUpCount).toBeGreaterThanOrEqual(2);
    expect(summary.sources.HENRY_DRIVE_TENANCY).toBe(4);

    const khalid = summary.contacts.find(c => c.name === 'Khalid Al Mansoori');
    expect(khalid).toMatchObject({
      role: 'LANDLORD',
      category: 'LANDLORD_RETENTION_RENEWAL',
      urgency: 'EXPIRING_SOON',
      cluster: 'Pacifica',
    });

    const elena = summary.contacts.find(c => c.name === 'Elena Rossi');
    expect(elena).toMatchObject({
      role: 'TENANT',
      category: 'TENANT_FOLLOWUP',
      urgency: 'EXPIRING_SOON',
      cluster: 'Pacifica',
    });

    expect(classifyWarmContact({ role: 'LANDLORD', daysUntilExpiry: -5 }).urgency).toBe('EXPIRED_REENGAGE');
    expect(classifyWarmContact({ role: 'TENANT', daysUntilExpiry: 150 }).urgency).toBe('ALTERNATIVE_UNIT_MATCH');
  });

  it('enforces Public Listing Privacy Rule (strips unit/villa/plot numbers), Anti-Spam filter, and whitecaves.ae + Arslan Malik CTA', () => {
    const leaky =
      'Hi Tariq, regarding Villa 412 and Unit VRD-312 (Plot 88) in Vardon, DAMAC Hills 2 — visit https://whitecaves.ae to schedule a viewing with Arslan Malik.';
    const audited = sanitizeAndAuditOutboundMessage(leaky);

    expect(audited.passed).toBe(true);
    expect(audited.strippedPrivateTokens.length).toBeGreaterThanOrEqual(3);
    expect(audited.sanitizedMessage).not.toMatch(/Villa 412|VRD-312|Plot 88/i);
    expect(audited.hasWhiteCavesAeCta).toBe(true);
    expect(audited.hasArslanBookingCta).toBe(true);

    const spammy = sanitizeAndAuditOutboundMessage(
      'ACT NOW! FREE MONEY and GUARANTEED PROFIT limited time offer!'
    );
    expect(spammy.passed).toBe(false);
    expect(spammy.spamRiskScore).toBeGreaterThanOrEqual(25);
    expect(spammy.violations.length).toBeGreaterThanOrEqual(2);

    // Every canonical template must pass compliance cleanly
    for (const steps of Object.values(CAMPAIGN_SEQUENCE_LIBRARY)) {
      for (const step of steps) {
        const res = sanitizeAndAuditOutboundMessage(
          step.body
            .replace(/\{\{name\}\}/g, 'Ahmed')
            .replace(/\{\{cluster\}\}/g, 'Pacifica')
            .replace(/\{\{bedrooms\}\}/g, '3')
        );
        expect(res.passed).toBe(true);
        expect(res.strippedPrivateTokens).toHaveLength(0);
      }
    }
  });

  it('enforces DNC suppression, DNC unblock, Primary Master protection on discovery, and delivery logging', async () => {
    const mockDb = {
      whatsAppConsent: {
        upsert: vi.fn().mockResolvedValue({ consent: false }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      followUpQueue: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    await suppressPhoneOptOut({ phone: '+971501119999', reason: 'stop_reply', dbOverride: mockDb });
    expect(await isPhoneSuppressed('+971501119999', mockDb)).toBe(true);

    const discoveryRes = await launchWarmSequenceCampaign({
      sequenceKey: 'DH2_LANDLORD_DISCOVERY',
      dryRun: true,
      respectBusinessHours: false,
      recipientsOverride: [
        { phone: '+971501119999', name: 'Suppressed Owner', cluster: 'Vardon', bedrooms: '3' },
        { phone: '+971502228888', name: 'Eligible Owner', cluster: 'Vardon', bedrooms: '3' },
      ],
      dbOverride: mockDb,
    });

    expect(discoveryRes.dncSuppressedCount).toBe(1);
    expect(discoveryRes.dryRunCount).toBe(1);
    // Cold discovery MUST NEVER use Primary Master Closer
    expect(discoveryRes.deliveryLogs[1].assignedSim).not.toBe(PRIMARY_MASTER_PHONE);
    expect(discoveryRes.deliveryLogs[1].simTier).toBe('HUNTER_OUTREACH');
    expect(discoveryRes.deliveryLogs[1].privacyAuditPassed).toBe(true);

    await removePhoneOptOut('+971501119999', mockDb);
    expect(await isPhoneSuppressed('+971501119999', mockDb)).toBe(false);
    expect(getRecentDeliveryLogs(10).length).toBeGreaterThanOrEqual(2);
  });

  it('runs End-to-End Test Dispatch & Inbound Chat Triage for both Landlord Retention and Tenant Follow-Up', async () => {
    const mockDb = {
      whatsAppConsent: { findUnique: vi.fn().mockResolvedValue(null) },
      aIConversation: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'c1' }) },
      property: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'p-1' }) },
      lead: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'l-1' }) },
      followUpQueue: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'fq-1' }),
      },
    };

    const landlordReport = await runEndToEndDispatchAndTriageTest({
      sequenceKey: 'LANDLORD_RETENTION_RENEWAL',
      cluster: 'Pacifica',
      testPhone: '+971509001122',
      dbOverride: mockDb,
    });

    expect(landlordReport.verified).toBe(true);
    expect(landlordReport.outboundPayload?.privacyAuditPassed).toBe(true);
    expect(landlordReport.outboundPayload?.message).toContain('https://whitecaves.ae');
    expect(landlordReport.outboundPayload?.message).toContain('Arslan Malik');
    expect((landlordReport.inboundTriage.result as any).syncedToMaryVault).toBe(true);

    const tenantReport = await runEndToEndDispatchAndTriageTest({
      sequenceKey: 'TENANT_FOLLOWUP',
      cluster: 'Camelia',
      testPhone: '+971529003344',
      dbOverride: mockDb,
    });

    expect(tenantReport.verified).toBe(true);
    expect((tenantReport.inboundTriage.result as any).routed).toBe(true);
    expect((tenantReport.inboundTriage.result as any).delegatedTo?.id).toBe('MGR-05-2');
  });
});
