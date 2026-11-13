/**
 * sessionWarmupLifecycle.ts — Gradual volume ramp for new WhatsApp numbers.
 *
 * New SIMs are warmed up over ~4 days:
 *   Day 1: max 10 messages
 *   Day 2: max 25 messages
 *   Day 3: max 50 messages
 *   Day 4+: max 150 messages
 *
 * This prevents sudden high-volume sending that triggers WhatsApp anti-spam.
 */

export interface WarmupStage {
  day: number;
  maxMessages: number;
}

interface WarmupState {
  clientId: string;
  registeredAt: Date;
  messagesSentToday: number;
  lastResetDate: string;  // YYYY-MM-DD
}

const DEFAULT_STAGES: readonly WarmupStage[] = [
  { day: 1, maxMessages: 10 },
  { day: 2, maxMessages: 25 },
  { day: 3, maxMessages: 50 },
  { day: 4, maxMessages: 150 },
] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(date: Date): number {
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / 86_400_000) + 1; // day 1 = registration day
}

export class SessionWarmupLifecycle {
  private readonly stages: readonly WarmupStage[];
  private readonly sessions: Map<string, WarmupState> = new Map();

  constructor(stages?: WarmupStage[]) {
    this.stages = stages ?? DEFAULT_STAGES;
  }

  /** Register a new session for warmup tracking. */
  register(clientId: string, registeredAt?: Date): void {
    this.sessions.set(clientId, {
      clientId,
      registeredAt: registeredAt ?? new Date(),
      messagesSentToday: 0,
      lastResetDate: todayISO(),
    });
  }

  /** Get the maximum messages allowed today for this session. */
  getDailyLimit(clientId: string): number {
    const state = this.sessions.get(clientId);
    if (!state) return 0;

    const day = daysSince(state.registeredAt);
    // Find the highest stage whose day threshold we have passed
    let limit = this.stages[this.stages.length - 1].maxMessages;
    for (const stage of this.stages) {
      if (day <= stage.day) {
        limit = stage.maxMessages;
        break;
      }
    }
    return limit;
  }

  /**
   * Check whether the session can send another message right now.
   * Auto-resets the daily counter at midnight.
   */
  canSend(clientId: string): boolean {
    const state = this.sessions.get(clientId);
    if (!state) return false;

    this.maybeResetDaily(state);
    return state.messagesSentToday < this.getDailyLimit(clientId);
  }

  /** Record that a message was sent (call after successful send). */
  recordSend(clientId: string): void {
    const state = this.sessions.get(clientId);
    if (!state) return;

    this.maybeResetDaily(state);
    state.messagesSentToday += 1;
  }

  /** Get remaining quota for today. */
  remainingQuota(clientId: string): number {
    const state = this.sessions.get(clientId);
    if (!state) return 0;

    this.maybeResetDaily(state);
    return Math.max(0, this.getDailyLimit(clientId) - state.messagesSentToday);
  }

  /** Get the current warmup day (1-based) for a session. */
  getCurrentDay(clientId: string): number {
    const state = this.sessions.get(clientId);
    if (!state) return 0;
    return daysSince(state.registeredAt);
  }

  /** Whether the session has completed its warmup period. */
  isWarmedUp(clientId: string): boolean {
    const lastStage = this.stages[this.stages.length - 1];
    return this.getCurrentDay(clientId) >= lastStage.day;
  }

  /** Unregister a session. */
  unregister(clientId: string): void {
    this.sessions.delete(clientId);
  }

  private maybeResetDaily(state: WarmupState): void {
    const today = todayISO();
    if (state.lastResetDate !== today) {
      state.messagesSentToday = 0;
      state.lastResetDate = today;
    }
  }
}
