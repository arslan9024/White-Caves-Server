import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { WhatsAppEngineConfig, WhatsAppEngineStatus } from '../engine/whatsAppEngineTypes.js';

export interface WorkerEngineSnapshot {
  clientId: string;
  status: WhatsAppEngineStatus;
  sessionActive: boolean;
  clientAuthenticated: boolean;
  isConnected: boolean;
  qrCode: string | null;
  messagesSent: number;
  messagesReceived: number;
  reconnectAttempts: number;
}

export interface WorkerProxyCallbacks {
  onSnapshot: (snapshot: WorkerEngineSnapshot) => void;
  onEvent: (event: string, payload: unknown) => void;
}

const DEFAULT_WORKER_PORT = 5099;
const proxies = new Map<string, WorkerProxyCallbacks>();
let ensurePromise: Promise<void> | null = null;
let sseReq: http.ClientRequest | null = null;
let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let detachedByShutdown = false;

export function getLindaWorkerPort(): number {
  const parsed = Number(process.env.LINDA_WORKER_PORT || DEFAULT_WORKER_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WORKER_PORT;
}

/**
 * Isolated worker mode runs WhatsApp/Chromium outside nodemon's process tree
 * so server code edits & restarts never terminate or corrupt LocalAuth sessions.
 */
export function isIsolatedWorkerMode(): boolean {
  if (process.env.LINDA_WORKER_PROCESS === '1') return false;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return false;
  return process.env.LINDA_ISOLATED_WORKER !== 'false';
}

export function registerWorkerEngineProxy(clientId: string, callbacks: WorkerProxyCallbacks): void {
  proxies.set(clientId, callbacks);
}

interface HealthResponse {
  ok: boolean;
  pid: number;
  cwd: string;
  engines?: WorkerEngineSnapshot[];
}

function httpRequestJson<T>(
  method: 'GET' | 'POST',
  pathname: string,
  body?: unknown,
  timeoutMs = 30_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const port = getLindaWorkerPort();
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : undefined,
        timeout: timeoutMs,
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(raw) as T & { ok?: boolean; error?: string };
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed?.error || `Worker HTTP ${res.statusCode}`));
              return;
            }
            resolve(parsed);
          } catch {
            reject(new Error(`Invalid JSON from WhatsApp worker (${res.statusCode}): ${raw.slice(0, 120)}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`WhatsApp worker ${pathname} timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function checkWorkerHealth(): Promise<HealthResponse | null> {
  try {
    const res = await httpRequestJson<HealthResponse>('GET', '/health', undefined, 800);
    return res?.ok ? res : null;
  } catch {
    return null;
  }
}

function spawnDetachedWorker(): void {
  const port = getLindaWorkerPort();
  const cwd = process.cwd();
  const tsxCli = path.resolve(cwd, 'node_modules/tsx/dist/cli.mjs');
  const workerEntry = path.resolve(cwd, 'server/services/whatsapp/worker/lindaSessionWorker.ts');
  const workerEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LINDA_WORKER_PROCESS: '1',
    LINDA_WORKER_PORT: String(port),
  };

  if (process.platform === 'win32') {
    // Launch via PowerShell Start-Process so Windows nodemon's `taskkill /T /F` cannot reach the worker tree.
    const ps = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Start-Process -FilePath $env:LINDA_NODE_EXE -ArgumentList @($env:LINDA_TSX_CLI, $env:LINDA_WORKER_ENTRY) -WorkingDirectory $env:LINDA_WORKER_CWD -WindowStyle Hidden',
      ],
      {
        cwd,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...workerEnv,
          LINDA_NODE_EXE: process.execPath,
          LINDA_TSX_CLI: tsxCli,
          LINDA_WORKER_ENTRY: workerEntry,
          LINDA_WORKER_CWD: cwd,
        },
      }
    );
    ps.unref();
    return;
  }

  const child = spawn(process.execPath, [tsxCli, workerEntry], {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: workerEnv,
  });
  child.unref();
}

function handleSseBlock(block: string): void {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  try {
    const parsed = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    if (eventName === 'snapshot' && parsed.engines && typeof parsed.engines === 'object') {
      const engines = parsed.engines as Record<string, WorkerEngineSnapshot>;
      for (const [id, snap] of Object.entries(engines)) {
        proxies.get(id)?.onSnapshot(snap);
      }
      return;
    }
    if (eventName === 'engine_event' && typeof parsed.clientId === 'string') {
      const proxy = proxies.get(parsed.clientId);
      if (!proxy) return;
      if (parsed.snapshot) proxy.onSnapshot(parsed.snapshot as WorkerEngineSnapshot);
      if (typeof parsed.event === 'string') proxy.onEvent(parsed.event, parsed.payload);
    }
  } catch {
    // ignore malformed SSE payload
  }
}

function connectSseStream(): void {
  if (detachedByShutdown || sseReq) return;
  const port = getLindaWorkerPort();
  let buffer = '';

  const req = http.request(
    { hostname: '127.0.0.1', port, path: '/events', method: 'GET' },
    res => {
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        buffer += chunk;
        let idx = buffer.indexOf('\n\n');
        while (idx !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          handleSseBlock(block);
          idx = buffer.indexOf('\n\n');
        }
      });
      res.on('end', scheduleSseReconnect);
      res.on('error', scheduleSseReconnect);
    }
  );
  req.on('error', scheduleSseReconnect);
  req.end();
  sseReq = req;
}

function scheduleSseReconnect(): void {
  sseReq = null;
  if (detachedByShutdown || sseReconnectTimer) return;
  sseReconnectTimer = setTimeout(() => {
    sseReconnectTimer = null;
    connectSseStream();
  }, 1500);
  sseReconnectTimer.unref?.();
}

export async function ensureLindaWorkerRunning(): Promise<void> {
  if (detachedByShutdown) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const existing = await checkWorkerHealth();
    if (existing) {
      if (existing.cwd && path.resolve(existing.cwd) !== path.resolve(process.cwd())) {
        throw new Error(
          `WhatsApp worker on :${getLindaWorkerPort()} belongs to ${existing.cwd} (expected ${process.cwd()})`
        );
      }
      if (Array.isArray(existing.engines)) {
        for (const snap of existing.engines) proxies.get(snap.clientId)?.onSnapshot(snap);
      }
      connectSseStream();
      return;
    }

    spawnDetachedWorker();
    const deadline = Date.now() + 12_000;
    while (Date.now() < deadline) {
      const health = await checkWorkerHealth();
      if (health) {
        connectSseStream();
        return;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error(`Isolated WhatsApp session worker failed to respond on 127.0.0.1:${getLindaWorkerPort()}`);
  })().finally(() => {
    ensurePromise = null;
  });

  return ensurePromise;
}

export async function callWorkerRpc<T = unknown>(
  action: string,
  clientId: string,
  params?: Record<string, unknown> & { config?: WhatsAppEngineConfig },
  timeoutMs = 120_000
): Promise<T> {
  await ensureLindaWorkerRunning();
  const res = await httpRequestJson<{ ok: boolean; data: T; error?: string }>(
    'POST',
    '/rpc',
    { action, clientId, ...params },
    timeoutMs
  );
  if (!res.ok) {
    throw new Error(res.error || `Worker RPC ${action} failed`);
  }
  return res.data;
}

/**
 * Detach server's SSE client on server shutdown/nodemon restart while keeping
 * the isolated WhatsApp Chromium worker alive 24/7.
 */
export function detachLindaWorkerBridge(): void {
  detachedByShutdown = true;
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = null;
  }
  if (sseReq) {
    sseReq.destroy();
    sseReq = null;
  }
}
