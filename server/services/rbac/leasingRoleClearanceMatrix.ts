/**
 * leasingRoleClearanceMatrix.ts
 * White Caves Real Estate LLC — Complete 8-Tier Organizational RBAC, Job Roles & Task Clearance Formula
 *
 * Full Reporting Authority Chain (Top to Bottom):
 *   1. MANAGING_DIRECTOR (Arslan Malik — First & Only Human Employee Today)
 *   2. COO (AI Zoe — WC-COO-01, reports to Managing Director)
 *   3. DIRECTOR (AI Clara — DIR-05, Sales, Services & Operations, reports to AI Zoe)
 *   4. MANAGER (AI Daisy Leasing — MGR-05-2 + Open Human Leasing Manager Position, reports to AI Clara)
 *   5. ASSISTANT_MANAGER (12 Assistant Managers in Daisy's Team, report to AI Daisy)
 *   6. SUPERVISOR (9 Supervisors per Assistant Manager = 108 Supervisors, report to Assistant Manager)
 *   7. TEAM_LEADER (AI Layla Field Team Leader + Open Human Position, reports to Supervisor)
 *   8. LEASING_AGENT (10 Leasing Agents paired with 10 WhatsApp SIMs + Open Human Positions, report to Team Leader)
 *   + Specialist/External Actors: DOCUMENT_CONTROLLER (AI Henry MGR-11-1), LANDLORD, TENANT
 */

export type OrgJobRole =
  | 'MANAGING_DIRECTOR'
  | 'COO'
  | 'DIRECTOR'
  | 'MANAGER'
  | 'ASSISTANT_MANAGER'
  | 'SUPERVISOR'
  | 'TEAM_LEADER'
  | 'LEASING_AGENT'
  | 'DOCUMENT_CONTROLLER'
  | 'LANDLORD'
  | 'TENANT';

export type ClearanceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LeasingTaskPermission =
  | 'RUN_HUNTER_OUTREACH_CAMPAIGN'
  | 'ADD_HUNTER_WHATSAPP_SIM'
  | 'LOG_DISCOVERED_INVENTORY'
  | 'VIEW_OWN_DISCOVERED_INVENTORY'
  | 'VIEW_TEAM_DISCOVERED_INVENTORY'
  | 'VIEW_ALL_COMPANY_INVENTORY'
  | 'SUPERVISE_LEASING_SQUAD'
  | 'MANAGE_DEPARTMENT_OPERATIONS'
  | 'SEND_PRIMARY_MASTER_FOLLOWUP'
  | 'NEGOTIATE_LANDLORD_PRICE'
  | 'SCHEDULE_MD_CALENDAR_MEETING'
  | 'PUBLISH_LIVE_WEB_LISTING'
  | 'SCHEDULE_TENANT_VIEWING'
  | 'SUBMIT_TENANT_OFFER'
  | 'APPROVE_LANDLORD_OFFER'
  | 'COLLECT_CHEQUES_AND_FEES'
  | 'VERIFY_PAYMENT_CLEARANCE'
  | 'UPLOAD_EJARI_AND_DEWA'
  | 'VIP_PROXY_UPLOAD_ON_BEHALF'
  | 'ENFORCE_GOOGLE_DRIVE_FORMULA';

export interface RoleClearanceDefinition {
  role: OrgJobRole;
  title: string;
  reportsToRole: OrgJobRole | 'SELF_SOVEREIGN';
  clearanceLevel: ClearanceLevel;
  canSeeAllInventory: boolean;
  canUsePrimaryMasterWhatsApp: boolean;
  canAddOwnHunterWhatsApp: boolean;
  isHumanFilledToday: boolean;
  openHumanPositionsCount: number;
  permissions: LeasingTaskPermission[];
}

const ALL_PERMISSIONS: LeasingTaskPermission[] = [
  'RUN_HUNTER_OUTREACH_CAMPAIGN',
  'ADD_HUNTER_WHATSAPP_SIM',
  'LOG_DISCOVERED_INVENTORY',
  'VIEW_OWN_DISCOVERED_INVENTORY',
  'VIEW_TEAM_DISCOVERED_INVENTORY',
  'VIEW_ALL_COMPANY_INVENTORY',
  'SUPERVISE_LEASING_SQUAD',
  'MANAGE_DEPARTMENT_OPERATIONS',
  'SEND_PRIMARY_MASTER_FOLLOWUP',
  'NEGOTIATE_LANDLORD_PRICE',
  'SCHEDULE_MD_CALENDAR_MEETING',
  'PUBLISH_LIVE_WEB_LISTING',
  'SCHEDULE_TENANT_VIEWING',
  'SUBMIT_TENANT_OFFER',
  'APPROVE_LANDLORD_OFFER',
  'COLLECT_CHEQUES_AND_FEES',
  'VERIFY_PAYMENT_CLEARANCE',
  'UPLOAD_EJARI_AND_DEWA',
  'VIP_PROXY_UPLOAD_ON_BEHALF',
  'ENFORCE_GOOGLE_DRIVE_FORMULA',
];

