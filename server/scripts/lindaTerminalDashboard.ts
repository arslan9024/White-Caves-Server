import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { WhatsAppEngine } from '../services/whatsapp/engine/whatsAppEngineCore.js';

const LINDA_SESSIONS_PATH =
  process.env.LINDA_SESSIONS_PATH || path.resolve(process.cwd(), '.linda-sessions');

interface CliOptions {
  clientId: string;
  pairPhone?: string;
  headless: boolean;
  cleanSession: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    clientId: process.env.LINDA_DEFAULT_CLIENT_ID || '971505760056',
    headless: true,
    cleanSession: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--client' || arg === '-c') && argv[i + 1]) {
      opts.clientId = argv[++i].replace(/[^\dA-Za-z_-]/g, '');
    } else if ((arg === '--pair' || arg === '-p') && argv[i + 1]) {
      opts.pairPhone = argv[++i].replace(/\D/g, '');
    } else if (arg === '--headless' && argv[i + 1]) {
      opts.headless = argv[++i] !== 'false';
    } else if (arg === '--clean-session') {
      opts.cleanSession = true;
    }
  }
  return opts;
}

function printBanner(opts: CliOptions): void {
  console.log('\n==============================================================');
  console.log('  AI LINDA — WHATSAPP TERMINAL DASHBOARD (NO FRONTEND)');
  console.log('==============================================================');
  console.log(`  Client ID : ${opts.clientId}`);
  console.log(`  Headless  : ${opts.headless}`);
  console.log(`  Pair Mode : ${opts.pairPhone ? `Phone (${opts.pairPhone})` : 'Interactive / QR'}`);
  console.log('--------------------------------------------------------------');
  console.log('  Commands: p <phone> | s <phone> <msg> | status | q');
  console.log('==============================================================\n');
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  printBanner(opts);

  if (opts.cleanSession) {
    const sessionDir = path.join(LINDA_SESSIONS_PATH, `session-${opts.clientId}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[Terminal] Cleared stale session directory: ${sessionDir}`);
    }
  }

  const engine = new WhatsAppEngine({
    clientId: opts.clientId,
    headless: opts.headless,
    ...(opts.pairPhone
      ? {
          pairWithPhoneNumber: {
            phoneNumber: opts.pairPhone,
            showNotification: true,
            intervalMs: 180_000,
          },
        }
      : {}),
  });

  engine.on('status', (status: string) => {
    console.log(`[Status] ${opts.clientId} -> ${status}`);
  });

  let codeReceived = false;
  let pairingFallbackTriggered = false;

  engine.on('code', (code: string) => {
    codeReceived = true;
    console.log('\n**************************************************************');
    console.log(`  WHATSAPP PAIRING CODE (${opts.pairPhone || opts.clientId}): ${code}`);
    console.log('  Enter this code on WhatsApp -> Linked Devices -> Link with phone number');
    console.log('**************************************************************\n');
  });

  engine.on('qr', (qr: string) => {
    if (!opts.pairPhone) {
      console.log(`[QR] QR generated (length=${qr.length}). Use "p <phone>" to pair by code instead.`);
    } else if (!codeReceived && !pairingFallbackTriggered) {
      pairingFallbackTriggered = true;
      console.log(`[Pairing] QR detected; requesting 8-char pairing code for ${opts.pairPhone}...`);
      void engine
        .requestPairingCode(opts.pairPhone)
        .then((code) => {
          if (!codeReceived) {
            codeReceived = true;
            console.log('\n**************************************************************');
            console.log(`  WHATSAPP PAIRING CODE (${opts.pairPhone}): ${code}`);
            console.log('  Enter this code on WhatsApp -> Linked Devices -> Link with phone number');
            console.log('**************************************************************\n');
          }
        })
        .catch((err) => {
          console.error('[Pairing Fallback Error]', err instanceof Error ? err.message : err);
        });
    }
  });

  engine.on('ready', () => {
    console.log('\n[READY] Linda WhatsApp hardware link is ACTIVE. Ready to send/receive.\n');
  });

  engine.on('message', (msg: { from: string; body: string }) => {
    console.log(`[INBOUND] ${msg.from}: ${msg.body}`);
  });

  engine.on('error', (err: unknown) => {
    console.error('[ERROR]', err instanceof Error ? err.message : err);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const [cmd, ...rest] = trimmed.split(/\s+/);
    if (cmd === 'q' || cmd === 'quit' || cmd === 'exit') {
      console.log('[Terminal] Shutting down Linda WhatsApp engine...');
      await engine.disconnect();
      rl.close();
      process.exit(0);
    } else if (cmd === 'status') {
      console.log('[Stats]', JSON.stringify(engine.getStats()));
    } else if (cmd === 'p' && rest[0]) {
      try {
        const code = await engine.requestPairingCode(rest[0]);
        console.log(`\n[PAIRING CODE] ${code}\n`);
      } catch (err) {
        console.error('[Pairing Error]', err instanceof Error ? err.message : err);
      }
    } else if (cmd === 's' && rest.length >= 2) {
      const [to, ...msgParts] = rest;
      try {
        const id = await engine.sendMessage(to, msgParts.join(' '));
        console.log(`[SENT] -> ${to} (id: ${id})`);
      } catch (err) {
        console.error('[Send Error]', err instanceof Error ? err.message : err);
      }
    } else {
      console.log('Commands: p <phone> | s <phone> <msg> | status | q');
    }
  });

  await engine.initialize();
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
