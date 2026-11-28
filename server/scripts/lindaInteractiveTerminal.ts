import os from 'node:os';
import readline from 'node:readline';
import { lindaMultiSimPool } from '../services/whatsapp/LindaMultiSimPoolService.js';

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
  magenta: '\x1b[35m',
  clearScreen: '\x1Bc',             // Full terminal reset on each update
};

type OutputLevel = 'INFO' | 'OK' | 'WARN' | 'ERR' | 'PAIR' | 'SENT' | 'SYS';

interface UniqueOutputEntry {
  key: string;
  level: OutputLevel;
  message: string;
  time: string;
}

const AGENTS = ['linda', 'henry', 'daisy', 'diana', 'zoe'] as const;
type AgentName = (typeof AGENTS)[number];

const MAX_SERVER_OUTPUTS = 8;
const MAX_AGENT_OUTPUTS = 8;
const uniqueServerKeys = new Set<string>();
const serverFeed: UniqueOutputEntry[] = [];
const agentKeys: Record<AgentName, Set<string>> = {
  linda: new Set(),
  henry: new Set(),
  daisy: new Set(),
  diana: new Set(),
  zoe: new Set(),
};
const agentFeeds: Record<AgentName, UniqueOutputEntry[]> = {
  linda: [],
  henry: [],
  daisy: [],
  diana: [],
  zoe: [],
};
let activeAgent: AgentName = 'linda';
let suppressedDuplicates = 0;
let lastInputCommand = 'None';
let lastCommandMs = 0;
let lastEventTime = formatTime();
let tickCount = 0;
let inputBuffer = '';
let rawKeypadActive = false;
let rlInstance: readline.Interface | null = null;
let renderTimer: NodeJS.Timeout | null = null;
const startedAt = Date.now();

// Preserve original stdout/console methods so dashboard rendering never loops
const rawStdoutWrite = process.stdout.write.bind(process.stdout);

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
  return Math.max(64, Math.min(process.stdout.columns || 88, 108));
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
 * Normalizes log lines by stripping ISO timestamps and excess whitespace
 * so identical recurring server/WhatsApp logs are deduplicated.
 */
function normalizeLogMessage(raw: string): string {
  return raw
    .replace(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\]\s*/g, '')
    .replace(/\[(INFO|WARN|ERROR|DEBUG)\]\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function detectAgentLog(message: string): AgentName | null {
  if (/henry/i.test(message)) return 'henry';
  if (/daisy|dasiy/i.test(message)) return 'daisy';
  if (/diana/i.test(message)) return 'diana';
  if (/zoe/i.test(message)) return 'zoe';
  if (/linda|whatsapp|sim|qr|pairing|outreach|campaign/i.test(message)) return 'linda';
  return null;
}

function pushUniqueOutput(level: OutputLevel, message: string): boolean {
  const normalized = normalizeLogMessage(message);
  if (!normalized) return false;
  const key = `${level}:${normalized}`;
  const agent = detectAgentLog(normalized);
  const keySet = agent ? agentKeys[agent] : uniqueServerKeys;
  const feed = agent ? agentFeeds[agent] : serverFeed;
  const maxItems = agent ? MAX_AGENT_OUTPUTS : MAX_SERVER_OUTPUTS;

  if (keySet.has(key)) {
    suppressedDuplicates += 1;
    scheduleRender();
    return false;
  }
  uniqueOutputKeys_add: {
    keySet.add(key);
    lastEventTime = formatTime();
    feed.push({ key, level, message: normalized, time: lastEventTime });
  }
  if (feed.length > maxItems) {
    const removed = feed.shift();
    if (removed) keySet.delete(removed.key);
  }
  scheduleRender();
  return true;
}

function scheduleRender(): void {
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    renderDashboard();
  }, 150);
}

function interceptConsoleLogs(): void {
  const formatArgs = (args: unknown[]) =>
    args.map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a))).join(' ');

  console.log = (...args: unknown[]) => {
    pushUniqueOutput('INFO', formatArgs(args));
  };
  console.info = (...args: unknown[]) => {
    pushUniqueOutput('INFO', formatArgs(args));
  };
  console.warn = (...args: unknown[]) => {
    pushUniqueOutput('WARN', formatArgs(args));
  };
  console.error = (...args: unknown[]) => {
    pushUniqueOutput('ERR', formatArgs(args));
  };
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function padAnsi(str: string, width: number): string {
  const visible = stripAnsi(str).length;
  return visible >= width ? str : str + ' '.repeat(width - visible);
}

