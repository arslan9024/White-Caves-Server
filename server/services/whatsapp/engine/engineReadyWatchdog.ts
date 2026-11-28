/**
 * Polls a whatsapp-web.js client after 'authenticated' until it reports CONNECTED.
 * whatsapp-web.js sometimes never fires 'ready' (slow chat sync / WA Web updates),
 * which leaves the engine stuck in AUTHENTICATING. This promotes it to READY.
 */
export interface ReadyWatchdogOptions {
  clientId: string;
  getClient: () => any;
  isReady: () => boolean;
  onReady: () => void;
  onTimeout: () => void;
  intervalMs?: number;
  timeoutMs?: number;
}

export function startReadyWatchdog(opts: ReadyWatchdogOptions): () => void {
  const intervalMs = opts.intervalMs ?? 5_000;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const startedAt = Date.now();
  let stopped = false;

  const timer = setInterval(async () => {
    if (stopped) return;
    if (opts.isReady()) return stop();
    const client = opts.getClient();
    if (!client) return stop();
    try {
      const state = await client.getState?.().catch(() => null);
      if (client.info?.wid || state === 'CONNECTED') {
        console.log(`[WhatsAppEngine:${opts.clientId}] Watchdog promoted AUTHENTICATING -> READY (state=${state ?? 'wid'})`);
        stop();
        opts.onReady();
        return;
      }
    } catch {
      // ignore probe errors; keep polling
    }
    if (Date.now() - startedAt >= timeoutMs) {
      console.warn(`[WhatsAppEngine:${opts.clientId}] Watchdog timeout after ${timeoutMs / 1000}s in AUTHENTICATING — restarting client`);
      stop();
      opts.onTimeout();
    }
  }, intervalMs);
  timer.unref?.();

  function stop(): void {
    stopped = true;
    clearInterval(timer);
  }
  return stop;
}
