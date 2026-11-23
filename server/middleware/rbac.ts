/**
 * RBAC (Role-Based Access Control) Middleware
 * ────────────────────────────────────────────
 * Unified, backwards-compatible entry point re-exporting RBAC role definitions,
 * permissions matrix, and express middleware handlers.
 * Decomposed to satisfy AEGIS V5.1 rule AEG-042 (<= 300 lines).
 *
 * Provides composable middleware functions:
 *   requireRole('owner', 'manager')        – allow only listed roles
 *   requirePermission('manage_leads')       – allow roles with the permission
 *   requireAllPermissions('p1', 'p2')      – require all listed permissions
 *   requireMinRole('agent')                 – allow roles at or above hierarchy level
 *   requireMinRank(2)                       – allow roles at or above rank tier (1/2/3)
 *   scopeToOwn()                            – attach ownership filter for row-level security
 *
 * Usage:
 *   router.get('/api/leads', requirePermission('view_leads'), handler);
 *   router.delete('/api/leads/:id', requireRole('owner', 'manager'), handler);
 */

// ─── Re-export Role Mappings & Hierarchy ─────────────────────────────────────
export {
  ROLE_ALIAS_MAP,
  ROLE_HIERARCHY,
  ROLE_RANK,
  resolveBackendRole,
  getRoleRank,
} from './rbacRoles.js';

// ─── Re-export Permissions Matrix & Verification ─────────────────────────────
export {
  ROLE_PERMISSIONS,
  roleHasPermission,
} from './rbacPermissions.js';

// ─── Re-export Express Middleware Handlers ───────────────────────────────────
export {
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireMinRole,
  requireMinRank,
  scopeToOwn,
} from './rbacHandlers.js';
