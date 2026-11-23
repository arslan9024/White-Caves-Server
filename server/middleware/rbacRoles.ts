/**
 * RBAC Role Maps & Types
 * ───────────────────────
 * Canonical backend role mappings, alias resolutions, hierarchy levels, and rank tiers.
 * Single-purpose module conforming to AEGIS V5.1 rule AEG-042 (<= 300 lines).
 */

// ─── Role alias map ─────────────────────────────────────────────────────────
// Maps frontend / UI role IDs (stored in JWT) to canonical backend roles.
// If a role is already canonical it maps to itself (or is absent and passes through).
export const ROLE_ALIAS_MAP: Record<string, string> = {
  // Level 6: Managing Director / Owner
  managing_director: 'owner',
  lion: 'owner',
  real_estate_company: 'owner',
  super_admin: 'admin',

  // Level 5: Director
  director: 'director',

  // Level 4: Manager
  manager: 'manager',
  branch_manager: 'manager',
  sales_manager: 'manager',
  leasing_manager: 'manager',
  marketing_manager: 'manager',
  property_mgmt_company: 'manager',

  // Level 3: Supervisor
  supervisor: 'supervisor',

  // Level 2: Team Leader
  team_leader: 'team_leader',
  lead: 'team_leader',
  squad_leader: 'team_leader',

  // Level 1: Employee / Agent
  employee: 'employee',
  agent: 'agent',
  sales_agent: 'sales_agent',
  leasing_agent: 'leasing_agent',
  property_manager: 'agent',
  intern: 'employee',
  staff: 'employee',
  affiliated_agent: 'secondary-sales-agent',

  // Client Portals (Track B: Categories 1 - 6)
  landlord: 'landlord',
  tenant: 'tenant',
  buyer: 'buyer',
  seller: 'seller',
  external_agent: 'external_agent',
  external_company: 'external_company',
  developer: 'external_company',
  investor: 'buyer',
  offplan_buyer: 'buyer',
  conveyancer: 'external_company',
  contractor: 'external_company',

  // Specialist → viewer
  property_consultant: 'viewer',
  mortgage_consultant: 'viewer',
  valuation_expert: 'viewer',
  // Support
  trustee_officer: 'admin',
  legal_officer: 'admin',
  finance_officer: 'finance',
  document_controller: 'admin',
  // Identity mappings — canonical roles resolve to themselves
  owner: 'owner',
  admin: 'admin',
  finance: 'finance',
  'secondary-sales-agent': 'secondary-sales-agent',
  'leasing-agent': 'leasing-agent',
  viewer: 'viewer',
  hr_staff: 'hr_staff',
  accounts_staff: 'accounts_staff',
  property_owner: 'property_owner',
  user: 'user',
};

/**
 * Resolve any incoming role string (frontend UI role or legacy alias) to
 * the canonical backend key used by ROLE_HIERARCHY / ROLE_PERMISSIONS.
 */
export function resolveBackendRole(role: string): string {
  if (!role || typeof role !== 'string') return 'user';
  const normalized = role.toLowerCase().trim();
  // eslint-disable-next-line security/detect-object-injection
  return ROLE_ALIAS_MAP[normalized] ?? normalized;
}

// ─── Role hierarchy (Level 1..6 internal staff, plus client portal tiers) ──
export const ROLE_HIERARCHY: Record<string, number> = {
  // Track A: Internal Staff (6 Levels)
  owner: 100, // Level 6: Managing Director & Owner
  managing_director: 100,
  director: 95, // Level 5: Department Pillar Director
  manager: 90, // Level 4: Division Manager
  admin: 80,
  supervisor: 75, // Level 3: Task Supervisor
  finance: 70,
  hr_staff: 65,
  accounts_staff: 65,
  team_leader: 60, // Level 2: Squad Team Leader
  leasing_agent: 55,
  sales_agent: 55,
  'leasing-agent': 55,
  'secondary-sales-agent': 55,
  agent: 50,
  employee: 50, // Level 1: Corporate Employee / Agent

  // Track B: External Clients & Partners
  external_company: 35, // Category 6: External Company / Developer / Bank
  external_agent: 32, // Category 5: External RERA Broker
  landlord: 30, // Category 1: Landlord
  property_owner: 25,
  seller: 20, // Category 4: Seller
  tenant: 10, // Category 2: Tenant
  buyer: 10, // Category 3: Buyer
  viewer: 10,
  user: 5,
};

// ─── Role rank (1 = general user, 2 = staff/CRM, 3 = customer/portal) ────────
export const ROLE_RANK: Record<string, number> = {
  user: 1,
  owner: 2,
  managing_director: 2,
  director: 2,
  manager: 2,
  supervisor: 2,
  team_leader: 2,
  employee: 2,
  admin: 2,
  hr_staff: 2,
  accounts_staff: 2,
  agent: 2,
  leasing_agent: 2,
  sales_agent: 2,
  'leasing-agent': 2,
  'secondary-sales-agent': 2,
  finance: 2,
  viewer: 2,
  landlord: 3,
  tenant: 3,
  buyer: 3,
  seller: 3,
  external_agent: 3,
  external_company: 3,
  property_owner: 3,
};

// ─── getRoleRank ─────────────────────────────────────────────────────────────
export function getRoleRank(role: string): number {
  const resolved = resolveBackendRole(role);
  // eslint-disable-next-line security/detect-object-injection
  return ROLE_RANK[resolved] ?? 1;
}
