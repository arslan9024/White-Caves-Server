import type { Request, Response, NextFunction } from 'express';

const seenKeys = new Map<string, { status: number; body: unknown; expiresAt: number }>();

/**
 * In-memory idempotency guard for DLD/Ejari mutations (AEG-012 / Point 20).
 * Prevents duplicate registrations when clients retry with the same `Idempotency-Key` header.
 */
export function requireIdempotencyKey(ttlMs = 5 * 60_000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.header('Idempotency-Key')?.trim();
    if (!key) {
      res.status(400).json({ error: 'Missing required Idempotency-Key header' });
      return;
    }

    const now = Date.now();
    const cached = seenKeys.get(key);
    if (cached && cached.expiresAt > now) {
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      seenKeys.set(key, { status: res.statusCode || 200, body, expiresAt: Date.now() + ttlMs });
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
