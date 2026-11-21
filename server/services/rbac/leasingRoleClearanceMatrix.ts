/**
 * leasingRoleClearanceMatrix.ts
 * White Caves Real Estate LLC — Organizational RBAC, Job Roles & Task Clearance Formula
 *
 * Designed for Solo Managing Director + AICC-Sanctum operation today, and seamless
 * delegation to human Leasing Agents, Senior Managers & Document Controllers as the team scales.
 */

export type OrgJobRole =
  | 'MANAGING_DIRECTOR'
  | 'SENIOR_LEASING_MANAGER'
  | 'LEASING_AGENT'
  | 'DOCUMENT_CONTROLLER'
  | 'LANDLORD'
  | 'TENANT';

export type ClearanceLevel = 1 | 2 | 3 | 4 | 5;

export type LeasingTaskPermission =
  | 'RUN_HUNTER_OUTREACH_CAMPAIGN'
  | 'ADD_HUNTER_WHATSAPP_SIM'
  | 'LOG_DISCOVERED_INVENTORY'
  | 'VIEW_OWN_DISCOVERED_INVENTORY'
  | 'VIEW_ALL_COMPANY_INVENTORY'
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
  clearanceLevel: ClearanceLevel;
  canSeeAllInventory: boolean;
  canUsePrimaryMasterWhatsApp: boolean;
  canAddOwnHunterWhatsApp: boolean;
  permissions: LeasingTaskPermission[];
}

export const ORG_ROLE_CLEARANCE_MATRIX: Record<OrgJobRole, RoleClearanceDefinition> = {
  MANAGING_DIRECTOR: {
    role: 'MANAGING_DIRECTOR',
    title: 'Managing Director (Sovereign Override & VIP Closer)',
    clearanceLevel: 5,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_ALL_COMPANY_INVENTORY',
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
    ],
  },
  SENIOR_LEASING_MANAGER: {
    role: 'SENIOR_LEASING_MANAGER',
    title: 'Senior Leasing Manager (Follow-Up, Price Negotiation & Deal Closure)',
    clearanceLevel: 4,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: true,
    canAddOwnHunterWhatsApp: true,
    permissions: [
      'RUN_HUNTER_OUTREACH_CAMPAIGN',
      'ADD_HUNTER_WHATSAPP_SIM',
      'LOG_DISCOVERED_INVENTORY',
      'VIEW_OWN_DISCOVERED_INVENTORY',
      'VIEW_ALL_COMPANY_INVENTORY',
      'SEND_PRIMARY_MASTER_FOLLOWUP',
      'NEGOTIATE_LANDLORD_PRICE',
      'SCHEDULE_MD_CALENDAR_MEETING',
      'PUBLISH_LIVE_WEB_LISTING',
      'SCHEDULE_TENANT_VIEWING',
      'COLLECT_CHEQUES_AND_FEES',
      'VERIFY_PAYMENT_CLEARANCE',
      'UPLOAD_EJARI_AND_DEWA',
      'VIP_PROXY_UPLOAD_ON_BEHALF',
    ],
  },
  DOCUMENT_CONTROLLER: {
    role: 'DOCUMENT_CONTROLLER',
    title: 'Document Controller & Record Keeper (Henry MGR-11-1 / Admin Desk)',
    clearanceLevel: 3,
    canSeeAllInventory: true,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    permissions: [
      'VIEW_ALL_COMPANY_INVENTORY',
      'VERIFY_PAYMENT_CLEARANCE',
      'UPLOAD_EJARI_AND_DEWA',
      'ENFORCE_GOOGLE_DRIVE_FORMULA',
    ],
  },
  LEASING_AGENT: {
    role: 'LEASING_AGENT',
    title: 'Residential Leasing Agent (Mission 1 Hunter & Viewing Execution)',
    clearanceLevel: 2,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: true,
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
    clearanceLevel: 1,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    permissions: ['APPROVE_LANDLORD_OFFER'],
  },
  TENANT: {
    role: 'TENANT',
    title: 'Prospective or Active Tenant Portal Actor',
    clearanceLevel: 1,
    canSeeAllInventory: false,
    canUsePrimaryMasterWhatsApp: false,
    canAddOwnHunterWhatsApp: false,
    permissions: ['SUBMIT_TENANT_OFFER', 'UPLOAD_EJARI_AND_DEWA'],
  },
};

export function normalizeAppRoleToOrgRole(rawRole?: string): OrgJobRole {
  const r = String(rawRole || '').trim().toLowerCase();
  if (['owner', 'superadmin', 'md', 'managing_director', 'admin'].includes(r)) return 'MANAGING_DIRECTOR';
  if (['senior_manager', 'senior_leasing_manager', 'manager', 'director'].includes(r)) return 'SENIOR_LEASING_MANAGER';
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
