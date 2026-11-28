/**
 * liveLogBuffer.ts — Ring buffer capturing the last N deduplicated live console/nodemon
 * log lines for the Terminal Dashboard footer panel (AEG-042 <350 lines).
 */

import { inspect } from 'node:util';

const MAX_LOG_LINES = 12;
const logRing: string[] = [];
let installed = false;

function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  try {
    return inspect(arg, { depth: 3, breakLength: Infinity, compact: true });
  } catch {
    return String(arg);
  }
}

function isNoisyDuplicate(raw: string): boolean {
  if (raw.includes('Due dispatch summary due=0 dispatched=0 failed=0')) return true;
  if (raw.includes('Pairing code generated for ')) return true;
  if (raw.includes('Pairing code not ready yet')) return true;
  return false;
}

function pushLogLine(args: unknown[]): void {
  const raw = args
    .map(formatLogArg)
    .join(' ')
    .replace(/\r?\n/g, ' ')
    .trim();
  if (!raw || isNoisyDuplicate(raw)) return;
  const last = logRing[logRing.length - 1];
  if (last && last.replace(/^\d{2}:\d{2}:\d{2}\s*/, '') === raw.replace(/^\d{2}:\d{2}:\d{2}\s*/, '')) {
    return;
  }
  logRing.push(raw);
  if (logRing.length > MAX_LOG_LINES) {
    logRing.shift();
  }
}

export function installLiveLogCapture(): void {
  if (installed) return;
  installed = true;

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args: unknown[]) => {
    pushLogLine(args);
    origLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    pushLogLine(args);
    origWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    pushLogLine(args);
    origError(...args);
  };
}

export function getLiveLogLines(limit = MAX_LOG_LINES): string[] {
  return logRing.slice(-limit);
}

export function formatLiveLogFooterPanel(width = 100, limit = MAX_LOG_LINES): string[] {
  installLiveLogCapture();
  const lines = getLiveLogLines(limit);
  const header = `LIVE NODEMON / SERVER LOGS (last ${limit} lines)`;
  if (lines.length === 0) {
    return [header, '  (waiting for live server logs...)'];
  }
  const maxLen = Math.max(20, width - 4);
  return [
    header,
    ...lines.map(line => `  ${line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line}`),
  ];
}
