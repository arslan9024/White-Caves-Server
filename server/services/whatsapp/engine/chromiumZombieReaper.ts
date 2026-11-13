/**
 * chromiumZombieReaper.ts — Scan for orphan chrome.exe PIDs tied to
 * `.linda-sessions` and SIGKILL them.
 *
 * Prevents resource leaks from crashed Puppeteer / whatsapp-web.js sessions
 * that leave zombie Chromium processes behind.
 */

import { execSync } from 'child_process';
import path from 'path';

interface ReapResult {
  pid: number;
  cmdLine: string;
  killed: boolean;
  error?: string;
}

/**
 * Parse the Windows `wmic` output to extract chrome.exe processes whose
 * command line contains the `.linda-sessions` data-dir flag.
 */
function findZombieChromiumPids(sessionMarker: string): { pid: number; cmdLine: string }[] {
  const results: { pid: number; cmdLine: string }[] = [];

  try {
    // wmic is available on all supported Windows versions
    const raw = execSync(
      'wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine /FORMAT:CSV',
      { encoding: 'utf-8', timeout: 10_000 },
    );

    const lines = raw.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      // CSV columns: Node, CommandLine, ProcessId
      const parts = line.split(',');
      if (parts.length < 3) continue;

      const cmdLine = parts.slice(1, -1).join(',');
      const pidStr = parts[parts.length - 1].trim();
      const pid = parseInt(pidStr, 10);

      if (Number.isNaN(pid)) continue;
      if (!cmdLine.includes(sessionMarker)) continue;

      results.push({ pid, cmdLine });
    }
  } catch {
    // wmic unavailable or no chrome processes — not an error
  }

  return results;
}

/**
 * Reap zombie Chromium processes whose data-dir points to `.linda-sessions`.
 *
 * @param sessionsPath  Absolute or relative path that chrome was launched with
 *                      (defaults to `.linda-sessions`).
 * @returns Array of reap results indicating which PIDs were killed.
 */
export async function reapZombieChromium(
  sessionsPath?: string,
): Promise<ReapResult[]> {
  const marker = sessionsPath
    ? path.basename(sessionsPath)
    : '.linda-sessions';

  const zombies = findZombieChromiumPids(marker);
  const results: ReapResult[] = [];

  for (const { pid, cmdLine } of zombies) {
    try {
      process.kill(pid, 'SIGKILL');
      results.push({ pid, cmdLine, killed: true });
    } catch (err) {
      results.push({
        pid,
        cmdLine,
        killed: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
