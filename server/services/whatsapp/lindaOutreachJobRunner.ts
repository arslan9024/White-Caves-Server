/**
 * lindaOutreachJobRunner.ts
 * White Caves Real Estate LLC — Async Background Outreach Job Runner & Boot Auto-Reconnect
 * Prevents HTTP timeouts during 35–65s Gaussian anti-ban paced multi-SIM dispatches
 * and restores already-paired LocalAuth sessions safely on server boot.
 * Standard: AEGIS Single Purpose File Law (< 350 lines, AEG-042).
 */

import fs from 'node:fs';
import path from 'node:path';
import { LINDA_ENABLED, LINDA_SESSIONS_PATH } from '../../config/env.js';
import { createLogger } from '../../utils/logger.js';
import { getSocketServer } from '../socketServer.js';
import { lindaMultiSimPool, normalizePhoneDigits } from './LindaMultiSimPoolService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';

const log = createLogger('LindaOutreachJobRunner');

export type OutreachJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface LindaOutreachJobRecord {
  jobId: string;
  label: string;
  status: OutreachJobStatus;
  totalRecipients: number;
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  errorCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: unknown;
}

const jobsMap = new Map<string, LindaOutreachJobRecord>();
const JOB_HISTORY_LIMIT = 50;

function trimJobsHistory() {
  if (jobsMap.size <= JOB_HISTORY_LIMIT) return;
  const oldestKeys = Array.from(jobsMap.keys()).slice(0, jobsMap.size - JOB_HISTORY_LIMIT);
  for (const key of oldestKeys) jobsMap.delete(key);
}

/**
 * Enqueue a long-running live WhatsApp outreach task in the background so HTTP endpoints
 * respond immediately (202 Accepted) while anti-ban pacing executes safely.
 */
export function startBackgroundOutreachJob<T extends { sent?: number; sentCount?: number; total?: number; totalRecipients?: number }>(input: {
  label: string;
  totalRecipients: number;
  runner: () => Promise<T>;
}): LindaOutreachJobRecord {
  const jobId = `linda-job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const record: LindaOutreachJobRecord = {
    jobId,
    label: input.label,
    status: 'queued',
    totalRecipients: input.totalRecipients,
    processedCount: 0,
    sentCount: 0,
    skippedCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  };

  jobsMap.set(jobId, record);
  trimJobsHistory();

  void (async () => {
    record.status = 'running';
    record.startedAt = new Date().toISOString();
    try {
      const result = await input.runner();
      const sent = Number(result?.sentCount ?? result?.sent ?? 0);
      const total = Number(result?.totalRecipients ?? result?.total ?? input.totalRecipients);
      record.sentCount = sent;
      record.processedCount = total;
      record.skippedCount = Math.max(0, total - sent);
      record.result = result;
      record.status = 'completed';
      record.completedAt = new Date().toISOString();

      getSocketServer()?.emitLindaCampaignTelemetry({
        campaignId: jobId,
        campaignName: record.label,
        status: 'completed',
        totalDispatched: sent,
        skipped: record.skippedCount,
        dailyTarget: total,
        timestamp: record.completedAt,
      });
    } catch (err) {
      record.status = 'failed';
      record.errorCount += 1;
      record.error = err instanceof Error ? err.message : String(err);
      record.completedAt = new Date().toISOString();
      log.error(`Background outreach job ${jobId} failed:`, record.error);
    }
  })();

  return record;
}

export function getOutreachJob(jobId: string): LindaOutreachJobRecord | undefined {
  return jobsMap.get(jobId);
}

export function listOutreachJobs(limit = 20): LindaOutreachJobRecord[] {
  return Array.from(jobsMap.values()).reverse().slice(0, Math.max(1, Math.min(limit, 50)));
}

/**
 * Detect whether a LocalAuth profile folder has an existing Chromium Default profile
 * indicating the SIM was previously initialized/paired.
 */
function hasSavedLocalAuthProfile(phoneNumber: string): boolean {
  const digits = normalizePhoneDigits(phoneNumber);
  const sessionsBase = path.resolve(
    process.cwd(),
    process.env.LINDA_SESSIONS_PATH || LINDA_SESSIONS_PATH || './.linda-sessions'
  );
  return fs.existsSync(path.join(sessionsBase, `session-${digits}`, 'Default'));
}

/**
 * Non-blocking boot helper: reconnects Primary Master (+971505760056) first and any
 * already-paired Hunter SIMs sequentially with stagger so Chrome never spikes CPU on boot.
 */
export function startLindaPairedSessionAutoReconnect(): void {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') return;
  if (!LINDA_ENABLED || process.env.LINDA_AUTO_RECONNECT === 'false') {
    log.info('Linda auto-reconnect disabled by environment configuration.');
    return;
  }

  const accounts = lindaMultiSimPool.listPoolAccounts();
  const autoReconnectAll = process.env.LINDA_AUTO_RECONNECT_HUNTERS === 'true';
  const candidates = accounts.filter(acc => {
    if (!hasSavedLocalAuthProfile(acc.phoneNumber)) return false;
    if (normalizePhoneDigits(acc.phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE)) return true;
    return autoReconnectAll;
  });

  if (candidates.length === 0) {
    log.info('No saved Linda LocalAuth profiles eligible for auto-reconnect on boot.');
    return;
  }

  const staggerMs = Math.max(2000, Number(process.env.ACCOUNT_SEQUENTIAL_DELAY || 5000));
  void (async () => {
    for (let i = 0; i < candidates.length; i++) {
      const acc = candidates[i];
      if (i > 0) await new Promise(resolve => setTimeout(resolve, staggerMs));
      try {
        log.info(`Auto-reconnecting saved Linda WhatsApp session ${acc.phoneNumber} (${acc.displayName})...`);
        await lindaMultiSimPool.connectAccount(acc.phoneNumber);
      } catch (err) {
        log.warn(`Auto-reconnect failed for ${acc.phoneNumber}:`, err instanceof Error ? err.message : err);
      }
    }
  })();
}
