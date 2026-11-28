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
  clearScreen: '\x1b[2J\x1b[3J\x1b[H', // Clear screen, clear scrollback buffer, home cursor (Windows & POSIX safe)
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
let pairingSelectMode: 'none' | 'category' | 'account_list' | 'manual_phone' = 'none';
let selectedCategory: 'master' | 'employee' | 'servant' | 'all' = 'all';
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
    if (!inputBuffer && pairingSelectMode === 'none') {
      renderDashboard();
    }
  }, 350);
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
  const width = Math.max(90, Math.min(process.stdout.columns || 112, 130));
  const colGap = ' │ ';
  const leftW = Math.floor((width - 3) * 0.40);
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

  const primaryCfg = lindaMultiSimPool.getPrimaryAccount();
  const primaryAcc = accounts.find(a => a.phoneNumber === primaryCfg.phoneNumber) || accounts[0];
  const primaryBadge = primaryAcc?.isConnected ? `${ANSI.green}● READY${ANSI.reset}` : `${ANSI.yellow}○ ${primaryAcc?.engineStatus || 'OFFLINE'}${ANSI.reset}`;

  const filteredAccounts = selectedCategory === 'all'
    ? accounts
    : accounts.filter(a => a.role === selectedCategory);

  const lines: string[] = [
    ANSI.clearScreen,
    `${ANSI.red}${ANSI.bold}╔═ WHITE CAVES CRM & REALTIME (:5001) ═${'═'.repeat(Math.max(0, width - 42))}╗${ANSI.reset}`,
    `${ANSI.red}${ANSI.bold}║${ANSI.reset} ${liveDot} | Up: ${uptime} | RAM: ${memMb}MB | SIMs: ${connectedCount}/${accounts.length} | S:${totalSent} R:${totalRecv}`,
    `${ANSI.red}${ANSI.bold}╚${'═'.repeat(width - 2)}╝${ANSI.reset}`,
  ];

  const renderSection = (title: string, leftRows: string[], rightRows: string[]) => {
    lines.push(`${ANSI.slate}┌─ ${ANSI.white}${ANSI.bold}${title}${ANSI.reset} ${ANSI.slate}${'─'.repeat(Math.max(0, width - title.length - 6))}┐${ANSI.reset}`);
    const maxRows = Math.max(leftRows.length, rightRows.length);
    for (let i = 0; i < maxRows; i++) {
      const l = padAnsi(leftRows[i] || '', leftW);
      const r = rightRows[i] || '';
      lines.push(`${l}${ANSI.slate}${colGap}${ANSI.reset}${r}`);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // ROW 1: SERVER & NODEMON LOGS
  // ══════════════════════════════════════════════════════════════════
  const row1Left = [
    `${ANSI.magenta}${ANSI.bold}Nodemon / Server${ANSI.reset}`,
    `  Host: ${ANSI.white}:${port}${ANSI.reset} ${ANSI.dim}(REST + Socket.io)${ANSI.reset}`,
    `  Watch: ${ANSI.dim}server, prisma, src (data/ ignored)${ANSI.reset}`,
    `  Uptime: ${ANSI.dim}${uptime}${ANSI.reset} | RAM: ${ANSI.white}${memMb}MB${ANSI.reset}`,
  ];
  const maxRightMsg = Math.max(26, rightW - 16);
  const row1Right = [
    `${ANSI.cyan}${ANSI.bold}Nodemon & Server Logs${ANSI.reset} ${ANSI.dim}(${suppressedDuplicates} dupes filtered)${ANSI.reset}`,
    ...(serverFeed.length === 0
      ? [`  ${ANSI.dim}Waiting for server activity...${ANSI.reset}`]
      : serverFeed.slice(-4).map(e => `  ${ANSI.dim}${e.time}${ANSI.reset} ${levelColor(e.level)}[${e.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${truncate(e.message, maxRightMsg)}${ANSI.reset}`)),
  ];
  renderSection('SERVER STATUS & NODEMON LOGS', row1Left, row1Right);

  // ══════════════════════════════════════════════════════════════════
  // ROW 2: INPUT CONTROLS & WHATSAPP POOL
  // ══════════════════════════════════════════════════════════════════
  let row2Left: string[] = [];
  if (pairingSelectMode === 'category') {
    row2Left = [
      `${ANSI.yellow}${ANSI.bold}Role Category Menu:${ANSI.reset}`,
      `  ${ANSI.cyan}[1]${ANSI.reset} Master Closers`,
      `  ${ANSI.cyan}[2]${ANSI.reset} Employees (Agents)`,
      `  ${ANSI.cyan}[3]${ANSI.reset} Hunters (Servants)`,
      `  ${ANSI.cyan}[4]${ANSI.reset} All Accounts`,
      `  ${ANSI.cyan}[5]${ANSI.reset} + Add New Number`,
      `  ${ANSI.cyan}[0]${ANSI.reset} Cancel`,
    ];
  } else if (pairingSelectMode === 'account_list') {
    row2Left = [
      `${ANSI.yellow}${ANSI.bold}Select ${selectedCategory.toUpperCase()} to Pair:${ANSI.reset}`,
      ...filteredAccounts.slice(0, 4).map((a, idx) => `  ${ANSI.cyan}[${idx + 1}]${ANSI.reset} ${a.id} (+${a.phoneNumber.replace(/\D/g, '')})`),
      `  ${ANSI.cyan}[n]${ANSI.reset} + Add New | ${ANSI.cyan}[0]${ANSI.reset} Back`,
    ];
  } else if (pairingSelectMode === 'manual_phone') {
    row2Left = [
      `${ANSI.yellow}${ANSI.bold}New ${selectedCategory.toUpperCase()} Number:${ANSI.reset}`,
      `  Format: 0563616136 or 971...`,
      `  ${ANSI.cyan}[0]${ANSI.reset} Cancel`,
      `  ${ANSI.red}${ANSI.bold}phone>${ANSI.reset} ${ANSI.white}${inputBuffer}${ANSI.reset}`,
    ];
  } else {
    row2Left = [
      `${ANSI.red}${ANSI.bold}Interactive Controls${ANSI.reset}`,
      `  ${ANSI.cyan}[1]${ANSI.reset} Pair/Add   ${ANSI.cyan}[2]${ANSI.reset} Status`,
      `  ${ANSI.cyan}[3]${ANSI.reset} Health     ${ANSI.cyan}[4]${ANSI.reset} Clear`,
      `  ${ANSI.cyan}[6]${ANSI.reset} Cycle Agent (${ANSI.green}${activeAgent}${ANSI.reset})`,
    ];
    if (rawKeypadActive) {
      row2Left.push(`  ${ANSI.red}${ANSI.bold}input>${ANSI.reset} ${ANSI.white}${inputBuffer}${ANSI.reset}`);
    } else {
      row2Left.push(`  ${ANSI.dim}1-6/0 or cmd + Enter${ANSI.reset}`);
    }
  }

  const row2Right = [
    `${ANSI.yellow}${ANSI.bold}WhatsApp Roster${ANSI.reset} ${ANSI.dim}(${connectedCount}/${accounts.length} online)${ANSI.reset} | Primary: ${primaryBadge}`,
    ...accounts.map(acc => {
      const badge = acc.isConnected ? `${ANSI.green}● LIVE${ANSI.reset}` : `${ANSI.yellow}○ OFF ${ANSI.reset}`;
      const roleTag = acc.role === 'master' ? `${ANSI.red}M${ANSI.reset}` : acc.role === 'employee' ? `${ANSI.cyan}E${ANSI.reset}` : `${ANSI.slate}H${ANSI.reset}`;
      return `  ${ANSI.white}${acc.id.padEnd(8)}${ANSI.reset} ${badge} [${roleTag}] +${acc.phoneNumber.replace(/\D/g, '').padEnd(12)} ${ANSI.dim}(S:${acc.messagesSent} R:${acc.messagesReceived})${ANSI.reset}`;
    }),
  ];
  renderSection('INPUT OPTIONS & WHATSAPP FLEET', row2Left, row2Right);

  // ══════════════════════════════════════════════════════════════════
  // ROW 3: AICC-SANCTUM & AGENT OUTPUT
  // ══════════════════════════════════════════════════════════════════
  const row3Left = [
    `${ANSI.green}${ANSI.bold}AICC-Sanctum${ANSI.reset}`,
    `  Active: ${ANSI.green}${ANSI.bold}AI ${activeAgent.toUpperCase()}${ANSI.reset} ${ANSI.dim}([6] to switch)${ANSI.reset}`,
    `  Agents: ${AGENTS.map(a => a === activeAgent ? `${ANSI.green}${a}${ANSI.reset}` : `${ANSI.dim}${a}${ANSI.reset}`).join(', ')}`,
  ];
  const activeFeed = agentFeeds[activeAgent];
  const row3Right = [
    `${ANSI.cyan}${ANSI.bold}AI ${activeAgent.toUpperCase()} Feed${ANSI.reset}`,
    ...(activeFeed.length === 0
      ? [`  ${ANSI.dim}No ${activeAgent} events recorded yet.${ANSI.reset}`]
      : activeFeed.slice(-3).map(e => `  ${ANSI.dim}${e.time}${ANSI.reset} ${levelColor(e.level)}[${e.level.padEnd(4)}]${ANSI.reset} ${ANSI.white}${truncate(e.message, maxRightMsg)}${ANSI.reset}`)),
  ];
  renderSection('AICC-SANCTUM ORCHESTRATION', row3Left, row3Right);

  lines.push(divider);
  rawStdoutWrite(lines.join('\n') + '\n');
  if (rlInstance && !rawKeypadActive) {
    rlInstance.prompt(true);
  }
}

async function handleCommand(trimmed: string): Promise<void> {
  const accounts = lindaMultiSimPool.listPoolAccounts();

  // Mode 1: Select role category
  if (pairingSelectMode === 'category') {
    if (trimmed === '0' || trimmed.toLowerCase() === 'cancel' || trimmed.toLowerCase() === 'q') {
      pairingSelectMode = 'none';
      pushUniqueOutput('INFO', 'Pairing selection cancelled.');
      return;
    }
    if (trimmed === '1') {
      selectedCategory = 'master';
      pairingSelectMode = 'account_list';
      pushUniqueOutput('INFO', 'Master Closers category selected.');
      return;
    }
    if (trimmed === '2') {
      selectedCategory = 'employee';
      pairingSelectMode = 'account_list';
      pushUniqueOutput('INFO', 'Employees / Agents category selected.');
      return;
    }
    if (trimmed === '3') {
      selectedCategory = 'servant';
      pairingSelectMode = 'account_list';
      pushUniqueOutput('INFO', 'Hunters / Servants category selected.');
      return;
    }
    if (trimmed === '4') {
      selectedCategory = 'all';
      pairingSelectMode = 'account_list';
      pushUniqueOutput('INFO', 'All accounts category selected.');
      return;
    }
    if (trimmed === '5') {
      selectedCategory = 'master';
      pairingSelectMode = 'manual_phone';
      pushUniqueOutput('INFO', 'Enter phone number for new Master account:');
      return;
    }
    pushUniqueOutput('WARN', 'Choose [1] Master | [2] Employee | [3] Hunter | [4] All | [5] Manual | [0] Cancel');
    return;
  }

  // Mode 2: Select account to pair from list
  if (pairingSelectMode === 'account_list') {
    if (trimmed === '0' || trimmed.toLowerCase() === 'back') {
      pairingSelectMode = 'category';
      return;
    }
    if (trimmed.toLowerCase() === 'n' || trimmed.toLowerCase() === 'add') {
      pairingSelectMode = 'manual_phone';
      pushUniqueOutput('INFO', `Enter phone number for new ${selectedCategory.toUpperCase()} account:`);
      return;
    }
    const filtered = selectedCategory === 'all' ? accounts : accounts.filter(a => a.role === selectedCategory);
    const selectedIdx = parseInt(trimmed, 10);
    if (!Number.isNaN(selectedIdx) && selectedIdx >= 1 && selectedIdx <= filtered.length) {
      pairingSelectMode = 'none';
      const targetAcc = filtered[selectedIdx - 1];
      const targetPhone = targetAcc.phoneNumber.replace(/\D/g, '');
      pushUniqueOutput('INFO', `Requesting pairing code for [${targetAcc.id}] +${targetPhone}...`);
      try {
        const result = await lindaMultiSimPool.requestAccountPairingCode(targetPhone);
        pushUniqueOutput('PAIR', `🔑 [${targetAcc.id}] +${targetPhone} PAIRING CODE: ${result.pairingCode}`);
      } catch (err) {
        pushUniqueOutput('ERR', `Pairing failed for +${targetPhone}: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }
    pushUniqueOutput('WARN', `Invalid selection "${trimmed}". Choose 1-${filtered.length}, "n" to add, or "0" back.`);
    return;
  }

  // Mode 3: Manual phone entry
  if (pairingSelectMode === 'manual_phone') {
    if (trimmed === '0' || trimmed.toLowerCase() === 'cancel') {
      pairingSelectMode = 'category';
      return;
    }
    const cleanDigits = trimmed.replace(/[:@].*/, '').replace(/\D/g, '');
    const normalizedDigits = cleanDigits.startsWith('05') && cleanDigits.length === 10
      ? `971${cleanDigits.slice(1)}`
      : cleanDigits;

    if (!normalizedDigits || normalizedDigits.length < 9) {
      pushUniqueOutput('WARN', `Invalid phone "${trimmed}". Enter e.g. 0563616136 or 971563616136 (or 0 to cancel)`);
      return;
    }

    pairingSelectMode = 'none';
    const role = selectedCategory === 'all' ? 'master' : selectedCategory;
    const added = lindaMultiSimPool.addAccount({
      phoneNumber: normalizedDigits,
      role,
      displayName: `${role === 'master' ? 'Master Closer' : role === 'employee' ? 'Employee Agent' : 'Hunter'} (+${normalizedDigits})`,
    });
    pushUniqueOutput('OK', `✓ Added [${added.id}] +${normalizedDigits} as ${role.toUpperCase()}. Requesting code...`);

    try {
      const result = await lindaMultiSimPool.requestAccountPairingCode(normalizedDigits);
      pushUniqueOutput('PAIR', `🔑 [${added.id}] +${normalizedDigits} PAIRING CODE: ${result.pairingCode}`);
    } catch (err) {
      pushUniqueOutput('ERR', `Pairing failed for +${normalizedDigits}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  if (/^campaign\b/i.test(trimmed)) {
    try {
      const { handleCampaignCommand } = await import('../services/whatsapp/mdCampaignCommands.js');
      const out = await handleCampaignCommand(trimmed);
      for (const line of (out || '').split('\n').filter(Boolean)) pushUniqueOutput('INFO', `[Linda Campaign] ${line}`);
    } catch (err) {
      pushUniqueOutput('ERR', `Campaign failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }
  const primary = lindaMultiSimPool.getPrimaryAccount();
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const cmd = rawCmd === '1' ? 'pair_menu'
    : rawCmd === '2' ? 'status'
    : rawCmd === '3' ? 'health'
    : rawCmd === '4' ? 'clear'
    : rawCmd === '5' ? 'help'
    : rawCmd === '6' ? 'cycle_agent'
    : rawCmd === '0' ? 'q'
    : rawCmd;

  if (cmd === 'pair_menu') {
    pairingSelectMode = 'category';
    pushUniqueOutput('INFO', 'Select Role: [1] Master | [2] Employee | [3] Hunter | [4] All | [5] + Add Number');
  } else if (cmd === 'cycle_agent') {
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
        if (pairingSelectMode !== 'none') {
          pairingSelectMode = 'none';
          pushUniqueOutput('INFO', 'Menu reset.');
        }
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
      // Instant single-key keypad triggers when buffer is empty (skip in pairing select mode so user can type phone or multi-digits)
      if (pairingSelectMode === 'none' && !inputBuffer && str && ['0', '1', '2', '3', '4', '5', '6'].includes(str)) {
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
    // Don't refresh screen while user is typing in raw keypad mode to avoid wiping input line
    if (!inputBuffer && pairingSelectMode === 'none') {
      renderDashboard();
    }
  }, 2000).unref();
}
