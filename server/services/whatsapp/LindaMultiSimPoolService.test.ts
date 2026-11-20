import { describe, expect, it } from 'vitest';
import {
  computeAntiBanDelayMs,
  DH2_CLUSTERS,
  lindaMultiSimPool,
} from './LindaMultiSimPoolService.js';

describe('LindaMultiSimPoolService (5-SIM Rotation & DH2 Inbound Routing)', () => {
  it('registers all 5 canonical White Caves WhatsApp lines', () => {
    const accounts = lindaMultiSimPool.listPoolAccounts();
    expect(accounts.length).toBe(5);
    const phones = accounts.map(a => a.phoneNumber);
    expect(phones).toContain('+971505760056');
    expect(phones).toContain('+971503869886');
    expect(phones).toContain('+971505110636');
    expect(phones).toContain('+971589969886');
    expect(phones).toContain('+971553633595');
  });

  it('switches active account via MultiAccountSwitcherManager', () => {
    const switched = lindaMultiSimPool.switchActiveAccount('+971503869886');
    expect(switched?.phone).toBe('+971503869886');
    lindaMultiSimPool.switchActiveAccount('+971505760056');
  });

  it('enforces 35–65s randomized Gaussian anti-ban pacing', () => {
    for (let i = 0; i < 20; i++) {
      const delay = computeAntiBanDelayMs();
      expect(delay).toBeGreaterThanOrEqual(35_000);
      expect(delay).toBeLessThanOrEqual(65_000);
    }
  });

  it('rotates dry-run DH2 landlord outreach across all 5 SIMs', async () => {
    const res = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients: [
        { phone: '+971501000001', ownerName: 'Owner 1', cluster: 'Camelia', unitRef: 'CAM-101', bedrooms: '3' },
        { phone: '+971501000002', ownerName: 'Owner 2', cluster: 'Albizia', unitRef: 'ALB-202', bedrooms: '3' },
        { phone: '+971501000003', ownerName: 'Owner 3', cluster: 'Basswood', unitRef: 'BAS-303', bedrooms: '3' },
        { phone: '+971501000004', ownerName: 'Owner 4', cluster: 'Pacifica', unitRef: 'PAC-404', bedrooms: '4' },
        { phone: '+971501000005', ownerName: 'Owner 5', cluster: 'Clivia', unitRef: 'CLI-505', bedrooms: '3' },
      ],
      dryRun: true,
      respectBusinessHours: false,
    });
    expect(res.total).toBe(5);
    expect(res.dryRunCount).toBe(5);
    const assignedSims = new Set(res.plan.map(p => p.assignedSim));
    expect(assignedSims.size).toBe(5);
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