export const ORG_ROLE_CLEARANCE_MATRIX: Record<OrgJobRole, RoleClearanceDefinition> = {
  MANAGING_DIRECTOR: {
    role: 'MANAGING_DIRECTOR',
    title: 'Managing Director — Arslan Malik (First & Only Human Employee Today)',
    reportsToRole: 'SELF_SOVEREIGN',
    clearanceLevel: 8,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: true,
    openHumanPositionsCount: 0,
    permissions: ALL_PERMISSIONS,
  },
  COO: {
    role: 'COO',
    title: 'Chief Operating Officer — AI Zoe (WC-COO-01)',
    reportsToRole: 'MANAGING_DIRECTOR',
    clearanceLevel: 7,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 0,
    permissions: ALL_PERMISSIONS,
  },
  DIRECTOR: {
    role: 'DIRECTOR',
    title: 'Director of Sales, Services & Operations — AI Clara (DIR-05, Locked DEPT-05)',
    reportsToRole: 'COO',
    clearanceLevel: 6,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 1,
    permissions: ALL_PERMISSIONS,
  },
  MANAGER: {
    role: 'MANAGER',
    title: 'Residential Leasing Manager — AI Daisy (MGR-05-2) + Open Human Manager Position',
    reportsToRole: 'DIRECTOR',
    clearanceLevel: 5,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 1,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_TEAM_DISCOVERED_INVENTORY',
      'VIEW_ALL_COMPANY_INVENTORY',
      'SUPERVISE_LEASING_SQUAD',
      'MANAGE_DEPARTMENT_OPERATIONS',
      'SEND_PRIMARY_MASTER_FOLLOWUP',
      'NEGOTIATE_LANDLORD_PRICE',
      'SCHEDULE_MD_CALENDAR_MEETING',
      'PUBLISH_LIVE_WEB_LISTING',
      'SCHEDULE_TENANT_VIEWING',
      'SUBMIT_TENANT_OFFER',
      'APPROVE_LANDLORD_OFFER',
      'COLLECT_CHEQUES_AND_FEES',
      'VERIFY_PAYMENT_CLEARANCE',
      'UPLOAD_EJARI_AND_DEWA',
      'VIP_PROXY_UPLOAD_ON_BEHALF',
    ],
  },
  ASSISTANT_MANAGER: {
    role: 'ASSISTANT_MANAGER',
    title: 'Assistant Leasing Manager (12 Cluster & Operations Assistant Managers under Daisy)',
    reportsToRole: 'MANAGER',
    clearanceLevel: 4,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 12,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_TEAM_DISCOVERED_INVENTORY',
      'VIEW_ALL_COMPANY_INVENTORY',
      'SUPERVISE_LEASING_SQUAD',
      'PUBLISH_LIVE_WEB_LISTING',
      'SCHEDULE_TENANT_VIEWING',
      'SUBMIT_TENANT_OFFER',
      'COLLECT_CHEQUES_AND_FEES',
      'UPLOAD_EJARI_AND_DEWA',
    ],
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    title: 'Leasing Field Supervisor (9 Supervisors per Assistant Manager = 108 Supervisors)',
    reportsToRole: 'ASSISTANT_MANAGER',
    clearanceLevel: 3,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 12,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_TEAM_DISCOVERED_INVENTORY',
      'VIEW_ALL_COMPANY_INVENTORY',
      'SUPERVISE_LEASING_SQUAD',
      'SCHEDULE_TENANT_VIEWING',
      'SUBMIT_TENANT_OFFER',
    ],
  },
  TEAM_LEADER: {
    role: 'TEAM_LEADER',
    title: 'Leasing Team Leader (Leads 10 Leasing Agents & Reports to Supervisor)',
    reportsToRole: 'SUPERVISOR',
    clearanceLevel: 3,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 1,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_TEAM_DISCOVERED_INVENTORY',
      'SUPERVISE_LEASING_SQUAD',
      'SCHEDULE_TENANT_VIEWING',
      'SUBMIT_TENANT_OFFER',
    ],
  },
  DOCUMENT_CONTROLLER: {
    role: 'DOCUMENT_CONTROLLER',
    title: 'Document Controller & Record Keeper — AI Henry (MGR-11-1, Sole Male AI)',
    reportsToRole: 'DIRECTOR',
    clearanceLevel: 4,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    isHumanFilledToday: false,
    openHumanPositionsCount: 1,
    permissions: [
      'VIEW_ALL_COMPANY_INVENTORY',
      'VERIFY_PAYMENT_CLEARANCE',
      'UPLOAD_EJARI_AND_DEWA',
      'ENFORCE_GOOGLE_DRIVE_FORMULA',
    ],
  },
  LEASING_AGENT: {
    role: 'LEASING_AGENT',
    title: 'Residential Leasing Agent (10 Agents Paired with WhatsApp Hunter SIMs)',
    reportsToRole: 'TEAM_LEADER',
    clearanceLevel: 2,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: true,
    isHumanFilledToday: false,
    openHumanPositionsCount: 10,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'SCHEDULE_TENANT_VIEWING',
      'SUBMIT_TENANT_OFFER',
    ],
  },
  LANDLORD: {
    role: 'LANDLORD',
    title: 'Property Owner / Landlord Portal Actor',
    reportsToRole: 'MANAGER',
    clearanceLevel: 1,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    isHumanFilledToday: false,
    openHumanPositionsCount: 0,
    permissions: ['APPROVE_LANDLORD_OFFER'],
  },
  TENANT: {
    role: 'TENANT',
    title: 'Prospective or Active Tenant Portal Actor',
    reportsToRole: 'MANAGER',
    clearanceLevel: 1,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    isHumanFilledToday: false,
    openHumanPositionsCount: 0,
    permissions: ['SUBMIT_TENANT_OFFER', 'UPLOAD_EJARI_AND_DEWA'],
  },
};

