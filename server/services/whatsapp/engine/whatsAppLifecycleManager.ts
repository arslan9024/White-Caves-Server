import fs from 'node:fs';
import path from 'node:path';
import type { WhatsAppEngineCore } from './whatsAppEngineCore.js';
import type { WhatsAppEngineConfig, WhatsAppEngineStatus } from './whatsAppEngineTypes.js';
import { sanitizeSessionLocks } from './localAuthLockSanitizer.js';

export interface WhatsAppInitOptions {
  clientId: string;
  sessionPath: string;
  headless: boolean;
  autoRestart: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

const WINDOWS_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const LINUX_BROWSER_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/**
 * Resolve a usable Chrome/Chromium/Edge binary when Puppeteer download is skipped.
 */
export function resolvePuppeteerExecutablePath(): string | undefined {
  const configured = (process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || '').trim();
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  const candidates =
    process.platform === 'win32'
      ? WINDOWS_BROWSER_CANDIDATES
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : LINUX_BROWSER_CANDIDATES;

  return candidates.find(candidate => fs.existsSync(candidate));
}

/**
 * Initialize WhatsApp connection using whatsapp-web.js LocalAuth.
 */
export async function initializeWhatsAppClient(
  _engine: WhatsAppEngineCore,
  config: Omit<Required<WhatsAppEngineConfig>, 'pairWithPhoneNumber'> &
    Pick<WhatsAppEngineConfig, 'pairWithPhoneNumber'>,
  setStatus: (status: WhatsAppEngineStatus) => void,
  setupListeners: (client: any) => void,
  onClientCreated?: (client: any) => void
): Promise<any> {
  setStatus('AUTHENTICATING' as WhatsAppEngineStatus);
  console.log(`[WhatsAppEngine] Initializing WhatsApp LocalAuth client for ${config.clientId}...`);
  console.log(`[WhatsAppEngine] Session path: ${config.sessionPath}`);

  const wwjs = await import('whatsapp-web.js');
  const { Client, LocalAuth } = wwjs.default ?? wwjs;

  if (!fs.existsSync(config.sessionPath)) {
    fs.mkdirSync(config.sessionPath, { recursive: true });
  }

  // Clear stale Chromium SingletonLock/Cookie/Socket files before launch
  const sessionDir = path.join(config.sessionPath, `session-${config.clientId}`);
  if (fs.existsSync(sessionDir)) {
    const cleaned = sanitizeSessionLocks(sessionDir).filter(r => r.deleted);
    if (cleaned.length > 0) {
      console.log(
        `[WhatsAppEngine:${config.clientId}] Cleaned stale lock files: ${cleaned.map(c => c.file).join(', ')}`
      );
    }
  }

  const executablePath = resolvePuppeteerExecutablePath();
  const customWaWebVersionUrl = (process.env.LINDA_WA_WEB_VERSION_URL || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientOptions: Record<string, any> = {
    authStrategy: new LocalAuth({
      clientId: config.clientId,
      dataPath: config.sessionPath,
    }),
    puppeteer: {
      headless: config.headless,
      timeout: 120_000,
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled',
      ],
    },
    bypassCSP: true,
    userAgent:
      process.env.LINDA_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    authTimeoutMs: 120_000,
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    ...(config.pairWithPhoneNumber ? { pairWithPhoneNumber: config.pairWithPhoneNumber } : {}),
  };

  if (customWaWebVersionUrl) {
    clientOptions.webVersionCache = {
      type: 'remote',
      remotePath: customWaWebVersionUrl,
    };
  }

  const client = new Client(clientOptions);
  onClientCreated?.(client);
  setupListeners(client);
  await client.initialize();
  return client;
}

/**
 * Calculate reconnect back-off delay capped at 5 minutes with ±25% jitter
 * to prevent thundering-herd reconnects across the 10-SIM fleet.
 */
export function calculateReconnectDelay(baseDelay: number, attempt: number): number {
  const exponential = Math.min(baseDelay * Math.pow(2, attempt - 1), 300_000);
  const jitterFactor = 0.75 + Math.random() * 0.5; // [0.75, 1.25]
  return Math.round(exponential * jitterFactor);
}
