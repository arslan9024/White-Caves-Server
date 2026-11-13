/**
 * accountQuarantineIsolation.ts — Freeze account after 2+ user blocks per hour.
 *
 * When multiple recipients block the sending account within a short window,
 * the account is immediately quarantined to prevent a permanent ban.
 */

import { EventEmitter } from 'events';

export interface QuarantineEvent {
  clientId: string;
  blockCount: number;
  quarantinedAt: Date;
  expiresAt: Date;
  reason: string;
}

interface BlockRecord {
  timestamp: number;
  reportedBy: string;
}

const DEFAULT_WINDOW_MS = 3_600_000;      // 1 hour
const DEFAULT_BLOCK_THRESHOLD = 2;
const DEFAULT_QUARANTINE_MS = 24 * 3_600_000; // 24 hours

export interface QuarantineOptions {
  windowMs?: number;
  blockThreshold?: number;
  quarantineDurationMs?: number;
}

export class AccountQuarantineIsolation extends EventEmitter {
  private readonly windowMs: number;
  private readonly blockThreshold: number;
  private readonly quarantineDurationMs: number;

  private readonly blockLogs: Map<string, BlockRecord[]> = new Map();
  private readonly quarantined: Map<string, QuarantineEvent> = new Map();

  constructor(opts?: QuarantineOptions) {
    super();
    this.windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
    this.blockThreshold = opts?.blockThreshold ?? DEFAULT_BLOCK_THRESHOLD;
    this.quarantineDurationMs = opts?.quarantineDurationMs ?? DEFAULT_QUARANTINE_MS;
  }

  /**
   * Report that a recipient has blocked the sending account.
   *
   * If the block threshold is reached, the account is automatically quarantined.
   *
   * @param clientId    The WhatsApp session / account ID.
   * @param reportedBy  The phone number or contact that blocked.
   * @returns `true` if the account was quarantined as a result.
   */
  reportBlock(clientId: string, reportedBy: string): boolean {
    // Don't double-count during quarantine
    if (this.isQuarantined(clientId)) return false;

    let logs = this.blockLogs.get(clientId);
    if (!logs) {
      logs = [];
      this.blockLogs.set(clientId, logs);
    }

    logs.push({ timestamp: Date.now(), reportedBy });
    this.pruneBlocks(clientId);

    const recentBlocks = this.getRecentBlockCount(clientId);

    if (recentBlocks >= this.blockThreshold) {
      this.quarantine(clientId, recentBlocks);
      return true;
    }

    return false;
  }

  /** Check if an account is currently quarantined. */
  isQuarantined(clientId: string): boolean {
    const event = this.quarantined.get(clientId);
    if (!event) return false;

    // Auto-release expired quarantines
    if (event.expiresAt.getTime() < Date.now()) {
      this.quarantined.delete(clientId);
      this.emit('released', { clientId, releasedAt: new Date() });
      return false;
    }

    return true;
  }

  /** Manually release an account from quarantine. */
  release(clientId: string): boolean {
    const existed = this.quarantined.delete(clientId);
    if (existed) {
      this.blockLogs.delete(clientId);
      this.emit('released', { clientId, releasedAt: new Date() });
    }
    return existed;
  }

  /** Get quarantine details for an account. */
  getQuarantineInfo(clientId: string): QuarantineEvent | null {
    if (!this.isQuarantined(clientId)) return null;
    return this.quarantined.get(clientId) ?? null;
  }

  /** Get all currently quarantined accounts. */
  getQuarantinedAccounts(): QuarantineEvent[] {
    // Prune expired first
    for (const [id] of this.quarantined) {
      this.isQuarantined(id); // side-effect: prunes expired
    }
    return [...this.quarantined.values()];
  }

  /** Get the number of recent blocks for an account. */
  getRecentBlockCount(clientId: string): number {
    this.pruneBlocks(clientId);
    return this.blockLogs.get(clientId)?.length ?? 0;
  }

  // ── internals ──

  private quarantine(clientId: string, blockCount: number): void {
    const event: QuarantineEvent = {
      clientId,
      blockCount,
      quarantinedAt: new Date(),
      expiresAt: new Date(Date.now() + this.quarantineDurationMs),
      reason: `${blockCount} blocks in ${Math.round(this.windowMs / 60_000)} min window`,
    };

    this.quarantined.set(clientId, event);
    this.emit('quarantined', event);
  }

  private pruneBlocks(clientId: string): void {
    const logs = this.blockLogs.get(clientId);
    if (!logs) return;

    const cutoff = Date.now() - this.windowMs;
    let i = 0;
    while (i < logs.length && logs[i].timestamp < cutoff) i++;
    if (i > 0) logs.splice(0, i);
  }
}
