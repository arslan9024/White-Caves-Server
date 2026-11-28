import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppEngine } from '../engine/whatsAppEngineCore.js';
import { WhatsAppEngineStatus } from '../engine/whatsAppEngineTypes.js';
import {
  getAllWhatsAppEngines,
  resetWhatsAppEngine,
  shutdownAllWhatsAppEngines,
} from '../engine/whatsAppEngineRegistry.js';
import { isIsolatedWorkerMode } from './lindaWorkerBridge.js';

describe('WhatsApp LocalAuth session persistence & isolated worker guards', () => {
  afterEach(() => {
    resetWhatsAppEngine();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('isIsolatedWorkerMode disables sidecar in test/worker/opt-out and enables it in normal server runtime', () => {
    expect(isIsolatedWorkerMode()).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITEST', '');
    vi.stubEnv('LINDA_WORKER_PROCESS', '');
    vi.stubEnv('LINDA_ISOLATED_WORKER', '');
    expect(isIsolatedWorkerMode()).toBe(true);

    vi.stubEnv('LINDA_WORKER_PROCESS', '1');
    expect(isIsolatedWorkerMode()).toBe(false);

    vi.stubEnv('LINDA_WORKER_PROCESS', '');
    vi.stubEnv('LINDA_ISOLATED_WORKER', 'false');
    expect(isIsolatedWorkerMode()).toBe(false);
  });

  it('shutdownAllWhatsAppEngines invokes client.destroy() across all registered engines cleanly', async () => {
    const destroyMock = vi.fn().mockResolvedValue(undefined);
    const engine = new WhatsAppEngine({ clientId: '971505760056', autoRestart: true });
    (engine as unknown as { client: { destroy: () => Promise<void> } }).client = {
      destroy: destroyMock,
    };
    expect(getAllWhatsAppEngines()).toHaveLength(1);

    await shutdownAllWhatsAppEngines(2_000);
    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(engine.getStatus()).toBe(WhatsAppEngineStatus.DISCONNECTED);
    expect(engine.isConnected()).toBe(false);
  });

  it('disconnect() suppresses auto-reconnect and clears active ready watchdog before exit', async () => {
    vi.useFakeTimers();
    try {
      const client = new EventEmitter() as EventEmitter & {
        destroy: () => Promise<void>;
        getState: () => Promise<string>;
      };
      client.destroy = vi.fn().mockResolvedValue(undefined);
      client.getState = vi.fn().mockResolvedValue('OPENING');

      const engine = new WhatsAppEngine({ clientId: '971505760056', autoRestart: true });
      (engine as unknown as { client: typeof client }).client = client;
      (engine as unknown as { setupEventListeners: (c: typeof client) => void }).setupEventListeners(client);

      client.emit('authenticated');
      await engine.disconnect();
      // Even if a late disconnected event fires during destroy, no reconnect timer should be armed
      client.emit('disconnected', 'SIGTERM');
      await vi.advanceTimersByTimeAsync(150_000);

      expect(client.destroy).toHaveBeenCalledTimes(1);
      expect(engine.getStatus()).toBe(WhatsAppEngineStatus.DISCONNECTED);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hydrates remote worker snapshot so Primary Master stays LIVE & READY across server restarts', () => {
    const engine = new WhatsAppEngine({ clientId: '971505760056' });
    const received: unknown[] = [];
    engine.on('message', m => received.push(m));

    (engine as unknown as { applyWorkerSnapshot: (s: unknown) => void }).applyWorkerSnapshot({
      clientId: '971505760056',
      status: WhatsAppEngineStatus.READY,
      sessionActive: true,
      clientAuthenticated: true,
      isConnected: true,
      qrCode: null,
      messagesSent: 3,
      messagesReceived: 5,
      reconnectAttempts: 0,
    });

    expect(engine.isConnected()).toBe(true);
    expect(engine.isHardwareConnected()).toBe(true);
    expect(engine.getStats()).toMatchObject({
      status: WhatsAppEngineStatus.READY,
      isConnected: true,
      messagesSent: 3,
      messagesReceived: 5,
    });

    (engine as unknown as { handleWorkerEvent: (e: string, p: unknown) => void }).handleWorkerEvent(
      'message',
      { id: 'm1', from: '971505760056@c.us', body: 'status', timestamp: new Date(), isFromMe: false, hasMedia: false, type: 'text' }
    );
    expect(received).toHaveLength(1);
    expect(engine.getMessageQueue()).toHaveLength(1);
  });
});
