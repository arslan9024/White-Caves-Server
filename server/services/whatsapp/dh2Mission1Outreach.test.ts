import { describe, expect, it, vi } from 'vitest';

vi.mock('../../database.js', () => ({
  prisma: {
    property: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    lead: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn() },
    sheets: vi.fn(),
  },
}));

vi.mock('./WhatsAppEngine.js', () => ({
  WhatsAppEngineStatus: {
    DISCONNECTED: 'DISCONNECTED',
    AUTHENTICATING: 'AUTHENTICATING',
    CONNECTED: 'CONNECTED',
  },
  getWhatsAppEngine: vi.fn(() => ({
    on: vi.fn(),
    isConnected: () => false,
    getStatus: () => 'DISCONNECTED',
    getQRCode: () => null,
    getStats: () => ({
      status: 'DISCONNECTED',
      isConnected: false,
      messagesSent: 0,
      messagesReceived: 0,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    requestPairingCode: vi.fn().mockResolvedValue('1234-5678'),
  })),
}));

import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import { ingestAkoyaOxygenLandlords } from './dh2AkoyaSheetIngestor.js';
import {
  parseLandlordAvailabilityReply,
  processLandlordAvailabilityReply,
} from './dh2LandlordReplyVaultSync.js';

describe('Priority 2: 10-SIM Hunter/Closer Fleet, Akoya Ingestion & Mary Vault Sync', () => {
  it('enforces 10-SIM fleet with 9 Hunter SIMs and protects Primary Master (+971505760056) from cold outreach', async () => {
    const telemetry = lindaMultiSimPool.getPoolTelemetry();
    expect(telemetry.poolSize).toBe(10);
    expect(telemetry.hunterPoolSize).toBe(9);
    expect(telemetry.primaryMasterPhone).toBe(PRIMARY_MASTER_PHONE);
    expect(telemetry.primaryMasterProtectedFromColdOutreach).toBe(true);

    const recipients = Array.from({ length: 18 }, (_, i) => ({
      phone: `+9715011122${String(i).padStart(2, '0')}`,
      ownerName: `Landlord ${i + 1}`,
      cluster: 'Pacifica',
      unitRef: `P-${300 + i}`,
      bedrooms: '3',
    }));

    const result = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients,
      dryRun: true,
      respectBusinessHours: false,
    });

    expect(result.total).toBe(18);
    expect(result.dryRunCount).toBe(18);
    expect(result.primaryMasterProtected).toBe(PRIMARY_MASTER_PHONE);
    for (const item of result.plan) {
      expect(item.assignedSim).not.toBe(PRIMARY_MASTER_PHONE);
    }
    const uniqueHuntersUsed = new Set(result.plan.map(p => p.assignedSim));
    expect(uniqueHuntersUsed.size).toBeGreaterThanOrEqual(2);
  });

  it('ingests Akoya-Oxygen-2023-Arslan-only sheet tabs, normalizes UAE mobiles, skips rented/DNC & deduplicates', async () => {
    const mockSheets = {
      spreadsheets: {
        get: vi.fn().mockResolvedValue({
          data: {
            properties: { title: 'Akoya-Oxygen-2023-Arslan-only' },
            sheets: [
              { properties: { title: 'D2Magic' } },
              { properties: { title: 'ProjectsInD2' } },
              { properties: { title: 'Pacifica' } },
            ],
          },
        }),
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                ['Project', 'Owner Name', 'Mobile', 'Plot Number', 'Bedrooms', 'Property Status', 'Responses Status'],
                ['Pacifica @ Akoya Oxygen', 'Tariq Al Mansoori', '050 123 4567', '343', '3BR', 'Vacant', ''],
                ['Pacifica @ Akoya Oxygen', 'Duplicate Owner', '+971501234567', '344', '3BR', 'Vacant', ''],
                ['Pacifica @ Akoya Oxygen', 'Rented Owner', '055 987 6543', '345', '3BR', 'Rented', ''],
                ['Pacifica @ Akoya Oxygen', 'DNC Owner', '052 444 5555', '346', '3BR', 'Available', 'No WhatsApp'],
                ['Camelia @ Akoya Oxygen', 'Nadia Hassan', '971 | 58 222 3333', '108', '3', 'Available', ''],
              ],
            },
          }),
        },
      },
    } as any;

    const res = await ingestAkoyaOxygenLandlords({
      cluster: 'Pacifica',
      limit: 50,
      sheetsClientOverride: mockSheets,
    });

    expect(res.spreadsheetTitle).toBe('Akoya-Oxygen-2023-Arslan-only');
    expect(res.tabsScanned).toBe(1);
    expect(res.validLandlords).toBe(1);
    expect(res.skippedDuplicates).toBe(1);
    expect(res.skippedInvalid).toBe(2);
    expect(res.recipients[0]).toMatchObject({
      phone: '971501234567',
      e164: '+971501234567',
      ownerName: 'Tariq Al Mansoori',
      cluster: 'Pacifica',
      unitRef: '343',
      bedrooms: '3',
    });
  });

  it('parses landlord availability reply, upserts Mary Inventory Vault, and creates Mission 2 Primary Master handoff', async () => {
    const neg = parseLandlordAvailabilityReply('Sorry already rented out, not available');
    expect(neg.available).toBe(false);
    expect(neg.reason).toBe('landlord_declined_or_rented');

    const mockDb = {
      property: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'prop-mary-343' }),
      },
    };

    const synced = await processLandlordAvailabilityReply({
      hunterSimPhone: '+971503869886',
      landlordPhone: '+971501234567',
      landlordName: 'Tariq Al Mansoori',
      message: 'Yes my 3BR townhouse in Pacifica unit 343 is available for rent, asking 95k',
      dbOverride: mockDb,
    });

    expect(synced.syncedToMaryVault).toBe(true);
    expect(synced.cluster).toBe('Pacifica');
    expect(synced.unitNumber).toBe('343');
    expect(synced.askingRentAed).toBe(95000);
    expect(synced.vaultPropertyId).toBe('prop-mary-343');
    expect(mockDb.property.create).toHaveBeenCalledTimes(1);
    expect(synced.handoff?.assignedCloser.phoneNumber).toBe(PRIMARY_MASTER_PHONE);
    expect(synced.handoff?.missionTransition).toBe('MISSION_1_DISCOVERY -> MISSION_2_PRIMARY_MASTER_NEGOTIATION');
  });
});
