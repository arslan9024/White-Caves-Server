import { describe, it, expect } from 'vitest';
import { LindaFleetGatewayService } from '../services/lindaFleetGatewayService.js';

describe('LindaFleetGatewayService Fleet Operations', () => {
  it('lists all 5 active multi-SIM lines in Linda fleet', () => {
    const lines = LindaFleetGatewayService.listFleetLines();
    expect(lines).toHaveLength(5);
    expect(lines.map(l => l.lineId)).toEqual(['sim-1', 'sim-2', 'sim-3', 'sim-4', 'sim-5']);
  });

  it('selects the least busy healthy SIM line for automated dispatch', () => {
    const line = LindaFleetGatewayService.selectBestDispatchLine();
    expect(line.isActive).toBe(true);
    expect(line.healthScore).toBeGreaterThanOrEqual(80);
    // sim-3 has lowest active conversations (5)
    expect(line.lineId).toBe('sim-3');
  });

  it('correctly classifies inbound inquiry intents and routes to appropriate autonomous agent', () => {
    const leaseIntent = LindaFleetGatewayService.classifyInboundIntent('Hi, I need an Ejari renewal for my villa in Akoya');
    expect(leaseIntent).toBe('TENANT_LEASING');
    const leaseRoute = LindaFleetGatewayService.routeToAutonomousAgent(leaseIntent);
    expect(leaseRoute.targetAgent).toBe('daisy');

    const landlordIntent = LindaFleetGatewayService.classifyInboundIntent('I am the owner of unit 402 and want to list it');
    expect(landlordIntent).toBe('LANDLORD_INQUIRY');
    const landlordRoute = LindaFleetGatewayService.routeToAutonomousAgent(landlordIntent);
    expect(landlordRoute.targetAgent).toBe('linda');

    const buyerIntent = LindaFleetGatewayService.classifyInboundIntent('Can I book a viewing for the 4-bedroom villa tomorrow?');
    expect(buyerIntent).toBe('BUYER_VIEWING');
    const buyerRoute = LindaFleetGatewayService.routeToAutonomousAgent(buyerIntent);
    expect(buyerRoute.targetAgent).toBe('mary');
  });
});
