import '../../../config/env.js';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { getWhatsAppEngine } from '../WhatsAppEngine.js';
import { shutdownAllWhatsAppEngines, getAllWhatsAppEngines } from '../engine/whatsAppEngineRegistry.js';
import type { WhatsAppEngine } from '../engine/whatsAppEngineCore.js';
import type { WhatsAppEngineConfig } from '../engine/whatsAppEngineTypes.js';
import { getLindaWorkerPort, type WorkerEngineSnapshot } from './lindaWorkerBridge.js';

process.env.LINDA_WORKER_PROCESS = '1';

const startedAt = new Date().toISOString();
const sseClients = new Set<ServerResponse>();
const wiredEngines = new Set<string>();
let shuttingDown = false;

const FORWARDED_EVENTS = [
  'qr',
  'code',
  'authenticated',
  'ready',
  'auth_failure',
  'disconnected',
  'message',
  'message_sent',
  'status_changed',
  'error',
] as const;

function buildSnapshot(engine: WhatsAppEngine): WorkerEngineSnapshot {
  const stats = engine.getStats();
  return {
    clientId: engine.getClientId(),
    status: stats.status,
    sessionActive: stats.isConnected,
    clientAuthenticated: engine.isHardwareConnected(),
    isConnected: stats.isConnected,
    qrCode: engine.getQRCode(),
    messagesSent: stats.messagesSent,
    messagesReceived: stats.messagesReceived,
    reconnectAttempts: stats.reconnectAttempts,
  };
}

function buildAllSnapshots(): Record<string, WorkerEngineSnapshot> {
  const map: Record<string, WorkerEngineSnapshot> = {};
  for (const engine of getAllWhatsAppEngines()) {
    map[engine.getClientId()] = buildSnapshot(engine);
  }
  return map;
}

function broadcastSse(event: string, data: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(frame);
    } catch {
      sseClients.delete(client);
    }
  }
}

function wireEngineEvents(engine: WhatsAppEngine): void {
  const clientId = engine.getClientId();
  if (wiredEngines.has(clientId)) return;
  wiredEngines.add(clientId);

  for (const eventName of FORWARDED_EVENTS) {
    engine.on(eventName, (payload: unknown) => {
      const safePayload =
        payload instanceof Error ? { message: payload.message } : payload;
      broadcastSse('engine_event', {
        clientId,
        event: eventName,
        payload: safePayload,
        snapshot: buildSnapshot(engine),
      });
    });
  }
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(raw),
  });
  res.end(raw);
}

async function handleRpc(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action || '');
  const clientId = String(body.clientId || '');

  if (action === 'shutdown') {
    setTimeout(() => void gracefulShutdown('RPC_SHUTDOWN'), 50);
    return { shuttingDown: true };
  }

  const config = (body.config as Omit<WhatsAppEngineConfig, 'clientId'> | undefined) ?? undefined;
  const engine = getWhatsAppEngine(clientId, config);
  wireEngineEvents(engine);

  switch (action) {
    case 'initialize':
      await engine.initialize();
      return buildSnapshot(engine);
    case 'requestPairingCode':
      return await engine.requestPairingCode(String(body.phoneNumber || ''));
    case 'sendMessage':
      return await engine.sendMessage(String(body.phoneNumber || ''), String(body.message || ''));
    case 'broadcastMessage':
      return await engine.broadcastMessage(
        Array.isArray(body.phoneNumbers) ? body.phoneNumbers.map(String) : [],
        String(body.message || '')
      );
    case 'getConversations':
      return await engine.getConversations();
    case 'getConversationHistory':
      return await engine.getConversationHistory(
        String(body.phoneNumber || ''),
        typeof body.limit === 'number' ? body.limit : 50
      );
    case 'disconnect':
      await engine.disconnect();
      return buildSnapshot(engine);
    case 'snapshot':
      return buildSnapshot(engine);
    default:
      throw new Error(`Unknown worker RPC action: ${action}`);
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  if (req.method === 'GET' && url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      pid: process.pid,
      cwd: process.cwd(),
      startedAt,
      engines: Object.values(buildAllSnapshots()),
    });
  }

  if (req.method === 'GET' && url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    sseClients.add(res);
    res.write(`event: snapshot\ndata: ${JSON.stringify({ engines: buildAllSnapshots() })}\n\n`);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.method === 'POST' && url === '/rpc') {
    try {
      const body = await readJsonBody(req);
      const data = await handleRpc(body);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      return sendJson(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
});

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[LindaSessionWorker] ${signal} received — flushing Chromium LocalAuth sessions...`);
  await shutdownAllWhatsAppEngines(8_000);
  for (const client of sseClients) client.end();
  sseClients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2_000).unref();
}

const keepAlivePing = setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15_000);
keepAlivePing.unref();

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', () => void gracefulShutdown('SIGUSR2'));
process.on('uncaughtException', err => {
  console.error('[LindaSessionWorker] uncaughtException:', err);
});
process.on('unhandledRejection', err => {
  console.error('[LindaSessionWorker] unhandledRejection:', err);
});

const port = getLindaWorkerPort();
server.listen(port, '127.0.0.1', () => {
  console.log(`[LindaSessionWorker] Isolated WhatsApp session daemon listening on 127.0.0.1:${port} (PID ${process.pid})`);
});
