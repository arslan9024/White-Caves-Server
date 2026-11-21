/**
 * leasingSimOutreachFormula.ts
 * White Caves Real Estate LLC — 10-Number WhatsApp Hunter/Closer Formula
 *
 * Operational Formula:
 * - 1 Primary Master Closer SIM (+971505760056 — MD / Senior Manager ONLY):
 *     Exclusively handles post-availability landlord follow-ups, price negotiations,
 *     hot tenant lead closing, and VIP white-glove concierge.
 * - 9 Hunter Outreach SIMs (+ future human Leasing Agent SIMs):
 *     Exclusively execute Mission 1 — Meta-policy-safe paced landlord discovery campaigns
 *     to locate available-for-rent units and update Mary's Inventory Vault.
 *     HARD-BLOCKED from follow-up, price negotiation, or deal closing messages.
 */

import { assertTaskClearance, type OrgJobRole } from '../rbac/leasingRoleClearanceMatrix.js';

export type SimTier = 'PRIMARY_MASTER_CLOSER' | 'HUNTER_OUTREACH';

export type WhatsAppMessageMission =
  | 'MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'
  | 'MISSION_2_PRIMARY_FOLLOWUP_AND_NEGOTIATION'
  | 'MISSION_2_HOT_TENANT_CLOSING'
  | 'TENANCY_LIFECYCLE_CARE_NOTIFICATION';

export interface SimLinePolicyRecord {
  id: string;
  phoneNumber: string;
  sessionId: string;
  displayName: string;
  tier: SimTier;
  assignedUserId: string;
  assignedRole: OrgJobRole;
  hourlyCap: number;
  dailyCap: number;
  allowedMissions: WhatsAppMessageMission[];
}

export const PRIMARY_MASTER_PHONE = '+971505760056';