export const FULL_LEASING_REPORTING_CHAIN: OrgJobRole[] = [
  'MANAGING_DIRECTOR',
  'COO',
  'DIRECTOR',
  'MANAGER',
  'ASSISTANT_MANAGER',
  'SUPERVISOR',
  'TEAM_LEADER',
  'LEASING_AGENT',
];

export function normalizeAppRoleToOrgRole(rawRole?: string): OrgJobRole {
  const r = String(rawRole || '').trim().toLowerCase();
  if (['owner', 'superadmin', 'md', 'managing_director', 'admin'].includes(r)) return 'MANAGING_DIRECTOR';
  if (r === 'coo' || r === 'zoe') return 'COO';
  if (r === 'director' || r === 'clara') return 'DIRECTOR';
  if (['manager', 'senior_manager', 'senior_leasing_manager', 'daisy'].includes(r)) return 'MANAGER';
  if (['assistant_manager', 'asst_manager'].includes(r)) return 'ASSISTANT_MANAGER';
  if (r === 'supervisor') return 'SUPERVISOR';
  if (['team_leader', 'lead'].includes(r)) return 'TEAM_LEADER';
  if (['document_controller', 'henry', 'compliance'].includes(r)) return 'DOCUMENT_CONTROLLER';
  if (r === 'landlord') return 'LANDLORD';
  if (r === 'tenant') return 'TENANT';
  return 'LEASING_AGENT';
}

export function hasTaskPermission(role: OrgJobRole, permission: LeasingTaskPermission): boolean {
  return ORG_ROLE_CLEARANCE_MATRIX[role].permissions.includes(permission);
}

export function assertTaskClearance(role: OrgJobRole, permission: LeasingTaskPermission): void {
  if (!hasTaskPermission(role, permission)) {
    const def = ORG_ROLE_CLEARANCE_MATRIX[role];
    throw new Error(
      `RBAC Clearance Denied: Role '${def.role}' (L${def.clearanceLevel}) is not authorized for '${permission}'.`
    );
  }
}

export interface ScopedInventoryRecord {
  id: string;
  discoveredByUserId?: string | null;
  agentId?: string | null;
  ownerAgentId?: string | null;
  [key: string]: unknown;
}

export function filterInventoryByActorScope<T extends ScopedInventoryRecord>(
  items: T[],
  actor: { userId: string; role: OrgJobRole }
): { scope: 'ALL_COMPANY_INVENTORY' | 'AGENT_DISCOVERED_ONLY'; total: number; items: T[] } {
  const def = ORG_ROLE_CLEARANCE_MATRIX[actor.role];
  if (def.canSeeAllInventory) {
    return { scope: 'ALL_COMPANY_INVENTORY', total: items.length, items };
  }
  const filtered = items.filter(
    item =>
      item.discoveredByUserId === actor.userId ||
      item.agentId === actor.userId ||
      item.ownerAgentId === actor.userId
  );
  return { scope: 'AGENT_DISCOVERED_ONLY', total: filtered.length, items: filtered };
}
