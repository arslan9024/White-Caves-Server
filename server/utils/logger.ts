/**
 * Structured Logger — White Caves CRM Server
 * Features:
 *  - Scoped contexts & child loggers (`log.child('SubModule')`)
 *  - ANSI colorized console output in TTY dev terminals (auto-disabled in CI/tests/NO_COLOR)
 *  - Safe Error & circular-reference metadata serialization
 *  - Automatic PII/secret redaction (Bearer tokens, emails, phone numbers)
 *  - Built-in performance timer (`const end = log.time('op'); ... end();`)
 *  - HTTP request helper (`log.http(method, path, status, durationMs)`)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Query strings can contain identity numbers even on requests rejected by a route.
export function requestLogPath(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const VALID_LOG_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error']);

function resolveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel && VALID_LOG_LEVELS.has(envLevel)) {
    return envLevel as LogLevel;
  }
  if (envLevel) {
    console.warn(
      `[Logger] Invalid LOG_LEVEL "${envLevel}". Valid values: debug, info, warn, error. Falling back to default.`
    );
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const currentLevel: LogLevel = resolveLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

const useColors =
  Boolean(process.stdout?.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.NODE_ENV !== 'test' &&
  !process.env.VITEST;

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: ANSI.magenta,
  info: ANSI.green,
  warn: ANSI.yellow,
  error: ANSI.red,
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function redactString(value: string): string {
  return value
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email redacted]')
    .replace(/(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)/g, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 8 ? `***${digits.slice(-4)}` : match;
    });
}

function safeSerializeMeta(meta: unknown): string {
  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(meta, (_key, val: unknown) => {
      if (val instanceof Error) {
        return {
          name: val.name,
          message: redactString(val.message),
          ...(val.stack ? { stack: val.stack.split('\n').slice(0, 4).join(' | ') } : {}),
        };
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      if (typeof val === 'string') {
        return redactString(val);
      }
      return val;
    });
    return json ?? String(meta);
  } catch {
    return '[Unserializable Meta]';
  }
}

function formatMessage(level: LogLevel, context: string, message: string, meta?: unknown): string {
  const ts = formatTimestamp();
  const lvl = level.toUpperCase();
  const safeMsg = redactString(message);
  const metaStr = meta !== undefined ? ` ${safeSerializeMeta(meta)}` : '';

  if (useColors) {
    const color = LEVEL_COLORS[level];
    return `${ANSI.dim}[${ts}]${ANSI.reset} ${color}[${lvl}]${ANSI.reset} ${ANSI.cyan}[${context}]${ANSI.reset} ${safeMsg}${metaStr}`;
  }
  return `[${ts}] [${lvl}] [${context}] ${safeMsg}${metaStr}`;
}

export interface ScopedLogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  child(subContext: string): ScopedLogger;
  time(label: string): (meta?: unknown) => number;
  http(method: string, url: string, status: number, durationMs: number): void;
}

/**
 * Create a logger scoped to a module/context
 * @example
 * const log = createLogger('Auth');
 * log.info('User logged in', { userId: '123' });
 */
export function createLogger(context: string): ScopedLogger {
  return {
    debug(message: string, meta?: unknown) {
      if (shouldLog('debug')) console.debug(formatMessage('debug', context, message, meta));
    },
    info(message: string, meta?: unknown) {
      if (shouldLog('info')) console.log(formatMessage('info', context, message, meta));
    },
    warn(message: string, meta?: unknown) {
      if (shouldLog('warn')) console.warn(formatMessage('warn', context, message, meta));
    },
    error(message: string, meta?: unknown) {
      if (shouldLog('error')) console.error(formatMessage('error', context, message, meta));
    },
    child(subContext: string) {
      return createLogger(`${context}:${subContext}`);
    },
    time(label: string) {
      const start = performance.now();
      return (meta?: unknown) => {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        if (shouldLog('debug')) {
          console.debug(formatMessage('debug', context, `${label} (${durationMs}ms)`, meta));
        }
        return durationMs;
      };
    },
    http(method: string, url: string, status: number, durationMs: number) {
      const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      if (shouldLog(level)) {
        const msg = `${method.toUpperCase()} ${requestLogPath(url)} -> ${status} (${Math.round(durationMs)}ms)`;
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        fn(formatMessage(level, context, msg));
      }
    },
  };
}

/** Default server logger */
const logger = createLogger('Server');

export { logger };

export default logger;
