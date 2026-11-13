/**
 * sessionMemoryCeiling.ts — Monitor heap usage and trigger GC when > 750 MB.
 *
 * Protects WhatsApp sessions from OOM crashes in long-running Node processes
 * by checking V8 heap statistics on a configurable interval.
 */

import v8 from 'v8';

export interface MemoryCeilingOptions {
  ceilingMb?: number;
  checkIntervalMs?: number;
}

export interface MemorySnapshot {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  exceeds: boolean;
  gcTriggered: boolean;
}

const DEFAULT_CEILING_MB = 750;
const DEFAULT_CHECK_INTERVAL_MS = 30_000;
const BYTES_PER_MB = 1024 * 1024;

export class SessionMemoryCeiling {
  private readonly ceilingMb: number;
  private readonly checkIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: MemorySnapshot | null = null;

  constructor(opts?: MemoryCeilingOptions) {
    this.ceilingMb = opts?.ceilingMb ?? DEFAULT_CEILING_MB;
    this.checkIntervalMs = opts?.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  }

  /** Take a single memory snapshot and return it. */
  check(): MemorySnapshot {
    const heapStats = v8.getHeapStatistics();
    const memUsage = process.memoryUsage();

    const heapUsedMb = Math.round(heapStats.used_heap_size / BYTES_PER_MB);
    const heapTotalMb = Math.round(heapStats.total_heap_size / BYTES_PER_MB);
    const rssMb = Math.round(memUsage.rss / BYTES_PER_MB);
    const exceeds = heapUsedMb > this.ceilingMb;

    const snapshot: MemorySnapshot = {
      heapUsedMb,
      heapTotalMb,
      rssMb,
      exceeds,
      gcTriggered: false,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Check memory and trigger GC if the ceiling is exceeded.
   * Requires `--expose-gc` flag; silently skips if GC is not exposed.
   */
  enforce(): MemorySnapshot {
    const snapshot = this.check();

    if (snapshot.exceeds && typeof globalThis.gc === 'function') {
      globalThis.gc();
      snapshot.gcTriggered = true;

      // Re-sample after GC
      const after = this.check();
      snapshot.heapUsedMb = after.heapUsedMb;
      snapshot.heapTotalMb = after.heapTotalMb;
      snapshot.rssMb = after.rssMb;
      snapshot.exceeds = after.exceeds;
    }

    return snapshot;
  }

  /** Start a periodic enforcement loop. */
  startMonitor(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.enforce();
    }, this.checkIntervalMs);

    // Don't keep Node alive just for this timer
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref();
    }
  }

  /** Stop the periodic monitor. */
  stopMonitor(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Get the most recent snapshot without re-checking. */
  getLastSnapshot(): MemorySnapshot | null {
    return this.lastSnapshot;
  }
}
