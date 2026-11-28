import os from 'node:os';
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
  clearScreen: '\x1Bc',             // Full terminal reset on each update
};

type OutputLevel = 'INFO' | 'OK' | 'WARN' | 'ERR' | 'PAIR' | 'SENT' | 'SYS';

interface UniqueOutputEntry {
  key: string;
  level: OutputLevel;
  message: string;
  time: string;
}

const MAX_UNIQUE_OUTPUTS = 10;
const uniqueOutputKeys = new Set<string>();
const outputFeed: UniqueOutputEntry[] = [];
let suppressedDuplicates = 0;
let lastInputCommand = 'None';
let lastCommandMs = 0;
let rlInstance: readline.Interface | null = null;
const startedAt = Date.now();

function formatTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

function getTermWidth(): number {
  return Math.max(60, Math.min(process.stdout.columns || 80, 100));
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
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
    case 'SYS':
      return ANSI.cyan;
    default:
      return ANSI.slate;
  }
}

/**
 * Adds an output entry only if its (level + message) key has not already been recorded.
 * Increments `suppressedDuplicates` when identical outputs are skipped.
 */
function pushUniqueOutput(level: OutputLevel, message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;
  const key = `${level}:${normalized}`;
  if (uniqueOutputKeys.has(key)) {
    suppressedDuplicates += 1;
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
  const width = getTermWidth();
  const divider = `${ANSI.slate}${'─'.repeat(width)}${ANSI.reset}`;
  const primary = lindaMultiSimPool.getPrimaryAccount();
  const accounts = lindaMultiSimPool.listPoolAccounts();
  const connectedCount = accounts.filter(a => a.isConnected).length;
  const totalSent = accounts.reduce((sum, a) => sum + a.messagesSent, 0);
  const totalRecv = accounts.reduce((sum, a) => sum + a.messagesReceived, 0);
  const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const port = process.env.PORT || '5001';
  const uptime = formatUptime(Date.now() - startedAt);

  const lines: string[] = [
    ANSI.clearScreen,
    `${ANSI.red}${ANSI.bold}╔${'═'.repeat(width - 2)}╗${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}║${ANSI.reset}  ${ANSI.white}${ANSI.bold}WHITE CAVES — AI LINDA SERVER DASHBOARD${ANSI.reset} ${ANSI.dim}(:${port} | ${process.version} | PID ${process.pid})${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}╚${'═'.repeat(width - 2)}╝${ANSI.reset}`,
    `${ANSI.cyan}${ANSI.bold}▼ OUTPUT DASHBOARD${ANSI.reset} ${ANSI.slate}|${ANSI.reset} Up: ${ANSI.white}${uptime}${ANSI.reset} ${ANSI.slate}|${ANSI.reset} RAM: ${ANSI.white}${memMb}MB${ANSI.reset} ${ANSI.slate}|${ANSI.reset} SIMs: ${ANSI.green}${connectedCount}/${accounts.length}${ANSI.reset} ${ANSI.slate}|${ANSI.reset} S:${ANSI.white}${totalSent}${ANSI.reset} R:${ANSI.white}${totalRecv}${ANSI.reset}`,
    divider,
  ];

  for (const acc of accounts) {
    const connBadge = acc.isConnected
      ? `${ANSI.green}● ONLINE ${ANSI.reset}`
      : `${ANSI.yellow}○ OFFLINE${ANSI.reset}`;
    lines.push(
      `  ${ANSI.white}${acc.id.padEnd(10)}${ANSI.reset} ${ANSI.slate}+${acc.phoneNumber.padEnd(14)}${ANSI.reset} ${connBadge} ${ANSI.dim}[${acc.engineStatus}]${ANSI.reset}`
    );
  }

  lines.push(divider);
  lines.push(
    `${ANSI.cyan}${ANSI.bold}  UNIQUE OUTPUTS${ANSI.reset} ${ANSI.dim}(max ${MAX_UNIQUE_OUTPUTS} | ${suppressedDuplicates} duplicates suppressed)${ANSI.reset}`
  );

  if (outputFeed.length === 0) {
    lines.push(`  ${ANSI.dim}No unique events yet.${ANSI.reset}`);
  } else {
    const maxMsgLen = Math.max(24, width - 20);
    for (const entry of outputFeed) {
      const color = levelColor(entry.level);
      lines.push(
        `  ${ANSI.dim}${entry.time}${ANSI.reset} ${color}[${entry.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${truncate(entry.message, maxMsgLen)}${ANSI.reset}`
      );
    }
  }

  lines.push('');
  lines.push(
    `${ANSI.red}${ANSI.bold}▲ INPUT DASHBOARD${ANSI.reset} ${ANSI.slate}|${ANSI.reset} Last: ${ANSI.yellow}${truncate(lastInputCommand, 24)}${ANSI.reset} ${ANSI.dim}(${lastCommandMs}ms)${ANSI.reset}`
  );
  lines.push(divider);
  lines.push(
    `  ${ANSI.cyan}status${ANSI.reset} | ${ANSI.cyan}health${ANSI.reset} | ${ANSI.cyan}sim${ANSI.reset} | ${ANSI.cyan}mem${ANSI.reset} | ${ANSI.cyan}env${ANSI.reset} | ${ANSI.cyan}p [phone]${ANSI.reset} | ${ANSI.cyan}qr${ANSI.reset} | ${ANSI.cyan}s <phone> <msg>${ANSI.reset} | ${ANSI.cyan}clear${ANSI.reset} | ${ANSI.cyan}help${ANSI.reset}`
  );
  lines.push(divider);

  process.stdout.write(lines.join('\n') + '\n');
  if (rlInstance) {
    rlInstance.prompt(true);
  }
}

/**
 * Interactive Linda Terminal Dashboard for `npm run dev` / `npm run dev:dashboard`.
 * Clears terminal on each restart/update, suppresses duplicate outputs, and separates Input & Output panels.
 */
export function attachLindaInteractiveTerminal(): void {
  if (attached) return;
  attached = true;

  const primary = lindaMultiSimPool.getPrimaryAccount();
  pushUniqueOutput('SYS', `Server booted on :${process.env.PORT || '5001'} (Master +${primary.phoneNumber.replace(/\D/g, '')})`);

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
    const t0 = Date.now();
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
      suppressedDuplicates = 0;
      pushUniqueOutput('INFO', 'Output feed cleared.');
    } else if (cmd === 'status') {
      const accounts = lindaMultiSimPool.listPoolAccounts();
      const online = accounts.filter(a => a.isConnected).length;
      pushUniqueOutput('OK', `Status: ${online}/${accounts.length} SIM(s) connected.`);
    } else if (cmd === 'health') {
      const mem = process.memoryUsage();
      pushUniqueOutput('SYS', `Up ${formatUptime(Date.now() - startedAt)} | RSS ${Math.round(mem.rss / 1024 / 1024)}MB | Heap ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Load ${os.loadavg()[0].toFixed(2)}`);
    } else if (cmd === 'sim') {
      const accounts = lindaMultiSimPool.listPoolAccounts();
      pushUniqueOutput('INFO', accounts.map(a => `${a.id}:${a.isConnected ? 'ON' : 'OFF'}(S${a.messagesSent}/R${a.messagesReceived})`).join(' | '));
    } else if (cmd === 'mem') {
      const mem = process.memoryUsage();
      pushUniqueOutput('SYS', `RSS=${Math.round(mem.rss / 1024 / 1024)}MB HeapUsed=${Math.round(mem.heapUsed / 1024 / 1024)}MB HeapTotal=${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
    } else if (cmd === 'env') {
      pushUniqueOutput('SYS', `NODE_ENV=${process.env.NODE_ENV || 'development'} PORT=${process.env.PORT || '5001'} DASHBOARD=${process.env.LINDA_TERMINAL_DASHBOARD || 'false'}`);
    } else if (cmd === 'uptime') {
      pushUniqueOutput('SYS', `Process uptime: ${formatUptime(Date.now() - startedAt)}`);
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
      pushUniqueOutput('INFO', 'Commands: status | health | sim | mem | env | uptime | p [phone] | qr | s <phone> <msg> | clear');
    } else if (cmd === 'q' || cmd === 'exit') {
      pushUniqueOutput('WARN', 'Detaching interactive dashboard...');
      rlInstance?.close();
      rlInstance = null;
      return;
    } else {
      pushUniqueOutput('WARN', `Unknown command "${cmd}". Type "help" for options.`);
    }

    lastCommandMs = Date.now() - t0;
    renderDashboard();
  });
}
