/**
 * Sliding-window rate limiter with tier allowances (Point 17).
 */
export class TieredRateLimiter {
  private hits = new Map<string, number[]>();
  private readonly maxKeys = 10_000;

  allow(key: string, limit: number, windowMs = 60_000, nowMs = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
    if (recent.length === 0 && this.hits.size >= this.maxKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey !== undefined) this.hits.delete(oldestKey);
    }
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(nowMs);
    this.hits.set(key, recent);
    return true;
  }
}

export function createLimiter(limit: number, windowMs = 60_000) {
  const limiter = new TieredRateLimiter();
  return (req: any, res: any, next: any): void => {
    const key = req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
    if (!limiter.allow(String(key), limit, windowMs)) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}

export const strictLimiter = createLimiter(30, 60_000);
export const apiLimiter = createLimiter(120, 60_000);
export const authLimiter = createLimiter(15, 60_000);
export const firebaseSyncLimiter = createLimiter(30, 60_000);
export const registerLimiter = createLimiter(10, 60_000);
export const passwordLimiter = createLimiter(10, 60_000);
export const contactLimiter = createLimiter(20, 60_000);

export default {
  TieredRateLimiter,
  createLimiter,
  strictLimiter,
  apiLimiter,
  authLimiter,
  firebaseSyncLimiter,
  registerLimiter,
  passwordLimiter,
  contactLimiter,
};
