/**
 * inboundOutboundRatioGuard.ts — Pause if outbound/inbound ratio exceeds
 * 4:1 in a rolling 30-minute window.
 *
 * A highly asymmetric message ratio is a strong spam signal. This guard
 * tracks both directions and blocks outbound sends when the ratio is unsafe.
 */

const DEFAULT_WINDOW_MS = 30 * 60_000; // 30 minutes
const DEFAULT_MAX_RATIO = 4;

interface TimestampedEvent {
  timestamp: number;
}

export interface RatioStatus {
  inbound: number;
  outbound: number;
  ratio: number;
  blocked: boolean;
  reason: string;
}

export class InboundOutboundRatioGuard {
  private readonly windowMs: number;
  private readonly maxRatio: number;
  private readonly inboundLog: TimestampedEvent[] = [];
  private readonly outboundLog: TimestampedEvent[] = [];

  constructor(windowMs?: number, maxRatio?: number) {
    this.windowMs = windowMs ?? DEFAULT_WINDOW_MS;
    this.maxRatio = maxRatio ?? DEFAULT_MAX_RATIO;
  }

  /** Record an inbound (received) message. */
  recordInbound(): void {
    this.inboundLog.push({ timestamp: Date.now() });
    this.prune();
  }

  /** Record an outbound (sent) message. */
  recordOutbound(): void {
    this.outboundLog.push({ timestamp: Date.now() });
    this.prune();
  }

  /** Check whether outbound sending is currently allowed. */
  canSend(): boolean {
    this.prune();
    const status = this.getStatus();
    return !status.blocked;
  }

  /** Get the current ratio status with details. */
  getStatus(): RatioStatus {
    this.prune();
    const inbound = this.inboundLog.length;
    const outbound = this.outboundLog.length;

    // Avoid division by zero — if no inbound, any outbound > 0 counts as ∞
    const ratio = inbound === 0
      ? (outbound > 0 ? Infinity : 0)
      : outbound / inbound;

    const blocked = ratio > this.maxRatio;

    return {
      inbound,
      outbound,
      ratio: Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : ratio,
      blocked,
      reason: blocked
        ? `Outbound/inbound ratio ${ratio.toFixed(1)}:1 exceeds ${this.maxRatio}:1 limit`
        : 'Ratio within safe limits',
    };
  }

  /** Reset all counters. */
  reset(): void {
    this.inboundLog.length = 0;
    this.outboundLog.length = 0;
  }

  /** Remove events outside the rolling window. */
  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.pruneArray(this.inboundLog, cutoff);
    this.pruneArray(this.outboundLog, cutoff);
  }

  private pruneArray(arr: TimestampedEvent[], cutoff: number): void {
    let i = 0;
    while (i < arr.length && arr[i].timestamp < cutoff) i++;
    if (i > 0) arr.splice(0, i);
  }
}
