/**
 * multiAccountHealthLedger.ts — Per-account uptime score 0–100%.
 *
 * Tracks successful heartbeats vs failures over a rolling window and
 * computes a health score for each WhatsApp account (SIM / session).
 */

export interface AccountHealth {
  clientId: string;
  score: number;           // 0–100
  totalChecks: number;
  successfulChecks: number;
  lastCheckAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
}

interface CheckEntry {
  timestamp: number;
  success: boolean;
  reason?: string;
}

const DEFAULT_WINDOW_MS = 3_600_000; // 1 hour rolling window
const MAX_ENTRIES_PER_ACCOUNT = 500;

export class MultiAccountHealthLedger {
  private readonly windowMs: number;
  private readonly ledger: Map<string, CheckEntry[]> = new Map();

  constructor(windowMs?: number) {
    this.windowMs = windowMs ?? DEFAULT_WINDOW_MS;
  }

  /** Register a successful health check. */
  recordSuccess(clientId: string): void {
    this.addEntry(clientId, { timestamp: Date.now(), success: true });
  }

  /** Register a failed health check with an optional reason. */
  recordFailure(clientId: string, reason?: string): void {
    this.addEntry(clientId, { timestamp: Date.now(), success: false, reason });
  }

  /**
   * Compute the health score for a given account.
   * Returns a value between 0 (all failures) and 100 (all successes).
   */
  getScore(clientId: string): number {
    const entries = this.getRecentEntries(clientId);
    if (entries.length === 0) return 0;

    const successes = entries.filter((e) => e.success).length;
    return Math.round((successes / entries.length) * 100);
  }

  /** Get a full health report for a single account. */
  getHealth(clientId: string): AccountHealth {
    const entries = this.getRecentEntries(clientId);
    const successes = entries.filter((e) => e.success).length;
    const failures = entries.filter((e) => !e.success);
    const lastFailure = failures.length > 0 ? failures[failures.length - 1] : null;

    return {
      clientId,
      score: entries.length > 0 ? Math.round((successes / entries.length) * 100) : 0,
      totalChecks: entries.length,
      successfulChecks: successes,
      lastCheckAt: entries.length > 0 ? new Date(entries[entries.length - 1].timestamp) : null,
      lastFailureAt: lastFailure ? new Date(lastFailure.timestamp) : null,
      lastFailureReason: lastFailure?.reason ?? null,
    };
  }

  /** Get health reports for all tracked accounts. */
  getAllHealth(): AccountHealth[] {
    const accounts = [...this.ledger.keys()];
    return accounts.map((id) => this.getHealth(id));
  }

  /** Remove an account from the ledger. */
  removeAccount(clientId: string): void {
    this.ledger.delete(clientId);
  }

  /** List all tracked account IDs. */
  getTrackedAccounts(): string[] {
    return [...this.ledger.keys()];
  }

  // ── internals ──

  private addEntry(clientId: string, entry: CheckEntry): void {
    let entries = this.ledger.get(clientId);
    if (!entries) {
      entries = [];
      this.ledger.set(clientId, entries);
    }
    entries.push(entry);

    // Trim to keep memory bounded
    if (entries.length > MAX_ENTRIES_PER_ACCOUNT) {
      entries.splice(0, entries.length - MAX_ENTRIES_PER_ACCOUNT);
    }
  }

  private getRecentEntries(clientId: string): CheckEntry[] {
    const entries = this.ledger.get(clientId);
    if (!entries) return [];

    const cutoff = Date.now() - this.windowMs;
    return entries.filter((e) => e.timestamp >= cutoff);
  }
}
