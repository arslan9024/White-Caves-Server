/**
 * headlessToggleManager.ts — Runtime toggle between headless and visible
 * Chromium modes for WhatsApp sessions.
 *
 * Allows ops to temporarily make a session visible for debugging QR issues
 * or account verification, then flip it back to headless for production.
 */

export interface ToggleState {
  clientId: string;
  headless: boolean;
  toggledAt: Date;
  reason: string;
}

/**
 * Manages per-session headless/visible state.
 *
 * Note: Changing the mode requires a session restart — this manager tracks
 * the *desired* state and signals when a restart is needed.
 */
export class HeadlessToggleManager {
  private readonly states: Map<string, ToggleState> = new Map();

  /**
   * Register a session with its initial headless preference.
   */
  register(clientId: string, headless: boolean): void {
    this.states.set(clientId, {
      clientId,
      headless,
      toggledAt: new Date(),
      reason: 'initial',
    });
  }

  /**
   * Toggle the headless state for a session.
   * @returns `true` if the state actually changed (restart needed).
   */
  toggle(clientId: string, reason: string = 'manual toggle'): boolean {
    const current = this.states.get(clientId);
    if (!current) {
      throw new Error(`Session "${clientId}" is not registered.`);
    }

    const previous = current.headless;
    current.headless = !current.headless;
    current.toggledAt = new Date();
    current.reason = reason;

    return previous !== current.headless;
  }

  /**
   * Explicitly set headless mode.
   * @returns `true` if the state actually changed (restart needed).
   */
  setHeadless(clientId: string, headless: boolean, reason: string = 'explicit set'): boolean {
    const current = this.states.get(clientId);
    if (!current) {
      throw new Error(`Session "${clientId}" is not registered.`);
    }

    const changed = current.headless !== headless;
    current.headless = headless;
    current.toggledAt = new Date();
    current.reason = reason;
    return changed;
  }

  /**
   * Get the current desired headless state for a session.
   */
  isHeadless(clientId: string): boolean {
    const state = this.states.get(clientId);
    if (!state) {
      throw new Error(`Session "${clientId}" is not registered.`);
    }
    return state.headless;
  }

  /** Get the full toggle state for a session. */
  getState(clientId: string): ToggleState | undefined {
    return this.states.get(clientId);
  }

  /** Snapshot of all managed sessions. */
  getAllStates(): ToggleState[] {
    return [...this.states.values()];
  }

  /** Unregister a session. */
  unregister(clientId: string): void {
    this.states.delete(clientId);
  }
}
