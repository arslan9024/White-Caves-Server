#!/usr/bin/env node
/**
 * TypeScript @ts-nocheck & `any` Ratchet Check
 *
 * Ensures no new `@ts-nocheck` directives or explicit `any` type annotations
 * are introduced into `server/`.
 *
 * Usage:
 *   node scripts/check-ts-ratchet.mjs           # Verify against baseline
 *   node scripts/check-ts-ratchet.mjs --update  # Update baseline
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const BASELINE_PATH = path.join(__dirname, 'ts-ratchet-baseline.json');

const TS_EXTS = new Set(['.ts', '.tsx']);
const TS_NOCHECK_RE = /@ts-nocheck/g;
const ANY_RE = /(?::\s*any\b|\bas\s+any\b|<any>)/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (TS_EXTS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function measure() {
  const files = walk(SERVER_DIR);
  let tsNocheckCount = 0;
  let anyCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const nocheckMatches = content.match(TS_NOCHECK_RE);
    if (nocheckMatches) tsNocheckCount += nocheckMatches.length;

    const anyMatches = content.match(ANY_RE);
    if (anyMatches) anyCount += anyMatches.length;
  }

  return {
    tsNocheckCount,
    anyCount,
    filesScanned: files.length,
    updatedAt: new Date().toISOString(),
  };
}

const current = measure();
const isUpdate = process.argv.includes('--update');

if (isUpdate || !fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n', 'utf8');
  console.log(
    `[ts-ratchet] Baseline ${isUpdate ? 'updated' : 'created'}: @ts-nocheck=${current.tsNocheckCount}, any=${current.anyCount} (${current.filesScanned} files)`
  );
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
let failed = false;

if (current.tsNocheckCount > baseline.tsNocheckCount) {
  console.error(
    `[ts-ratchet] FAIL: @ts-nocheck count increased from ${baseline.tsNocheckCount} to ${current.tsNocheckCount}`
  );
  failed = true;
}

if (current.anyCount > baseline.anyCount) {
  console.error(
    `[ts-ratchet] FAIL: explicit 'any' count increased from ${baseline.anyCount} to ${current.anyCount}`
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  `[ts-ratchet] PASS: @ts-nocheck=${current.tsNocheckCount}/${baseline.tsNocheckCount}, any=${current.anyCount}/${baseline.anyCount} (${current.filesScanned} files)`
);