function renderDashboard(): void {
  const width = Math.max(88, Math.min(process.stdout.columns || 110, 128));
  const colGap = ' │ ';
  const leftW = Math.floor((width - 3) * 0.33);
  const rightW = width - 3 - leftW;
  const divider = `${ANSI.slate}${'─'.repeat(width)}${ANSI.reset}`;
  const accounts = lindaMultiSimPool.listPoolAccounts();
  const connectedCount = accounts.filter(a => a.isConnected).length;
  const totalSent = accounts.reduce((sum, a) => sum + a.messagesSent, 0);
  const totalRecv = accounts.reduce((sum, a) => sum + a.messagesReceived, 0);
  const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const port = process.env.PORT || '5001';
  const uptime = formatUptime(Date.now() - startedAt);
  const liveDot = tickCount % 2 === 0 ? `${ANSI.green}● LIVE${ANSI.reset}` : `${ANSI.dim}○ LIVE${ANSI.reset}`;

  const leftCol: string[] = [
    `${ANSI.red}${ANSI.bold}▲ INPUT SIDE${ANSI.reset} ${ANSI.dim}(${lastCommandMs}ms)${ANSI.reset}`,
    `${ANSI.cyan}[1]${ANSI.reset} Pair   ${ANSI.cyan}[4]${ANSI.reset} Clear`,
    `${ANSI.cyan}[2]${ANSI.reset} Status ${ANSI.cyan}[5]${ANSI.reset} Help`,
    `${ANSI.cyan}[3]${ANSI.reset} Health ${ANSI.cyan}[6]${ANSI.reset} ${ANSI.green}${activeAgent}${ANSI.reset}`,
    `${ANSI.cyan}[0]${ANSI.reset} Quit   ${ANSI.dim}s <ph> <msg>${ANSI.reset}`,
    `${ANSI.slate}${'─'.repeat(leftW)}${ANSI.reset}`,
    `${ANSI.magenta}${ANSI.bold}◆ NODEMON / WATCHER${ANSI.reset}`,
    `  Boot: ${ANSI.white}${new Date(startedAt).toLocaleTimeString('en-GB', { hour12: false })}${ANSI.reset} ${ANSI.cyan}SIGTERM${ANSI.reset}`,
    `  Watch: ${ANSI.dim}server, prisma, src${ANSI.reset}`,
    `${ANSI.slate}${'─'.repeat(leftW)}${ANSI.reset}`,
    `${ANSI.white}SIMs:${ANSI.reset} ${accounts.map(a => `${a.isConnected ? ANSI.green + '●' : ANSI.yellow + '○'}${ANSI.reset}${a.id.slice(0, 4)}`).join(' ')}`,
  ];
  if (rawKeypadActive) {
    leftCol.push(`${ANSI.red}${ANSI.bold}input>${ANSI.reset} ${ANSI.white}${inputBuffer}${ANSI.reset}`);
  } else {
    leftCol.push(`${ANSI.dim}1-6/0 or cmd + Enter${ANSI.reset}`);
  }

  const rightCol: string[] = [
    `${ANSI.cyan}${ANSI.bold}▼ OUTPUT SIDE${ANSI.reset} ${ANSI.dim}(Accounts & Server)${ANSI.reset}`,
    `${ANSI.yellow}▸ MASTER & HUNTER ACCOUNTS${ANSI.reset} ${ANSI.dim}(${connectedCount}/${accounts.length} online)${ANSI.reset}`,
  ];
  for (const acc of accounts) {
    const badge = acc.isConnected ? `${ANSI.green}● ONLINE ${ANSI.reset}` : `${ANSI.yellow}○ OFFLINE${ANSI.reset}`;
    rightCol.push(`  ${ANSI.white}${acc.id.padEnd(10)}${ANSI.reset} ${ANSI.slate}+${acc.phoneNumber.padEnd(13)}${ANSI.reset} ${badge} ${ANSI.dim}[${acc.engineStatus}]${ANSI.reset}`);
  }
  rightCol.push(`${ANSI.cyan}▸ WHITE CAVES SERVER${ANSI.reset} ${ANSI.dim}(${suppressedDuplicates} dupes suppressed)${ANSI.reset}`);
  const maxRightMsg = Math.max(24, rightW - 16);
  if (serverFeed.length === 0) {
    rightCol.push(`  ${ANSI.dim}No server events yet.${ANSI.reset}`);
  } else {
    for (const entry of serverFeed) {
      rightCol.push(`${ANSI.dim}${entry.time}${ANSI.reset} ${levelColor(entry.level)}[${entry.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${truncate(entry.message, maxRightMsg)}${ANSI.reset}`);
    }
  }

  const lines: string[] = [
    ANSI.clearScreen,
    `${ANSI.red}${ANSI.bold}╔${'═'.repeat(width - 2)}╗${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}║${ANSI.reset} ${ANSI.red}${ANSI.bold}WHITE CAVES SERVER${ANSI.reset} ${liveDot} ${ANSI.dim}:${port} | Up ${uptime} | ${memMb}MB | SIMs ${connectedCount}/${accounts.length} | S:${totalSent} R:${totalRecv}${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}╚${'═'.repeat(width - 2)}╝${ANSI.reset}`,
  ];

  const rows = Math.max(leftCol.length, rightCol.length);
  for (let i = 0; i < rows; i++) {
    const l = padAnsi(leftCol[i] || '', leftW);
    const r = rightCol[i] || '';
    lines.push(`${l}${ANSI.slate}${colGap}${ANSI.reset}${r}`);
  }

  // Footer Row: AICC-SANCTUM (Inputs & Outputs)
  lines.push(divider);
  lines.push(
    `${ANSI.green}${ANSI.bold}◆ AICC-SANCTUM${ANSI.reset} ${ANSI.dim}(COO: AI Zoe | 12 Floors | CRM :3000 | Web :3001 | Aegis :3333)${ANSI.reset}  ${ANSI.cyan}▸ AI ${activeAgent.toUpperCase()} OUTPUT${ANSI.reset} ${ANSI.dim}([6] switch)${ANSI.reset}`
  );
  const activeFeed = agentFeeds[activeAgent];
  const maxFooterMsg = Math.max(30, width - 18);
  if (activeFeed.length === 0) {
    lines.push(`  ${ANSI.dim}No ${activeAgent} events yet.${ANSI.reset}`);
  } else {
    for (const entry of activeFeed) {
      lines.push(`  ${ANSI.dim}${entry.time}${ANSI.reset} ${levelColor(entry.level)}[${entry.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${truncate(entry.message, maxFooterMsg)}${ANSI.reset}`);
    }
  }
  lines.push(divider);

  rawStdoutWrite(lines.join('\n') + '\n');
  if (rlInstance && !rawKeypadActive) {
    rlInstance.prompt(true);
  }
}

