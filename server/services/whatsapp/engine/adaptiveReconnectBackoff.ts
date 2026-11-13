/**
 * adaptiveReconnectBackoff.ts — Jittered exponential backoff (5 s → 300 s max).
 *
 * Used by WhatsApp session reconnect logic to avoid thundering-herd on the
 * WhatsApp Web servers after a network blip or server-side disconnect.
 */

const DEFAULT_BASE_MS = 5_000;
const DEFAULT_MAX_MS = 300_000;
const DEFAULT_MULTIPLIER = 2;
const JITTER_RANGE = 0.25; // ±25 % of computed delay

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  multiplier?: number;
}

/**
 * Adaptive exponential backoff with random jitter.
 *
 * Usage:
 * ```ts
 * const backoff = new AdaptiveBackoff();
 * while (!connected) {
 *   await sleep(backoff.nextDelay());
 *   connected = await tryConnect();
 * }
 * backoff.reset();
 * ```
 */
export class AdaptiveBackoff {
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly multiplier: number;
  private attempt = 0;

  constructor(opts?: BackoffOptions) {
    this.baseMs = opts?.baseMs ?? DEFAULT_BASE_MS;
    this.maxMs = opts?.maxMs ?? DEFAULT_MAX_MS;
    this.multiplier = opts?.multiplier ?? DEFAULT_MULTIPLIER;
  }

  /**
   * Return the next delay in milliseconds, advancing the internal counter.
   * The value is exponentially increasing with random jitter capped at `maxMs`.
   */
  nextDelay(): number {
    const exponential = this.baseMs * Math.pow(this.multiplier, this.attempt);
    const capped = Math.min(exponential, this.maxMs);

    // Apply ±25 % jitter
    const jitter = capped * JITTER_RANGE * (2 * Math.random() - 1);
    const delay = Math.max(0, Math.round(capped + jitter));

    this.attempt += 1;
    return delay;
  }

  /** Reset the backoff counter (call after a successful connection). */
  reset(): void {
    this.attempt = 0;
  }

  /** Current attempt index (0-based). */
  get currentAttempt(): number {
    return this.attempt;
  }
}
