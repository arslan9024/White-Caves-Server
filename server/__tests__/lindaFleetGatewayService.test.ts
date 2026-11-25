import { describe, it, expect } from 'vitest';
import { LindaFleetGatewayService } from '../services/lindaFleetGatewayService.js';

describe('LindaFleetGatewayService Fleet Operations', () => {
  it('lists all 10 canonical multi-SIM lines in Linda fleet (1 Primary Master + 9 Hunters)', () => {
    const lines = LindaFleetGatewayService.listFleetLines();
    expect(lines).toHaveLength(10);
    expect(lines[0].lineId).toBe('sim-01-master');
    expect(lines[0].phoneNumber).toBe('+971505760056');
    expect(lines[0].simTier).toBe('PRIMARY_MASTER_CLOSER');
    expect(lines.filter(l => l.simTier === 'HUNTER_OUTREACH')).toHaveLength(9);
  });

  it('selects a healthy Hunter Outreach SIM and protects Primary Master (+971505760056) from cold blasts', () => {
    const line = LindaFleetGatewayService.selectBestDispatchLine();
    expect(line.isActive).toBe(true);
    expect(line.healthScore).toBeGreaterThanOrEqual(80);
    expect(line.simTier).toBe('HUNTER_OUTREACH');
    expect(line.phoneNumber).not.toBe('+971505760056');

    // Requesting Primary Master without allowMasterCloser falls back to a Hunter line
    const fallback = LindaFleetGatewayService.selectBestDispatchLine('sim-01-master', false);
    expect(fallback.simTier).toBe('HUNTER_OUTREACH');
  });

  it('correctly classifies inbound inquiry intents and routes to Supervisor AI agents with Bhakti codes', () => {
    const leaseIntent = LindaFleetGatewayService.classifyInboundIntent('Hi, I need an Ejari renewal for my villa in Akoya');
    expect(leaseIntent).toBe('TENANT_LEASING');
    const leaseRoute = LindaFleetGatewayService.routeToAutonomousAgent(leaseIntent);
    expect(leaseRoute.targetAgent).toBe('daisy');
    expect(leaseRoute.employeeCode).toBe('SUP-05-2-01-1');

    const landlordIntent = LindaFleetGatewayService.classifyInboundIntent('I am the owner of unit 402 and want to list it');
    expect(landlordIntent).toBe('LANDLORD_INQUIRY');
    const landlordRoute = LindaFleetGatewayService.routeToAutonomousAgent(landlordIntent);
    expect(landlordRoute.targetAgent).toBe('linda');
    expect(landlordRoute.employeeCode).toBe('SUP-08-1-01-1');

    const buyerIntent = LindaFleetGatewayService.classifyInboundIntent('Can I book a viewing for the 4-bedroom villa tomorrow?');
    expect(buyerIntent).toBe('BUYER_VIEWING');
    const buyerRoute = LindaFleetGatewayService.routeToAutonomousAgent(buyerIntent);
    expect(buyerRoute.targetAgent).toBe('mary');
    expect(buyerRoute.employeeCode).toBe('SUP-06-1-01-1');
  });
});