async function handleCommand(trimmed: string): Promise<void> {
  const primary = lindaMultiSimPool.getPrimaryAccount();
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const cmd = rawCmd === '1' ? 'p'
    : rawCmd === '2' ? 'status'
    : rawCmd === '3' ? 'health'
    : rawCmd === '4' ? 'clear'
    : rawCmd === '5' ? 'help'
    : rawCmd === '6' ? 'cycle_agent'
    : rawCmd === '0' ? 'q'
    : rawCmd;

  if (cmd === 'cycle_agent') {
    const nextIdx = (AGENTS.indexOf(activeAgent) + 1) % AGENTS.length;
    activeAgent = AGENTS[nextIdx];
  } else if (cmd === 'a' && rest[0]) {
    const candidate = rest[0].toLowerCase() as AgentName;
    if (AGENTS.includes(candidate)) {
      activeAgent = candidate;
    } else {
      pushUniqueOutput('WARN', `Unknown agent "${rest[0]}". Choose: ${AGENTS.join(', ')}`);
    }
  } else if (cmd === 'clear') {
    uniqueServerKeys.clear();
    serverFeed.length = 0;
    for (const ag of AGENTS) {
      agentKeys[ag].clear();
      agentFeeds[ag].length = 0;
    }
    suppressedDuplicates = 0;
    pushUniqueOutput('INFO', 'Server & Agent output feeds cleared.');
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
      const msg = qrRes.isConnected ? 'Already connected' : qrRes.message || (qrRes.rawQr ? 'QR ready' : 'Pending');
      pushUniqueOutput('INFO', `QR: ${msg}`);
    } catch (err) {
      pushUniqueOutput('ERR', `QR error: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (cmd === 's' && rest.length >= 2) {
    const [to, ...msgParts] = rest;
    const best = lindaMultiSimPool.getBestConnectedEngine(primary.phoneNumber);
    if (!best) {
      pushUniqueOutput('WARN', 'No connected WhatsApp engine. Press [1] to pair first.');
    } else {
      try {
        const msgId = await best.engine.sendMessage(to, msgParts.join(' '));
        pushUniqueOutput('SENT', `-> ${to} (id: ${msgId})`);
      } catch (err) {
        pushUniqueOutput('ERR', `Send failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else if (cmd === 'help') {
    pushUniqueOutput('INFO', 'Choices: [1] Pair | [2] Status | [3] Health | [4] Clear | s <phone> <msg> | sim | qr');
  } else {
    pushUniqueOutput('WARN', `Unknown choice "${rawCmd}". Press [5] for help.`);
  }
}

export function getServerStatusSnapshot(): string {
  const accounts = lindaMultiSimPool.listPoolAccounts();
  const online = accounts.filter(a => a.isConnected).length;
  const totalSent = accounts.reduce((s, a) => s + a.messagesSent, 0);
  const totalRecv = accounts.reduce((s, a) => s + a.messagesReceived, 0);
  const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  return [
    `*WHITE CAVES SERVER* (:5001)`,
    `Up: ${formatUptime(Date.now() - startedAt)} | RAM: ${memMb}MB`,
    `SIMs: ${online}/${accounts.length} online | S:${totalSent} R:${totalRecv}`,
    `Dupes suppressed: ${suppressedDuplicates}`,
  ].join('\n');
}

export function getAgentOutputSnapshot(agent: AgentName): string {
  const feed = agentFeeds[agent] || [];
  if (feed.length === 0) {
    return `*AI ${agent.toUpperCase()}*: No recent unique events.`;
  }
  const lines = feed.slice(-5).map(e => `• [${e.time}] [${e.level}] ${e.message}`);
  return `*AI ${agent.toUpperCase()} OUTPUT*\n${lines.join('\n')}`;
}

/**
 * Interactive Server Terminal Dashboard for `npm run dev` / `npm run dev:dashboard`.
 * Intercepts console logs, deduplicates repeating lines, clears terminal on update, and separates Input & Output panels.
 */
export function attachLindaInteractiveTerminal(): void {
  if (attached) return;
  attached = true;

  interceptConsoleLogs();
  const primary = lindaMultiSimPool.getPrimaryAccount();
  pushUniqueOutput('SYS', `Server booted on :${process.env.PORT || '5001'} (Master +${primary.phoneNumber.replace(/\D/g, '')})`);

  if (process.stdin.isTTY) {
    try {
      readline.emitKeypressEvents(process.stdin);
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(true);
        rawKeypadActive = true;
      }
    } catch {
      rawKeypadActive = false;
    }
  }

  if (rawKeypadActive) {
    process.stdin.resume();
    process.stdin.on('keypress', async (str: string, key: readline.Key) => {
      if (key?.ctrl && key.name === 'c') {
        process.stdin.setRawMode?.(false);
        process.exit(0);
      }
      if (key?.name === 'escape') {
        inputBuffer = '';
        renderDashboard();
        return;
      }
      if (key?.name === 'backspace') {
        inputBuffer = inputBuffer.slice(0, -1);
        renderDashboard();
        return;
      }
      if (key?.name === 'return' || key?.name === 'enter') {
        const trimmed = inputBuffer.trim();
        inputBuffer = '';
        if (trimmed) {
          const t0 = Date.now();
          lastInputCommand = trimmed;
          await handleCommand(trimmed);
          lastCommandMs = Date.now() - t0;
        }
        renderDashboard();
        return;
      }
      // Instant single-key keypad triggers when buffer is empty
      if (!inputBuffer && str && ['0', '1', '2', '3', '4', '5', '6'].includes(str)) {
        const t0 = Date.now();
        lastInputCommand = `[key ${str}]`;
        await handleCommand(str);
        lastCommandMs = Date.now() - t0;
        renderDashboard();
        return;
      }
      if (str && !key?.ctrl && !key?.meta) {
        inputBuffer += str;
        renderDashboard();
      }
    });
  } else {
    rlInstance = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${ANSI.red}${ANSI.bold}choice>${ANSI.reset} `,
    });

    rlInstance.on('line', async (line: string) => {
      const t0 = Date.now();
      const trimmed = line.trim();
      if (!trimmed) {
        renderDashboard();
        return;
      }
      lastInputCommand = trimmed;
      await handleCommand(trimmed);
      lastCommandMs = Date.now() - t0;
      renderDashboard();
    });
  }

  renderDashboard();
  setInterval(() => {
    tickCount += 1;
    renderDashboard();
  }, 1000).unref();
}
