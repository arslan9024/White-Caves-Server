/**
 * mediaCacheAutoPruner.ts — Delete cached media files older than a threshold.
 *
 * WhatsApp sessions accumulate downloaded media (images, videos, documents)
 * in their cache directories. This pruner reclaims disk space by removing
 * files that exceed the configured maximum age.
 */

import fs from 'fs';
import path from 'path';

interface PruneResult {
  scanned: number;
  deleted: number;
  bytesReclaimed: number;
  errors: string[];
}

const DEFAULT_MAX_AGE_DAYS = 7;
const MS_PER_DAY = 86_400_000;

/**
 * Recursively walk a directory tree and collect file paths.
 */
function walkDir(dir: string, files: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Delete cached media files older than `maxAgeDays` from `mediaDir`.
 *
 * @param mediaDir    Absolute path to the media cache directory.
 * @param maxAgeDays  Maximum age in days before a file is pruned (default: 7).
 * @returns Summary of the pruning operation.
 */
export async function pruneMediaCache(
  mediaDir: string,
  maxAgeDays: number = DEFAULT_MAX_AGE_DAYS,
): Promise<PruneResult> {
  const result: PruneResult = { scanned: 0, deleted: 0, bytesReclaimed: 0, errors: [] };

  if (!fs.existsSync(mediaDir)) {
    return result;
  }

  const cutoff = Date.now() - maxAgeDays * MS_PER_DAY;
  const files = walkDir(mediaDir);
  result.scanned = files.length;

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        result.deleted += 1;
        result.bytesReclaimed += stat.size;
      }
    } catch (err) {
      result.errors.push(
        `${filePath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}
