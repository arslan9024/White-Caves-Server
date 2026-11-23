/**
 * RBAC Role Permissions Map & Permission Helpers
 * ───────────────────────────────────────────────
 * Aggregated permission matrix mapping canonical roles to permitted actions.
 * Single-purpose module conforming to AEGIS V5.1 rule AEG-042 (<= 300 lines).
 */

import { resolveBackendRole } from './rbacRoles.js';
import { CLIENT_ROLE_PERMISSIONS } from './rbacClientPermissions.js';
import { STAFF_ROLE_PERMISSIONS } from './rbacStaffPermissions.js';

// ─── Unified Permission map ──────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ...CLIENT_ROLE_PERMISSIONS,
  ...STAFF_ROLE_PERMISSIONS,
};

// ─── Helper: check permission for a role ─────────────────────────────────────
export function roleHasPermission(role: string, permission: string): boolean {
  const resolved = resolveBackendRole(role);
  // eslint-disable-next-line security/detect-object-injection
  const perms = ROLE_PERMISSIONS[resolved];
  if (!perms) return false;
  return perms.includes(permission);
}

export { CLIENT_ROLE_PERMISSIONS, STAFF_ROLE_PERMISSIONS };
