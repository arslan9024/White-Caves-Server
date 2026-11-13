/**
 * antiVelocityBurstBrake.ts — Hard cap 12 messages per rolling 60 s window.
 *
 * Prevents burst-sending patterns that trigger WhatsApp's rate limiter.
 * Messages are tracked in a sliding window and sends are blocked when the
 * cap is reached.
 */

const DEFAULT_MAX_MESSAGES = 12;
const DEFAULT_WINDOW_MS = 60_000;

export interface BrakeStatus {
  sent: number;
  limit: number;
  remaining: number;
  blocked: boolean;
  retryAfterMs: number;
}

export class AntiVelocityBurstBrake {
  private readonly maxMessages: number;
  private readonly windowMs: number;
  private readonly timestamps: number[] = [];

  constructor(maxMessages?: number, windowMs?: number) {
    this.maxMessages = maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.windowMs = windowMs ?? DEFAULT_WINDOW_MS;
  }

  /** Record that a message was sent. Call AFTER successful send. */
  recordSend(): void {
    this.timestamps.push(Date.now());
    this.prune();
  }

  /** Check whether sending another message is allowed right now. */
  canSend(): boolean {
    this.prune();
    return this.timestamps.length < this.maxMessages;
  }

  /** Get detailed brake status. */
  getStatus(): BrakeStatus {
    this.prune();
    const sent = this.timestamps.length;
    const remaining = Math.max(0, this.maxMessages - sent);
    const blocked = sent >= this.maxMessages;

    let retryAfterMs = 0;
    if (blocked && this.timestamps.length > 0) {
      const oldest = this.timestamps[0];
      retryAfterMs = Math.max(0, oldest + this.windowMs - Date.now());
    }

    return {
      sent,
      limit: this.maxMessages,
      remaining,
      blocked,
      retryAfterMs,
    };
  }

  /**
   * Wait until a send slot opens, then resolve.
   * If already under the limit, resolves immediately.
   */
  async waitForSlot(): Promise<void> {
    const status = this.getStatus();
    if (!status.blocked) return;

    if (status.retryAfterMs > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, status.retryAfterMs + 50),
      );
    }

    // Re-check after waiting (recursive but bounded)
    if (!this.canSend()) {
      await this.waitForSlot();
    }
  }

  /** Reset all tracking data. */
  reset(): void {
    this.timestamps.length = 0;
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    let i = 0;
    while (i < this.timestamps.length && this.timestamps[i] < cutoff) i++;
    if (i > 0) this.timestamps.splice(0, i);
  }
}
