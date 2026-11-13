/**
 * simulatedMouseMovement.ts — Inject randomized micro-interactions into a
 * Puppeteer page to simulate human mouse behavior.
 *
 * Moves the cursor in natural Bézier curves with random pauses, making
 * the browser session appear human-driven to WhatsApp's fingerprinting.
 */

interface PuppeteerPage {
  mouse: {
    move: (x: number, y: number, options?: { steps?: number }) => Promise<void>;
  };
  viewport: () => { width: number; height: number } | null;
  evaluate: <T>(fn: () => T) => Promise<T>;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Generate a random point within the viewport bounds, avoiding edges.
 */
function randomViewportPoint(width: number, height: number): Point {
  const margin = 50;
  return {
    x: margin + Math.random() * (width - 2 * margin),
    y: margin + Math.random() * (height - 2 * margin),
  };
}

/**
 * Generate intermediate points along a quadratic Bézier curve.
 */
function bezierPath(start: Point, end: Point, steps: number): Point[] {
  // Random control point for natural curve
  const control: Point = {
    x: (start.x + end.x) / 2 + (Math.random() - 0.5) * 200,
    y: (start.y + end.y) / 2 + (Math.random() - 0.5) * 200,
  };

  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    points.push({
      x: invT * invT * start.x + 2 * invT * t * control.x + t * t * end.x,
      y: invT * invT * start.y + 2 * invT * t * control.y + t * t * end.y,
    });
  }

  return points;
}

/**
 * Random micro-pause to simulate human hesitation.
 */
function microPause(): Promise<void> {
  const ms = 50 + Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inject randomized mouse movements into a Puppeteer page.
 *
 * Performs 2–5 natural cursor movements across the viewport with random
 * pauses between movements. Call periodically during idle periods to
 * maintain a human-like session fingerprint.
 *
 * @param page  Puppeteer `Page` instance (or compatible mock).
 */
export async function injectMouseMovement(page: PuppeteerPage): Promise<void> {
  const viewport = page.viewport();
  const width = viewport?.width ?? 1920;
  const height = viewport?.height ?? 1080;

  const movementCount = 2 + Math.floor(Math.random() * 4); // 2–5 movements

  let current: Point = randomViewportPoint(width, height);

  for (let i = 0; i < movementCount; i++) {
    const target = randomViewportPoint(width, height);
    const steps = 10 + Math.floor(Math.random() * 20); // 10–30 steps

    const path = bezierPath(current, target, steps);

    for (const point of path) {
      await page.mouse.move(
        Math.round(point.x),
        Math.round(point.y),
        { steps: 1 },
      );
    }

    current = target;

    // Random pause between movements
    await microPause();
  }
}
