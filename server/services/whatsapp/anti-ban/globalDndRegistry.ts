/**
 * globalDndRegistry.ts — Cross-department Do-Not-Disturb blocked number
 * registry.
 *
 * A centralized in-memory registry of phone numbers that should never be
 * contacted by any department. Supports permanent blocks, temporary blocks,
 * and reason tracking for compliance audits.
 */

export interface DndEntry {
  phoneNumber: string;
  reason: string;
  blockedBy: string;         // department or agent ID
  blockedAt: Date;
  expiresAt: Date | null;    // null = permanent
}

export interface DndCheckResult {
  blocked: boolean;
  entry: DndEntry | null;
}

export class GlobalDndRegistry {
  private readonly entries: Map<string, DndEntry> = new Map();

  /** Normalize phone number to digits only. */
  private normalize(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Block a phone number.
   *
   * @param phoneNumber  The number to block (any format).
   * @param reason       Reason for blocking (for audit trail).
   * @param blockedBy    Department or agent that initiated the block.
   * @param ttlMs        Optional TTL in ms for temporary blocks.
   */
  block(
    phoneNumber: string,
    reason: string,
    blockedBy: string,
    ttlMs?: number,
  ): void {
    const normalized = this.normalize(phoneNumber);
    this.entries.set(normalized, {
      phoneNumber: normalized,
      reason,
      blockedBy,
      blockedAt: new Date(),
      expiresAt: ttlMs ? new Date(Date.now() + ttlMs) : null,
    });
  }

  /** Unblock a phone number. */
  unblock(phoneNumber: string): boolean {
    return this.entries.delete(this.normalize(phoneNumber));
  }

  /**
   * Check if a phone number is blocked.
   * Automatically removes expired temporary blocks.
   */
  check(phoneNumber: string): DndCheckResult {
    const normalized = this.normalize(phoneNumber);
    const entry = this.entries.get(normalized);

    if (!entry) {
      return { blocked: false, entry: null };
    }

    // Check expiry for temporary blocks
    if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
      this.entries.delete(normalized);
      return { blocked: false, entry: null };
    }

    return { blocked: true, entry };
  }

  /** Whether a number is currently blocked (convenience). */
  isBlocked(phoneNumber: string): boolean {
    return this.check(phoneNumber).blocked;
  }

  /**
   * Bulk-check multiple numbers.
   * Returns only the blocked ones.
   */
  filterBlocked(phoneNumbers: string[]): string[] {
    return phoneNumbers.filter((p) => this.isBlocked(p));
  }

  /**
   * Import a list of numbers as permanent blocks.
   */
  bulkBlock(
    phoneNumbers: string[],
    reason: string,
    blockedBy: string,
  ): number {
    let count = 0;
    for (const phone of phoneNumbers) {
      this.block(phone, reason, blockedBy);
      count++;
    }
    return count;
  }

  /** Get all active DND entries. Prunes expired entries. */
  getAll(): DndEntry[] {
    const now = Date.now();
    const result: DndEntry[] = [];

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt && entry.expiresAt.getTime() < now) {
        this.entries.delete(key);
      } else {
        result.push(entry);
      }
    }

    return result;
  }

  /** Number of active entries. */
  get size(): number {
    return this.getAll().length;
  }

  /** Clear the entire registry. */
  clear(): void {
    this.entries.clear();
  }
}
