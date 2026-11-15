import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Attaches or propagates x-correlation-id on every inbound request (Point 26).
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-correlation-id')?.trim();
  const correlationId = incoming || randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  (req as Request & { correlationId?: string }).correlationId = correlationId;
  next();
}
