import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startReadyWatchdog } from './engineReadyWatchdog.js';

describe('startReadyWatchdog', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('promotes to READY once client reports CONNECTED', async () => {
    let state = 'OPENING';
    const client = { getState: () => Promise.resolve(state), info: undefined };
    const onReady = vi.fn();
    const onTimeout = vi.fn();
    startReadyWatchdog({ clientId: 't', getClient: () => client, isReady: () => false, onReady, onTimeout, intervalMs: 1000, timeoutMs: 10_000 });

    await vi.advanceTimersByTimeAsync(2000);
    expect(onReady).not.toHaveBeenCalled();
    state = 'CONNECTED';
    await vi.advanceTimersByTimeAsync(1000);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls onTimeout when never connected', async () => {
    const client = { getState: () => Promise.resolve('OPENING') };
    const onReady = vi.fn();
    const onTimeout = vi.fn();
    startReadyWatchdog({ clientId: 't', getClient: () => client, isReady: () => false, onReady, onTimeout, intervalMs: 1000, timeoutMs: 3000 });

    await vi.advanceTimersByTimeAsync(4000);
    expect(onReady).not.toHaveBeenCalled();
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('stops silently if engine already ready', async () => {
    const onReady = vi.fn();
    startReadyWatchdog({ clientId: 't', getClient: () => ({}), isReady: () => true, onReady, onTimeout: vi.fn(), intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('does not invoke onTimeout when stopped while getState probe is in flight', async () => {
    let resolveState!: (v: string) => void;
    const client = { getState: () => new Promise<string>(r => { resolveState = r; }) };
    const onTimeout = vi.fn();
    const stop = startReadyWatchdog({ clientId: 't', getClient: () => client, isReady: () => false, onReady: vi.fn(), onTimeout, intervalMs: 1000, timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(1000);
    stop();
    resolveState('OPENING');
    await Promise.resolve();
    await Promise.resolve();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
