import readline from 'node:readline';
import { lindaMultiSimPool } from '../services/whatsapp/LindaMultiSimPoolService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('LindaInteractiveTerminal');
let attached = false;

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[38;2;239;68;68m',      // White Caves Red (#EF4444)
  slate: '\x1b[38;2;148;163;184m',  // Slate
  white: '\x1b[38;2;255;255;255m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  clearScreen: '\x1b[2J\x1b[H',
};

type OutputLevel = 'INFO' | 'OK' | 'WARN' | 'ERR' | 'PAIR' | 'SENT';

interface UniqueOutputEntry {
  key: string;
  level: OutputLevel;
  message: string;
  time: string;
}

const MAX_UNIQUE_OUTPUTS = 10;
const uniqueOutputKeys = new Set<string>();
const outputFeed: UniqueOutputEntry[] = [];
let lastInputCommand = 'None';
let rlInstance: readline.Interface | null = null;

function formatTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function levelColor(level: OutputLevel): string {
  switch (level) {
    case 'OK':
    case 'SENT':
      return ANSI.green;
    case 'WARN':
      return ANSI.yellow;
    case 'ERR':
      return ANSI.red;
    case 'PAIR':
      return ANSI.cyan;
    default:
      return ANSI.slate;
  }
}

/**
 * Adds an output entry only if its (level + message) key has not already been recorded.
 * Prevents repeating/duplicate lines from cluttering the terminal.
 */
function pushUniqueOutput(level: OutputLevel, message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;
  const key = `${level}:${normalized}`;
  if (uniqueOutputKeys.has(key)) {
    return false;
  }
  uniqueOutputKeys.add(key);
  outputFeed.push({ key, level, message: normalized, time: formatTime() });
  if (outputFeed.length > MAX_UNIQUE_OUTPUTS) {
    const removed = outputFeed.shift();
    if (removed) uniqueOutputKeys.delete(removed.key);
  }
  return true;
}

function renderDashboard(): void {
  const primary = lindaMultiSimPool.getPrimaryAccount();
  const accounts = lindaMultiSimPool.listPoolAccounts();
  const connectedCount = accounts.filter(a => a.isConnected).length;
  const totalSent = accounts.reduce((sum, a) => sum + a.messagesSent, 0);
  const totalRecv = accounts.reduce((sum, a) => sum + a.messagesReceived, 0);
  const divider = `${ANSI.slate}${'─'.repeat(72)}${ANSI.reset}`;

  const lines: string[] = [
    ANSI.clearScreen,
    `${ANSI.red}${ANSI.bold}╔══════════════════════════════════════════════════════════════════════╗${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}║${ANSI.reset}  ${ANSI.white}${ANSI.bold}WHITE CAVES — AI LINDA TERMINAL DASHBOARD${ANSI.reset}  ${ANSI.dim}(Unique & Minimal)${ANSI.reset}       ${ANSI.red}${ANSI.bold}║${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}╚══════════════════════════════════════════════════════════════════════╝${ANSI.reset}`,
    `${ANSI.cyan}${ANSI.bold}▼ OUTPUT DASHBOARD${ANSI.reset}  ${ANSI.slate}|${ANSI.reset} Master: ${ANSI.white}+${primary.phoneNumber.replace(/\D/g, '')}${ANSI.reset} ${ANSI.slate}|${ANSI.reset} SIMs: ${ANSI.green}${connectedCount}/${accounts.length}${ANSI.reset} ${ANSI.slate}|${ANSI.reset} Sent: ${ANSI.white}${totalSent}${ANSI.reset} ${ANSI.slate}|${ANSI.reset} Recv: ${ANSI.white}${totalRecv}${ANSI.reset}`,
    divider,
  ];

  // Compact SIM status rows
  for (const acc of accounts) {
    const connBadge = acc.isConnected
      ? `${ANSI.green}● ONLINE ${ANSI.reset}`
      : `${ANSI.yellow}○ OFFLINE${ANSI.reset}`;
    lines.push(
      `  ${ANSI.white}${acc.id.padEnd(10)}${ANSI.reset} ${ANSI.slate}+${acc.phoneNumber.padEnd(14)}${ANSI.reset} ${connBadge} ${ANSI.dim}[${acc.engineStatus}]${ANSI.reset}`
    );
  }

  lines.push(divider);
  lines.push(`${ANSI.cyan}${ANSI.bold}  UNIQUE OUTPUTS${ANSI.reset} ${ANSI.dim}(max ${MAX_UNIQUE_OUTPUTS}, duplicates suppressed)${ANSI.reset}`);

  if (outputFeed.length === 0) {
    lines.push(`  ${ANSI.dim}No unique events yet.${ANSI.reset}`);
  } else {
    for (const entry of outputFeed) {
      const color = levelColor(entry.level);
      lines.push(
        `  ${ANSI.dim}${entry.time}${ANSI.reset} ${color}[${entry.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${entry.message}${ANSI.reset}`
      );
    }
  }

  lines.push('');
  lines.push(`${ANSI.red}${ANSI.bold}▲ INPUT DASHBOARD${ANSI.reset}  ${ANSI.slate}|${ANSI.reset} Last cmd: ${ANSI.yellow}${lastInputCommand}${ANSI.reset}`);
  lines.push(divider);
  lines.push(`  ${ANSI.white}Commands:${ANSI.reset} ${ANSI.cyan}status${ANSI.reset} | ${ANSI.cyan}p [phone]${ANSI.reset} | ${ANSI.cyan}qr${ANSI.reset} | ${ANSI.cyan}s <phone> <msg>${ANSI.reset} | ${ANSI.cyan}clear${ANSI.reset} | ${ANSI.cyan}help${ANSI.reset}`);
  lines.push(divider);

  process.stdout.write(lines.join('\n') + '\n');
  if (rlInstance) {
    rlInstance.prompt(true);
  }
}

/**
 * Interactive Linda Terminal Dashboard for `npm run dev` / `npm run dev:dashboard`.
 * Clears screen on each update, suppresses duplicate outputs, and separates Input & Output panels.
 */
export function attachLindaInteractiveTerminal(): void {
  if (attached) return;
  attached = true;

  const primary = lindaMultiSimPool.getPrimaryAccount();
  pushUniqueOutput('INFO', `Dashboard attached (Master +${primary.phoneNumber.replace(/\D/g, '')})`);

  if (!process.stdin.isTTY) {
    log.info('Non-TTY stdin detected; interactive keypad disabled, status logging active.');
    return;
  }

  rlInstance = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${ANSI.red}${ANSI.bold}linda>${ANSI.reset} `,
  });

  renderDashboard();

  rlInstance.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      renderDashboard();
      return;
    }

    lastInputCommand = trimmed;
    const [cmd, ...rest] = trimmed.split(/\s+/);

    if (cmd === 'clear') {
      uniqueOutputKeys.clear();
      outputFeed.length = 0;
      pushUniqueOutput('INFO', 'Output feed cleared.');
    } else if (cmd === 'status') {
      const accounts = lindaMultiSimPool.listPoolAccounts();
      const online = accounts.filter(a => a.isConnected).length;
      pushUniqueOutput('OK', `Status refreshed: ${online}/${accounts.length} SIM(s) connected.`);
    } else if (cmd === 'p') {
      const targetPhone = (rest[0] || primary.phoneNumber).replace(/\D/g, '');
      try {
        const result = await lindaMultiSimPool.requestAccountPairingCode(targetPhone);
        pushUniqueOutput('PAIR', `+${targetPhone} pairing code: ${result.pairingCode}`);
      } catch (err) {
        pushUniqueOutput('ERR', `Pairing failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (cmd === 'qr') {
      try {
        const qrRes = await lindaMultiSimPool.getAccountQr(primary.phoneNumber);
        const msg = qrRes.isConnected
          ? 'Already connected'
          : qrRes.message || (qrRes.rawQr ? 'QR ready' : 'Pending');
        pushUniqueOutput('INFO', `QR: ${msg}`);
      } catch (err) {
        pushUniqueOutput('ERR', `QR error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (cmd === 's' && rest.length >= 2) {
      const [to, ...msgParts] = rest;
      const best = lindaMultiSimPool.getBestConnectedEngine(primary.phoneNumber);
      if (!best) {
        pushUniqueOutput('WARN', 'No connected WhatsApp engine. Pair first with: p');
      } else {
        try {
          const msgId = await best.engine.sendMessage(to, msgParts.join(' '));
          pushUniqueOutput('SENT', `-> ${to} (id: ${msgId})`);
        } catch (err) {
          pushUniqueOutput('ERR', `Send failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } else if (cmd === 'help') {
      pushUniqueOutput('INFO', 'Commands: status | p [phone] | qr | s <phone> <msg> | clear | help');
    } else {
      pushUniqueOutput('WARN', `Unknown command "${cmd}". Type "help" for options.`);
    }

    renderDashboard();
  });
}
