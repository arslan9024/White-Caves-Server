/**
 * RBAC Express Middleware Handlers
 * ─────────────────────────────────
 * Composable Express middleware for role checks, permission checks,
 * rank checks, hierarchy level checks, and row-level ownership filtering.
 * Single-purpose module conforming to AEGIS V5.1 rule AEG-042 (<= 300 lines).
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import { resolveBackendRole, ROLE_HIERARCHY, getRoleRank } from './rbacRoles.js';
import { roleHasPermission } from './rbacPermissions.js';

// ─── requireRole(...roles) ───────────────────────────────────────────────────
/**
 * Express middleware factory. Rejects requests whose `req.user.role`
 * is NOT in the given allow-list.
 *
 * @example
 *   router.delete('/api/leads/:id', requireRole('owner', 'manager', 'admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map(r => resolveBackendRole(r));
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }
    const resolved = resolveBackendRole(userRole);
    if (!normalizedAllowed.includes(resolved)) {
      return next(new AppError(`Access denied — requires role: ${allowedRoles.join(' | ')}`, 403));
    }
    next();
  };
}

// ─── requirePermission(...permissions) ───────────────────────────────────────
/**
 * Express middleware factory. Rejects requests whose user role
 * does NOT have ANY of the specified permissions.
 *
 * @example
 *   router.get('/api/leads', requirePermission('view_leads'), handler);
 *   router.post('/api/leads', requirePermission('manage_leads'), handler);
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }
    const resolved = resolveBackendRole(userRole);
    const hasAny = requiredPermissions.some(p => roleHasPermission(resolved, p));
    if (!hasAny) {
      return next(
        new AppError(`Access denied — requires permission: ${requiredPermissions.join(' | ')}`, 403)
      );
    }
    next();
  };
}

// ─── requireAllPermissions(...permissions) ───────────────────────────────────
/**
 * Stricter version: require ALL listed permissions (not just one).
 *
 * @example
 *   router.delete('/api/properties/:id', requireAllPermissions('delete_property', 'view_properties'), handler);
 */
export function requireAllPermissions(...requiredPermissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }
    const resolved = resolveBackendRole(userRole);
    const hasAll = requiredPermissions.every(p => roleHasPermission(resolved, p));
    if (!hasAll) {
      return next(
        new AppError(
          `Access denied — requires all permissions: ${requiredPermissions.join(', ')}`,
          403
        )
      );
    }
    next();
  };
}

// ─── requireMinRole(minRole) ─────────────────────────────────────────────────
/**
 * Allow any role at or above the given hierarchy level.
 *
 * @example
 *   router.get('/api/dashboard/analytics', requireMinRole('agent'), handler);
 *   // agent(50), finance(70), admin(80), manager(90), owner(100) all pass
 */
export function requireMinRole(minRole: string) {
  const resolvedMinRole = resolveBackendRole(minRole);
  // eslint-disable-next-line security/detect-object-injection
  const minLevel = ROLE_HIERARCHY[resolvedMinRole] ?? ROLE_HIERARCHY[minRole] ?? 0;
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }
    const resolved = resolveBackendRole(userRole);
    // eslint-disable-next-line security/detect-object-injection
    const userLevel = ROLE_HIERARCHY[resolved] || 0;
    if (userLevel < minLevel) {
      return next(new AppError(`Access denied — minimum role required: ${minRole}`, 403));
    }
    next();
  };
}

// ─── requireMinRank(minRank) ─────────────────────────────────────────────────
/**
 * Allow users whose rank tier is >= minRank.
 * Rank 1 = general users, Rank 2 = staff/CRM, Rank 3 = customers/portal
 *
 * @example
 *   router.get('/crm/dashboard', requireMinRank(2), handler); // staff only
 */
export function requireMinRank(minRank: number) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) return next(new AppError('Authentication required', 401));
    const rank = getRoleRank(userRole);
    if (rank < minRank)
      return next(new AppError(`Access denied — minimum rank ${minRank} required`, 403));
    next();
  };
}

// ─── scopeToOwn() ────────────────────────────────────────────────────────────
/**
 * Middleware that attaches an ownership filter to `req.ownershipFilter`.
 * High-privilege users (owner/manager/admin) see all data.
 * Lower roles get `{ userId: req.user.id }` filter applied.
 *
 * Route handlers use it like:
 *   const where = { ...req.ownershipFilter, ...otherFilters };
 *   const leads = await prisma.lead.findMany({ where });
 *
 * @example
 *   router.get('/api/leads', scopeToOwn(), handler);
 */
export function scopeToOwn(ownerField = 'userId') {
  const SUPERVISOR_ROLES = ['owner', 'manager', 'admin'];
  // Sanitize field identifier to prevent prototype pollution or invalid key injection
  const safeField = /^[a-zA-Z0-9_]+$/.test(ownerField) ? ownerField : 'userId';
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!userRole || !userId) {
      return next(new AppError('Authentication required', 401));
    }

    const resolved = resolveBackendRole(userRole);
    const isSupervisor = SUPERVISOR_ROLES.includes(resolved) || ((req.user?.accessLevel ?? 0) >= 5);

    // Supervisors see everything
    if (isSupervisor) {
      req.ownershipFilter = {};
    } else {
      // Agents/others see only their own data
      req.ownershipFilter = { [safeField]: userId };
    }
    next();
  };
}
