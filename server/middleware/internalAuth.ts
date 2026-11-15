import type { Request, Response, NextFunction } from 'express';

/**
 * Mutual internal-service authentication guard (Point 32).
 * Protects microservice-to-microservice endpoints using `x-white-caves-internal`.
 */
export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.WHITE_CAVES_INTERNAL_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'Internal service token not configured' });
    return;
  }

  const provided = req.header('x-white-caves-internal');
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized internal service call' });
    return;
  }

  next();
}