export const CANONICAL_10_SIM_FLEET: SimLinePolicyRecord[] = [
  {
    id: 'sim-01-master',
    phoneNumber: '+971505760056',
    sessionId: 'session-971505760056',
    displayName: 'Primary Master Closer — Arslan Malik (MD)',
    tier: 'PRIMARY_MASTER_CLOSER',
    assignedUserId: 'md-arslan-malik',
    assignedRole: 'MANAGING_DIRECTOR',
    hourlyCap: 25,
    dailyCap: 150,
    allowedMissions: [
      'MISSION_2_PRIMARY_FOLLOWUP_AND_NEGOTIATION',
      'MISSION_2_HOT_TENANT_CLOSING',
      'TENANCY_LIFECYCLE_CARE_NOTIFICATION',
    ],
  },
  { id: 'sim-02-hunter', phoneNumber: '+971503869886', sessionId: 'session-971503869886', displayName: 'Hunter SIM 02 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-03-hunter', phoneNumber: '+971505110636', sessionId: 'session-971505110636', displayName: 'Hunter SIM 03 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-04-hunter', phoneNumber: '+971589969886', sessionId: 'session-971589969886', displayName: 'Hunter SIM 04 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-05-hunter', phoneNumber: '+971553633595', sessionId: 'session-971553633595', displayName: 'Hunter SIM 05 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-06-hunter', phoneNumber: '+971559156636', sessionId: 'session-971559156636', displayName: 'Hunter SIM 06 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-07-hunter', phoneNumber: '+971505845825', sessionId: 'session-971505845825', displayName: 'Hunter SIM 07 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-08-hunter', phoneNumber: '+971507160096', sessionId: 'session-971507160096', displayName: 'Hunter SIM 08 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-09-hunter', phoneNumber: '+971553498722', sessionId: 'session-971553498722', displayName: 'Hunter SIM 09 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
  { id: 'sim-10-hunter', phoneNumber: '+971567160096', sessionId: 'session-971567160096', displayName: 'Hunter SIM 10 — DH2 Discovery', tier: 'HUNTER_OUTREACH', assignedUserId: 'md-arslan-malik', assignedRole: 'MANAGING_DIRECTOR', hourlyCap: 18, dailyCap: 90, allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'] },
];

const registeredAgentSims: SimLinePolicyRecord[] = [];

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function getAllSimLines(): SimLinePolicyRecord[] {
  return [...CANONICAL_10_SIM_FLEET, ...registeredAgentSims];
}

export function getHunterOutreachSims(agentUserId?: string): SimLinePolicyRecord[] {
  const hunters = getAllSimLines().filter(s => s.tier === 'HUNTER_OUTREACH');
  if (!agentUserId) return hunters;
  return hunters.filter(s => s.assignedUserId === agentUserId);
}

export function getPrimaryMasterCloserSim(): SimLinePolicyRecord {
  return CANONICAL_10_SIM_FLEET[0];
}

/**
 * Allows future human Leasing Agents (or MD) to register an additional Hunter SIM.
 * New employee SIMs are ALWAYS locked to HUNTER_OUTREACH — never PRIMARY_MASTER_CLOSER.
 */
export function registerEmployeeHunterSim(input: {
  phoneNumber: string;
  displayName: string;
  assignedUserId: string;
  actorRole: OrgJobRole;
}): SimLinePolicyRecord {
  assertTaskClearance(input.actorRole, 'ADD_HUNTER_WHATSAPP_SIM');
  const normalized = normalizePhone(input.phoneNumber);
  if (normalized.length < 11) throw new Error('Valid international phone number required (e.g. +9715XXXXXXXX)');
  if (getAllSimLines().some(s => normalizePhone(s.phoneNumber) === normalized)) {
    throw new Error(`SIM ${normalized} is already registered in the fleet`);
  }
  const digits = normalized.replace(/\D/g, '');
  const record: SimLinePolicyRecord = {
    id: `sim-agent-${digits.slice(-6)}`,
    phoneNumber: normalized,
    sessionId: `session-${digits}`,
    displayName: input.displayName.trim(),
    tier: 'HUNTER_OUTREACH',
    assignedUserId: input.assignedUserId,
    assignedRole: input.actorRole,
    hourlyCap: 15,
    dailyCap: 75,
    allowedMissions: ['MISSION_1_LANDLORD_AVAILABILITY_OUTREACH'],
  };
  registeredAgentSims.push(record);
  return record;
}

/**
 * Enforces the Sovereign Hunter/Closer WhatsApp Policy before any message is dispatched:
 * 1. Follow-up / price negotiation / hot closing / lifecycle care MUST use PRIMARY_MASTER_CLOSER (+971505760056)
 *    AND actor MUST hold Managing Director or Senior Leasing Manager clearance.
 * 2. Cold landlord discovery campaigns MUST use HUNTER_OUTREACH lines (never burn the Primary Master line on cold blasts!).
 */
export function enforceSimDispatchPolicy(input: {
  simPhone: string;
  mission: WhatsAppMessageMission;
  actorRole: OrgJobRole;
}): { allowed: true; sim: SimLinePolicyRecord } {
  const normalized = normalizePhone(input.simPhone);
  const sim = getAllSimLines().find(s => normalizePhone(s.phoneNumber) === normalized);
  if (!sim) throw new Error(`WhatsApp SIM ${input.simPhone} is not registered in the 10-SIM fleet`);

  if (input.mission === 'MISSION_1_LANDLORD_AVAILABILITY_OUTREACH') {
    assertTaskClearance(input.actorRole, 'RUN_HUNTER_OUTREACH_CAMPAIGN');
    if (sim.tier !== 'HUNTER_OUTREACH') {
      throw new Error(
        `Policy Violation: Primary Master SIM (${sim.phoneNumber}) is protected from cold outreach blasts. Use one of the 9 Hunter SIMs.`
      );
    }
    return { allowed: true, sim };
  }

  // All Mission 2 follow-ups, price negotiations, hot closings & care notifications require Primary Master + L4/L5 RBAC
  assertTaskClearance(input.actorRole, 'SEND_PRIMARY_MASTER_FOLLOWUP');
  if (sim.tier !== 'PRIMARY_MASTER_CLOSER') {
    throw new Error(
      `Policy Violation: Hunter SIM (${sim.phoneNumber}) cannot send '${input.mission}'. Only Primary Master Closer (${PRIMARY_MASTER_PHONE}) may follow up and negotiate.`
    );
  }
  return { allowed: true, sim };
}

/**
 * Handoff object created when a Hunter SIM discovers an available rental property:
 * Updates Mary's Inventory Vault and queues the landlord exclusively for Primary Master follow-up.
 */
export function createHunterToPrimaryMasterHandoff(input: {
  hunterSimPhone: string;
  discoveredByUserId: string;
  discoveredByRole: OrgJobRole;
  landlordName: string;
  landlordPhone: string;
  area: string;
  project: string;
  unitNumber: string;
  askingRentAed?: number;
  notes?: string;
}) {
  enforceSimDispatchPolicy({
    simPhone: input.hunterSimPhone,
    mission: 'MISSION_1_LANDLORD_AVAILABILITY_OUTREACH',
    actorRole: input.discoveredByRole,
  });

  const primary = getPrimaryMasterCloserSim();
  return {
    handoffId: `HO-${Date.now().toString(36).toUpperCase()}`,
    missionTransition: 'MISSION_1_DISCOVERY -> MISSION_2_PRIMARY_MASTER_NEGOTIATION',
    inventoryFormulaPath: `${input.area.trim()}/${input.project.trim()}/${input.unitNumber.trim()}`,
    discoveredBy: {
      userId: input.discoveredByUserId,
      role: input.discoveredByRole,
      hunterSimPhone: normalizePhone(input.hunterSimPhone),
    },
    assignedCloser: {
      phoneNumber: primary.phoneNumber,
      name: primary.displayName,
      requiredRole: 'MANAGING_DIRECTOR | SENIOR_LEASING_MANAGER',
    },
    landlord: {
      name: input.landlordName,
      phone: normalizePhone(input.landlordPhone),
    },
    askingRentAed: input.askingRentAed || null,
    nextRequiredAction: 'SCHEDULE_LANDLORD_NEGOTIATION_CALL_OR_GOOGLE_MEET',
    notes: input.notes || 'Available-for-rent confirmed via Hunter SIM; ready for Primary Master follow-up.',
    createdAt: new Date().toISOString(),
  };
}
