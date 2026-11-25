import { describe, expect, it } from 'vitest';
import {
  computeAntiBanDelayMs,
  DH2_CLUSTERS,
  lindaMultiSimPool,
} from './LindaMultiSimPoolService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';

describe('LindaMultiSimPoolService (10-SIM Fleet Rotation & DH2 Inbound Routing)', () => {
  it('registers all 10 canonical White Caves WhatsApp lines (1 Primary Master + 9 Hunter SIMs)', () => {
    const accounts = lindaMultiSimPool.listPoolAccounts();
    expect(accounts.length).toBe(10);
    const phones = accounts.map(a => a.phoneNumber);
    expect(phones).toContain(PRIMARY_MASTER_PHONE);
    expect(phones).toContain('+971503869886');
    expect(phones).toContain('+971505110636');
    expect(phones).toContain('+971589969886');
    expect(phones).toContain('+971553633595');
    expect(lindaMultiSimPool.getHunterPoolAccounts()).toHaveLength(9);
  });

  it('switches active account via MultiAccountSwitcherManager', () => {
    const switched = lindaMultiSimPool.switchActiveAccount('+971503869886');
    expect(switched?.phone).toBe('+971503869886');
    lindaMultiSimPool.switchActiveAccount(PRIMARY_MASTER_PHONE);
  });

  it('enforces 35–65s randomized Gaussian anti-ban pacing', () => {
    for (let i = 0; i < 20; i++) {
      const delay = computeAntiBanDelayMs();
      expect(delay).toBeGreaterThanOrEqual(35_000);
      expect(delay).toBeLessThanOrEqual(65_000);
    }
  });

  it('rotates dry-run DH2 landlord outreach strictly across Hunter SIMs and protects Primary Master', async () => {
    const res = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients: [
        { phone: '+971501000001', ownerName: 'Owner 1', cluster: 'Camelia', bedrooms: '3' },
        { phone: '+971501000002', ownerName: 'Owner 2', cluster: 'Albizia', bedrooms: '3' },
        { phone: '+971501000003', ownerName: 'Owner 3', cluster: 'Basswood', bedrooms: '3' },
        { phone: '+971501000004', ownerName: 'Owner 4', cluster: 'Pacifica', bedrooms: '4' },
        { phone: '+971501000005', ownerName: 'Owner 5', cluster: 'Clivia', bedrooms: '3' },
      ],
      dryRun: true,
      respectBusinessHours: false,
    });
    expect(res.total).toBe(5);
    expect(res.dryRunCount).toBe(5);
    const assignedSims = new Set(res.plan.map(p => p.assignedSim));
    expect(assignedSims.size).toBe(5);
    expect(assignedSims.has(PRIMARY_MASTER_PHONE)).toBe(false);
  });

  it('routes inbound DH2 tenant viewing inquiries to Daisy (MGR-05-2)', async () => {
    const routed = await lindaMultiSimPool.routeInboundTenantToViewing({
      fromPhone: '+971529998877',
      message: 'Hi, I want to schedule a viewing for a 3BR townhouse for rent in Camelia DAMAC Hills 2',
      tenantName: 'Test Tenant',
    });
    expect(routed.routed).toBe(true);
    expect(routed.cluster).toBe('Camelia');
    expect(routed.bedrooms).toBe(3);
    expect(routed.delegatedTo?.id).toBe('MGR-05-2');
    expect(DH2_CLUSTERS).toContain('Amargo');
  });
});
