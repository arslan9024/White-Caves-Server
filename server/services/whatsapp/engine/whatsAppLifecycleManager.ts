import type { WhatsAppEngineCore } from './whatsAppEngineCore.js';
import type { WhatsAppEngineConfig, WhatsAppEngineStatus } from './whatsAppEngineTypes.js';

export interface WhatsAppInitOptions {
  clientId: string;
  sessionPath: string;
  headless: boolean;
  autoRestart: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

/**
 * Initialize WhatsApp connection using whatsapp-web.js LocalAuth.
 */
export async function initializeWhatsAppClient(
  engine: WhatsAppEngineCore,
  config: Required<WhatsAppEngineConfig>,
  setStatus: (status: WhatsAppEngineStatus) => void,
  setupListeners: (client: any) => void
): Promise<any> {
  setStatus('AUTHENTICATING' as WhatsAppEngineStatus);
  console.log(`[WhatsAppEngine] Initializing WhatsApp LocalAuth client for ${config.clientId}...`);
  console.log(`[WhatsAppEngine] Session path: ${config.sessionPath}`);

  const wwjs = await import('whatsapp-web.js');
  const { Client, LocalAuth } = wwjs.default ?? wwjs;

  const fs = await import('fs');
  if (!fs.existsSync(config.sessionPath)) {
    fs.mkdirSync(config.sessionPath, { recursive: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: config.clientId,
      dataPath: config.sessionPath,
    }),
    webVersionCache: {
      type: 'remote',
      remotePath:
        'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018944883-alpha.html',
    },
    puppeteer: {
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
      ],
    },
    restartOnAuthFail: true,
    takeoverOnConflict: true,
  } as any);

  setupListeners(client);
  await client.initialize();
  return client;
}

/**
 * Calculate reconnect back-off delay capped at 5 minutes.
 */
export function calculateReconnectDelay(baseDelay: number, attempt: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), 300_000);
}
