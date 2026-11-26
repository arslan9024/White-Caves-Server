/**
 * supervisorAuthorityChainSync.ts — TURING-SUPERVISOR-CHAIN-019 Server Lockstep Sync
 * Mirrors Aegis-Sterling/rules/supervisorChain.rule.ts & registry/supervisorMissionRegistry.ts
 * for DMS Zoe team positions and TMS labeled task collections (< 350 lines, AEG-042).
 */

export interface BhaktiSupervisorCoordinates {
  deptSlot: number;
  managerSlot: number;
  assistantManagerSlot: number;
  supervisorSlot: number;
}

export interface TaskSupervisorAuthorityLabel {
  executiveSponsor: 'MD-01 (Arslan Malik)';
  executivePartner: 'AI Zoe (COO)';
  departmentCode: string;
  directorId: string;
  divisionCode: string;
  managerId: string;
  unitCode: string;
  assistantManagerId: string;
  squadCode: string;
  supervisorId: string;
  supervisorName: string;
  taskCollectionLabel: string;
  dmsSynced: boolean;
  tmsSynced: boolean;
}

export interface SovereignMissionChainRecord {
  missionId: string;
  track: 'TRACK_A' | 'TRACK_B';
  title: string;
  dmsPositionCode: string;
  tmsTaskCode: string;
  authorityChain: TaskSupervisorAuthorityLabel;
}

export function buildServerSupervisorAuthorityChain(
  coords: BhaktiSupervisorCoordinates,
  supervisorName: string,
  taskCollectionLabel: string,
  syncFlags: { dmsSynced?: boolean; tmsSynced?: boolean } = { dmsSynced: true, tmsSynced: true }
): TaskSupervisorAuthorityLabel {
  const dd = String(coords.deptSlot).padStart(2, '0');
  const aa = String(coords.assistantManagerSlot).padStart(2, '0');
  return {
    executiveSponsor: 'MD-01 (Arslan Malik)',
    executivePartner: 'AI Zoe (COO)',
    departmentCode: `DEPT-${dd}`,
    directorId: `DIR-${dd}`,
    divisionCode: `DIV-${dd}-${coords.managerSlot}`,
    managerId: `MGR-${dd}-${coords.managerSlot}`,
    unitCode: `UNIT-${dd}-${coords.managerSlot}-${aa}`,
    assistantManagerId: `AMGR-${dd}-${coords.managerSlot}-${aa}`,
    squadCode: `SQD-${dd}-${coords.managerSlot}-${aa}-${coords.supervisorSlot}`,
    supervisorId: `SUP-${dd}-${coords.managerSlot}-${aa}-${coords.supervisorSlot}`,
    supervisorName: supervisorName.trim(),
    taskCollectionLabel: taskCollectionLabel.trim(),
    dmsSynced: Boolean(syncFlags.dmsSynced),
    tmsSynced: Boolean(syncFlags.tmsSynced),
  };
}

export const SOVEREIGN_SUPERVISOR_CHAINS: SovereignMissionChainRecord[] = [
  {
    missionId: 'MISSION-2026-11-TRACK-A',
    track: 'TRACK_A',
    title: 'Auth Gateway & Role-Based Portals (MD / Landlord / Tenant) + 12-Stage Tenancy Deal Cockpit',
    dmsPositionCode: 'OPEN-DEPT05-SUP-PORTALS-01',
    tmsTaskCode: 'TSK-PORTAL-01',
    authorityChain: buildServerSupervisorAuthorityChain(
      { deptSlot: 5, managerSlot: 2, assistantManagerSlot: 1, supervisorSlot: 1 },
      'AI Noor (Leasing Portals & 12-Stage Deal Cockpit Supervisor)',
      'TMS-COL-TRACK-A-LEASING-PORTALS',
      { dmsSynced: true, tmsSynced: true }
    ),
  },
  {
    missionId: 'MISSION-2026-11-TRACK-B',
    track: 'TRACK_B',
    title: 'Frontend Wave 2 & Wave 3 Atomic Decomposition (AEG-042 < 350 Lines)',
    dmsPositionCode: 'OPEN-DEPT12-SUP-ARCH-01',
    tmsTaskCode: 'TSK-ARCH-W3',
    authorityChain: buildServerSupervisorAuthorityChain(
      { deptSlot: 12, managerSlot: 1, assistantManagerSlot: 1, supervisorSlot: 1 },
      'AI Mary Wilkes (Frontend Wave 2 & Wave 3 Architecture Decomposition Supervisor)',
      'TMS-COL-TRACK-B-ARCH-DECOMPOSITION',
      { dmsSynced: true, tmsSynced: true }
    ),
  },
];

export const DMS_ZOE_MISSION_OPEN_POSITIONS = [
  {
    positionId: 'OPEN-DEPT05-SUP-PORTALS-01',
    title: 'Leasing Portals & 12-Stage Deal Cockpit Supervisor',
    departmentCode: 'DEPT-05',
    managerId: 'MGR-05-2',
    assistantManagerId: 'AMGR-05-2-01',
    supervisorId: 'SUP-05-2-01-1',
    aiActingActor: 'AI Noor (SUP-05-2-01-1)',
    status: 'OPEN_FOR_HIRING',
  },
  {
    positionId: 'OPEN-DEPT12-SUP-ARCH-01',
    title: 'Frontend Architecture Governance & Decomposition Supervisor',
    departmentCode: 'DEPT-12',
    managerId: 'MGR-12-1',
    assistantManagerId: 'AMGR-12-1-01',
    supervisorId: 'SUP-12-1-01-1',
    aiActingActor: 'AI Mary Wilkes (SUP-12-1-01-1)',
    status: 'OPEN_FOR_HIRING',
  },
];
