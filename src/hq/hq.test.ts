import { describe, it, expect, beforeEach } from 'vitest';
import { WhiteCavesHQ } from './WhiteCavesHQ';

describe('WhiteCavesHQ', () => {
  beforeEach(() => {
    WhiteCavesHQ.resetRoot();
  });

  it('returns a singleton instance from WhiteCavesHQ.getRoot()', () => {
    const first = WhiteCavesHQ.getRoot();
    const second = WhiteCavesHQ.getRoot();
    expect(first).toBe(second);
  });

  it('exposes AICCSanctum with 12 Directors and 108 Managers', () => {
    const hq = WhiteCavesHQ.getRoot();
    expect(hq.sanctum.council.listDirectors()).toHaveLength(12);
    expect(hq.sanctum.divisions.getManagerCount()).toBe(108);
    expect(hq.sanctum.divisions.findManagerByName('Linda')).toBeDefined();
    expect(hq.sanctum.divisions.findManagerByName('Mary')).toBeDefined();
    expect(hq.sanctum.divisions.findManagerByName('Daisy')).toBeDefined();
    expect(hq.sanctum.divisions.findManagerByName('Henry')).toBeDefined();
  });

  it('dispatches agent workflows with TURING-SUPERVISOR-CHAIN-019 on system events', async () => {
    const hq = WhiteCavesHQ.getRoot();
    const result = await hq.handleSystemEvent('deal:created', 'sales', {
      dealId: 'DEAL-001',
    });

    expect(result.telemetry.status).toBe('COMPLETED');
    expect(result.chain.mdId).toBe('MD-01');
    expect(result.chain.cooId).toBe('COO-ZOE');
    expect(result.chain.directorId).toBe('DIR-02');
    expect(result.chain.managerId).toBe('MGR-02-1');
    expect(result.chain.supervisorId).toMatch(/^SUP-02-1-01-1$/);
    expect(hq.getEventLog()).toHaveLength(1);
  });
});
