import type { NextFunction, Request, Response } from 'express';

export type ActivePortal = 'md' | 'employee' | 'landlord' | 'tenant' | 'buyer' | 'seller';

const VALID_PORTALS = new Set<ActivePortal>([
  'md',
  'employee',
  'landlord',
  'tenant',
  'buyer',
  'seller',
]);

/**
 * Attaches `req.activePortal` from `X-Active-Portal` header so portal-scoped
 * endpoints (`/api/md/*`, `/api/employee/*`, `/api/landlord/*`, `/api/tenant/*`,
 * `/api/buyer/*`, `/api/seller/*`) can filter queries by the active profile ID.
 */
export function attachActivePortalContext(req: Request, res: Response, next: NextFunction): void {
  const headerPortal = String(req.headers['x-active-portal'] || '').toLowerCase() as ActivePortal;
  if (headerPortal && !VALID_PORTALS.has(headerPortal)) {
    res.status(400).json({ success: false, message: 'Invalid X-Active-Portal header' });
    return;
  }
  (req as Request & { activePortal?: ActivePortal }).activePortal = headerPortal || undefined;
  next();
}
