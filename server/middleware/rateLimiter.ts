/**
 * Sliding-window rate limiter with tier allowances (Point 17).
 */
export class TieredRateLimiter {
  private hits = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs = 60_000, nowMs = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(nowMs);
    this.hits.set(key, recent);
    return true;
  }
}

const strictTierLimiter = new TieredRateLimiter();

export function strictLimiter(req: any, res: any, next: any): void {
  const key = req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
  if (!strictTierLimiter.allow(String(key), 30, 60_000)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  next();
}
