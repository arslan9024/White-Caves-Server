/**
 * dubaiBusinessHoursGuard.ts — Suspend message queues outside Dubai business
 * hours (08:30–21:00 GST / UTC+4).
 *
 * Prevents sending messages during late night / early morning hours when
 * real businesses would not be messaging clients.
 */

const GST_OFFSET_HOURS = 4;
const BUSINESS_START_HOUR = 8;
const BUSINESS_START_MINUTE = 30;
const BUSINESS_END_HOUR = 21;
const BUSINESS_END_MINUTE = 0;

/**
 * Get the current time in Dubai (GST = UTC+4).
 */
function getDubaiTime(now?: Date): { hours: number; minutes: number } {
  const d = now ?? new Date();
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const dubaiMs = utcMs + GST_OFFSET_HOURS * 3_600_000;
  const dubai = new Date(dubaiMs);

  return {
    hours: dubai.getHours(),
    minutes: dubai.getMinutes(),
  };
}

/**
 * Check if the current time falls within Dubai business hours (08:30–21:00 GST).
 *
 * @param now  Optional date for testing; defaults to current time.
 */
export function isDubaiBusinessHours(now?: Date): boolean {
  const { hours, minutes } = getDubaiTime(now);
  const currentMinutes = hours * 60 + minutes;

  const startMinutes = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE; // 510
  const endMinutes = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;      // 1260

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Milliseconds until the next business hours window opens.
 * Returns 0 if currently within business hours.
 */
function msUntilNextWindow(now?: Date): number {
  if (isDubaiBusinessHours(now)) return 0;

  const { hours, minutes } = getDubaiTime(now);
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE;

  let waitMinutes: number;
  if (currentMinutes < startMinutes) {
    waitMinutes = startMinutes - currentMinutes;
  } else {
    waitMinutes = (24 * 60 - currentMinutes) + startMinutes;
  }

  return waitMinutes * 60_000;
}

export interface QueueGuardResult {
  allowed: boolean;
  waitMs: number;
  reason: string;
}

/**
 * Business hours queue guard with auto-resume capability.
 */
export class DubaiBusinessHoursGuard {
  private paused = false;

  /** Check if sending is currently allowed. */
  check(now?: Date): QueueGuardResult {
    const allowed = isDubaiBusinessHours(now);
    const waitMs = msUntilNextWindow(now);

    return {
      allowed,
      waitMs,
      reason: allowed
        ? 'Within Dubai business hours (08:30–21:00 GST)'
        : `Outside business hours. Next window in ${Math.ceil(waitMs / 60_000)} min.`,
    };
  }

  /**
   * Wait until Dubai business hours before executing a function.
   * If already within business hours, executes immediately.
   */
  async waitAndExecute<T>(fn: () => T | Promise<T>, now?: Date): Promise<T> {
    const { waitMs } = this.check(now);
    if (waitMs > 0) {
      this.paused = true;
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.paused = false;
    }
    return fn();
  }

  /** Whether the guard is currently paused waiting for business hours. */
  isPaused(): boolean {
    return this.paused;
  }
}
