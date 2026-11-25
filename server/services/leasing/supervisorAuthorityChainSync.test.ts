import { describe, it, expect } from 'vitest';
import {
  buildServerSupervisorAuthorityChain,
  DMS_ZOE_MISSION_OPEN_POSITIONS,
  SOVEREIGN_SUPERVISOR_CHAINS,
} from './supervisorAuthorityChainSync.js';

describe('supervisorAuthorityChainSync (TURING-SUPERVISOR-CHAIN-019)', () => {
  it('builds deterministic top-to-bottom Bhakti coordinates under AI Zoe (COO)', () => {
    const chain = buildServerSupervisorAuthorityChain(
      { deptSlot: 5, managerSlot: 2, assistantManagerSlot: 1, supervisorSlot: 1 },
      'AI Noor',
      'TMS-COL-TRACK-A-LEASING-PORTALS'
    );

    expect(chain.executiveSponsor).toBe('MD-01 (Arslan Malik)');
    expect(chain.executivePartner).toBe('AI Zoe (COO)');
    expect(chain.departmentCode).toBe('DEPT-05');
    expect(chain.directorId).toBe('DIR-05');
    expect(chain.divisionCode).toBe('DIV-05-2');
    expect(chain.managerId).toBe('MGR-05-2');
    expect(chain.unitCode).toBe('UNIT-05-2-01');
    expect(chain.assistantManagerId).toBe('AMGR-05-2-01');
    expect(chain.squadCode).toBe('SQD-05-2-01-1');
    expect(chain.supervisorId).toBe('SUP-05-2-01-1');
    expect(chain.dmsSynced).toBe(true);
    expect(chain.tmsSynced).toBe(true);
  });

  it('registers Track A (SUP-05-2-01-1) and Track B (SUP-12-1-01-1) in DMS/TMS lockstep', () => {
    const trackA = SOVEREIGN_SUPERVISOR_CHAINS.find(c => c.track === 'TRACK_A');
    const trackB = SOVEREIGN_SUPERVISOR_CHAINS.find(c => c.track === 'TRACK_B');

    expect(trackA?.authorityChain.supervisorId).toBe('SUP-05-2-01-1');
    expect(trackB?.authorityChain.supervisorId).toBe('SUP-12-1-01-1');
    expect(DMS_ZOE_MISSION_OPEN_POSITIONS.map(p => p.supervisorId)).toEqual([
      'SUP-05-2-01-1',
      'SUP-12-1-01-1',
    ]);
  });
});
