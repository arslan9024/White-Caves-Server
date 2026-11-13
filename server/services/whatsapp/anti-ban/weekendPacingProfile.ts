/**
 * weekendPacingProfile.ts — 40% reduced message velocity on Sat/Sun.
 *
 * Dubai's work week is Mon–Fri; Saturday and Sunday are rest days.
 * This module returns a multiplier (0.6 on weekends, 1.0 on weekdays)
 * to scale throughput.
 */

const GST_OFFSET_HOURS = 4;
const WEEKEND_MULTIPLIER = 0.6;
const WEEKDAY_MULTIPLIER = 1.0;

/**
 * Get the current Dubai day of week (0 = Sunday, 6 = Saturday).
 */
function getDubaiDayOfWeek(now?: Date): number {
  const d = now ?? new Date();
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const dubaiMs = utcMs + GST_OFFSET_HOURS * 3_600_000;
  return new Date(dubaiMs).getDay();
}

/**
 * Check if the current Dubai time falls on a weekend (Saturday or Sunday).
 */
export function isDubaiWeekend(now?: Date): boolean {
  const day = getDubaiDayOfWeek(now);
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Return the velocity multiplier for the current time.
 *
 * - Weekday (Mon–Fri): 1.0 (full speed)
 * - Weekend (Sat–Sun): 0.6 (40% reduction)
 *
 * @param now  Optional date for testing.
 */
export function getWeekendMultiplier(now?: Date): number {
  return isDubaiWeekend(now) ? WEEKEND_MULTIPLIER : WEEKDAY_MULTIPLIER;
}

/**
 * Apply the weekend multiplier to a base throughput value.
 *
 * @param baseValue  Normal weekday throughput (e.g. messages per hour).
 * @param now        Optional date for testing.
 * @returns Adjusted throughput, rounded down.
 */
export function applyWeekendPacing(baseValue: number, now?: Date): number {
  return Math.floor(baseValue * getWeekendMultiplier(now));
}
