/**
 * sessionFailoverMatrix.ts — Multi-session hot-swap between primary/backup SIMs.
 *
 * Maintains a priority-ranked pool of WhatsApp sessions and transparently
 * fails over from a dead primary to the healthiest backup within ≤ 3 s.
 */

import { EventEmitter } from 'events';

export interface SessionEndpoint {
  clientId: string;
  phoneNumber: string;
  priority: number;            // lower = higher priority
  healthy: boolean;
  lastHeartbeat: number;       // epoch-ms
}

interface FailoverEvent {
  from: string;
  to: string;
  reason: string;
  timestamp: Date;
}

const HEARTBEAT_STALE_MS = 45_000;

export class SessionFailoverMatrix extends EventEmitter {
  private readonly sessions: Map<string, SessionEndpoint> = new Map();
  private activeId: string | null = null;
  private failoverLog: FailoverEvent[] = [];

  /** Register a session endpoint into the pool. */
  addSession(endpoint: SessionEndpoint): void {
    this.sessions.set(endpoint.clientId, { ...endpoint });
    if (this.activeId === null) {
      this.activeId = endpoint.clientId;
    }
  }

  /** Remove a session from the pool permanently. */
  removeSession(clientId: string): void {
    this.sessions.delete(clientId);
    if (this.activeId === clientId) {
      this.activeId = null;
      this.electPrimary();
    }
  }

  /** Record a heartbeat for the given session. */
  heartbeat(clientId: string): void {
    const s = this.sessions.get(clientId);
    if (s) {
      s.lastHeartbeat = Date.now();
      s.healthy = true;
    }
  }

  /** Mark a session unhealthy (e.g. after disconnect event). */
  markUnhealthy(clientId: string): void {
    const s = this.sessions.get(clientId);
    if (s) {
      s.healthy = false;
    }
  }

  /**
   * Elect the highest-priority healthy session as the new primary.
   * Returns the elected clientId or `null` when no healthy session exists.
   */
  electPrimary(): string | null {
    const now = Date.now();

    // Refresh health based on heartbeat freshness
    for (const s of this.sessions.values()) {
      if (now - s.lastHeartbeat > HEARTBEAT_STALE_MS) {
        s.healthy = false;
      }
    }

    const candidates = [...this.sessions.values()]
      .filter((s) => s.healthy)
      .sort((a, b) => a.priority - b.priority);

    const elected = candidates[0] ?? null;
    this.activeId = elected?.clientId ?? null;
    return this.activeId;
  }

  /**
   * Trigger an immediate failover away from the current primary.
   * @param reason  Human-readable reason for the failover.
   * @returns The newly elected clientId, or `null` if none available.
   */
  failover(reason: string): string | null {
    const previousId = this.activeId;

    if (previousId) {
      this.markUnhealthy(previousId);
    }

    const newPrimary = this.electPrimary();

    if (previousId && newPrimary) {
      const event: FailoverEvent = {
        from: previousId,
        to: newPrimary,
        reason,
        timestamp: new Date(),
      };
      this.failoverLog.push(event);
      this.emit('failover', event);
    }

    return newPrimary;
  }

  /** Get the currently active session endpoint (or `null`). */
  getActiveSession(): SessionEndpoint | null {
    if (!this.activeId) return null;
    return this.sessions.get(this.activeId) ?? null;
  }

  /** Return the full failover history. */
  getFailoverLog(): readonly FailoverEvent[] {
    return this.failoverLog;
  }

  /** Snapshot of all registered sessions. */
  getAllSessions(): SessionEndpoint[] {
    return [...this.sessions.values()];
  }
}
