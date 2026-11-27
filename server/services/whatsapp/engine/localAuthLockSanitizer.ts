/**
 * localAuthLockSanitizer.ts — Delete stale Chromium singleton lock files
 * before Puppeteer launch to prevent "profile in use" errors.
 *
 * Targets: SingletonLock, SingletonCookie, SingletonSocket
 */

import fs from 'fs';
import path from 'path';

const LOCK_FILES = [
  'SingletonLock',
  'SingletonCookie',
  'SingletonSocket',
  'lockfile',
  'DevToolsActivePort',
  path.join('Default', 'LOCK'),
] as const;

interface SanitizeResult {
  file: string;
  existed: boolean;
  deleted: boolean;
  error?: string;
}

/**
 * Remove stale Chromium singleton lock files from a session directory.
 *
 * Call this **before** `client.initialize()` in whatsapp-web.js to avoid the
 * "profile directory already in use" error after a crash.
 *
 * @param sessionDir  Absolute path to the Chromium user-data directory
 *                    (e.g. `.linda-sessions/session-nina`).
 * @returns Per-file results showing what was found and removed.
 */
export function sanitizeSessionLocks(sessionDir: string): SanitizeResult[] {
  const results: SanitizeResult[] = [];

  for (const lockFile of LOCK_FILES) {
    const fullPath = path.join(sessionDir, lockFile);
    const result: SanitizeResult = { file: lockFile, existed: false, deleted: false };

    try {
      const stat = fs.lstatSync(fullPath);
      result.existed = true;

      // On Windows SingletonLock is a regular file; on Linux it is a symlink
      if (stat.isSymbolicLink() || stat.isFile()) {
        fs.unlinkSync(fullPath);
        result.deleted = true;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // File does not exist — expected after a clean shutdown
      } else {
        result.error = err instanceof Error ? err.message : String(err);
      }
    }

    results.push(result);
  }

  return results;
}
