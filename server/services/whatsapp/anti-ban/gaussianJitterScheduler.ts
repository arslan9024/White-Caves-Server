/**
 * gaussianJitterScheduler.ts — Random intervals with Gaussian distribution.
 *
 * Provides human-like random delays centered around a configurable mean
 * (default 4.2 s, std 1.1 s) using the Box-Muller transform.
 */

const DEFAULT_MEAN_MS = 4_200;
const DEFAULT_STD_MS = 1_100;
const MIN_DELAY_MS = 500;

/**
 * Box-Muller transform: generate a normally distributed random number.
 */
function gaussianRandom(mean: number, std: number): number {
  let u1 = Math.random();
  const u2 = Math.random();

  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

/**
 * Return a Gaussian-distributed delay in milliseconds.
 *
 * @param meanMs  Center of the distribution (default: 4200 ms).
 * @param stdMs   Standard deviation (default: 1100 ms).
 * @returns Delay in ms, floored at 500 ms.
 */
export function gaussianDelay(
  meanMs: number = DEFAULT_MEAN_MS,
  stdMs: number = DEFAULT_STD_MS,
): number {
  const raw = gaussianRandom(meanMs, stdMs);
  return Math.max(MIN_DELAY_MS, Math.round(raw));
}

/**
 * Schedule a function to execute after a Gaussian-distributed delay.
 *
 * @param fn      The function to call.
 * @param meanMs  Mean delay in ms (default: 4200).
 * @param stdMs   Standard deviation in ms (default: 1100).
 * @returns A promise that resolves with the function's return value.
 */
export function scheduleWithJitter<T>(
  fn: () => T | Promise<T>,
  meanMs: number = DEFAULT_MEAN_MS,
  stdMs: number = DEFAULT_STD_MS,
): Promise<T> {
  const delay = gaussianDelay(meanMs, stdMs);
  return new Promise<T>((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }, delay);
  });
}
