import { describe, it, expect, vi } from 'vitest';
import { processDueQueueBatch } from '../services/leasing/leasingQueueWorkerService.js';
import {
  getOutreachJob,
  startBackgroundOutreachJob,
} from '../services/whatsapp/lindaOutreachJobRunner.js';
import { routeInboundTenantViewingInquiry } from '../services/whatsapp/dh2TenantViewingRouter.js';
import { resolvePuppeteerExecutablePath } from '../services/whatsapp/engine/whatsAppLifecycleManager.js';

describe('AI Linda Daily Readiness & End-to-End Leasing Workflow Guards', () => {
  it('defers FollowUpQueue items when target WhatsApp SIM is offline instead of silently marking processed', async () => {
    const updateMock = vi.fn(async () => ({}));
    const mockDb = {
      followUpQueue: {
        findMany: vi.fn(async () => [
          {
            id: 'fq-offline-1',
            entityId: '971509998877',
            status: 'pending',
            scheduledAt: new Date(Date.now() - 60_000),
            payload: {
              tenantPhone: '+971509998877',
              senderWhatsApp: '+971505760056',
              message: 'Viewing reminder in 2 hours',
            },
          },
        ]),
        update: updateMock,
      },
      whatsAppConsent: {
        findUnique: vi.fn(async () => null),
      },
    };

    // During Dubai business hours (mock system time to 10:30 GST = 06:30 UTC on a Wednesday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T06:30:00Z'));
    try {
      const res = await processDueQueueBatch(10, mockDb);
      expect(res.totalChecked).toBe(1);
      expect(res.processed).toBe(0);
      expect(res.deferredOffline).toBe(1);
      expect(updateMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('executes live paced outreach jobs asynchronously without blocking HTTP requests', async () => {
    const job = startBackgroundOutreachJob({
      label: 'DH2 Pacifica Live Test Job',
      totalRecipients: 3,
      runner: async () => ({ total: 3, sent: 2 }),
    });

    expect(job.jobId).toMatch(/^linda-job-/);
    await new Promise(resolve => setTimeout(resolve, 25));

    const fetched = getOutreachJob(job.jobId);
    expect(fetched?.status).toBe('completed');
    expect(fetched?.sentCount).toBe(2);
    expect(fetched?.skippedCount).toBe(1);
  });

  it('auto-matches Mary Inventory Vault available units during inbound tenant viewing triage for Daisy', async () => {
    const mockDb = {
      lead: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'lead-dh2-99' })),
      },
      property: {
        findMany: vi.fn(async () => [
          {
            id: 'prop-pac-1',
            title: '3BR Townhouse in Pacifica, DAMAC Hills 2',
            subCommunity: 'Pacifica',
            unitNumber: 'PAC-108',
            bedrooms: 3,
            annualRentAed: 92000,
            status: 'AVAILABLE',
            inventoryStage: 'verified_active',
          },
        ]),
      },
    };

    const routed = await routeInboundTenantViewingInquiry({
      fromPhone: '+971504443322',
      tenantName: 'Sara Al Hashimi',
      message: 'Hi Linda, looking to rent a 3BR villa in Pacifica budget 100k, can I book a viewing?',
      dbOverride: mockDb,
    });

    expect(routed.routed).toBe(true);
    expect(routed.delegatedTo?.supervisorCode).toBe('SUP-05-2-01-1');
    expect(routed.matchedUnits).toHaveLength(1);
    expect(routed.matchedUnits?.[0].cluster).toBe('Pacifica');
    expect(routed.suggestedReply).toContain('Mary matched 1 verified option');
  });

  it('resolves a usable system Chrome/Edge executable when Puppeteer download is skipped', () => {
    const bin = resolvePuppeteerExecutablePath();
    // On developer Windows machine Chrome/Edge is installed; allow undefined only on minimal CI images
    if (process.platform === 'win32') {
      expect(typeof bin).toBe('string');
      expect(bin!.length).toBeGreaterThan(0);
    }
  });
});
