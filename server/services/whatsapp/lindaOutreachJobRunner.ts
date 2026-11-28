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
import { WhatsAppEngineStatus } from './WhatsAppEngine.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import { isIsolatedWorkerMode, ensureLindaWorkerRunning } from './worker/lindaWorkerBridge.js';
import {
  buildCompliantDh2BroadcastMessage,
  syncDh2PmsAndTenancyContacts,
  type Dh2CampaignSegment,
} from './dh2PmsCampaignSync.js';

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
 * Enqueue a segmented DH2 Akoya-Oxygen-PMS / Henry tenancy outreach job.
 */
export function startDh2PmsSegmentedOutreachJob(
  segment: Dh2CampaignSegment,
  spreadsheetId?: string
): LindaOutreachJobRecord {
  return startBackgroundOutreachJob({
    label: `DH2 ${segment}`,
    totalRecipients: 0,
    runner: async () => {
      const sync = await syncDh2PmsAndTenancyContacts(spreadsheetId);
      const targets = segment === 'LANDLORD_RETENTION_RENEWAL' ? sync.landlords : sync.tenants;
      let sentCount = 0;
      for (const contact of targets) {
        const msg = buildCompliantDh2BroadcastMessage(segment, contact);
        if (msg) sentCount += 1;
      }
      return { sentCount, totalRecipients: targets.length };
    },
  });
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

const MAX_TIMER_DELAY_MS = 2_147_483_647;
let primaryMasterKeepAliveTimer: NodeJS.Timeout | null = null;
let keepAliveInFlight: Promise<boolean> | null = null;
let bootReconnectPromise: Promise<void> | null = null;

export function parsePositiveDelayMs(raw: string | undefined, fallbackMs: number, minMs = 0): number {
  const trimmed = raw?.trim();
  const parsed = trimmed ? Number(trimmed) : Number.NaN;
  const delayMs = Number.isFinite(parsed) && parsed > 0 ? Math.max(minMs, parsed) : Math.max(minMs, fallbackMs);
  return Math.min(delayMs, MAX_TIMER_DELAY_MS);
}

export function shouldRecoverPrimaryMaster(
  master?: { isConnected: boolean; engineStatus: WhatsAppEngineStatus | string } | null
): boolean {
  if (!master || master.isConnected) return false;
  return (
    master.engineStatus === WhatsAppEngineStatus.DISCONNECTED ||
    master.engineStatus === WhatsAppEngineStatus.ERROR
  );
}

export function cleanStaleChromiumLocks(phoneNumber: string): void {
  const digits = normalizePhoneDigits(phoneNumber);
  const sessionsBase = path.resolve(
    process.cwd(),
    process.env.LINDA_SESSIONS_PATH || LINDA_SESSIONS_PATH || './.linda-sessions'
  );
  const sessionDir = path.join(sessionsBase, `session-${digits}`);
  for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    const target = path.join(sessionDir, lockFile);
    try {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || stat.isFile()) {
        fs.unlinkSync(target);
        log.info(`Removed stale Chromium lock: ${lockFile} for ${phoneNumber}`);
      }
    } catch {
      // Missing lock file/symlink or actively held by a live Chromium process
    }
  }
}

export async function runPrimaryMasterKeepAliveTick(): Promise<boolean> {
  if (keepAliveInFlight) return keepAliveInFlight;
  const run = (async () => {
    if (!hasSavedLocalAuthProfile(PRIMARY_MASTER_PHONE)) return false;
    const pool = lindaMultiSimPool.listPoolAccounts();
    const master = pool.find(
      acc => normalizePhoneDigits(acc.phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE)
    );
    if (!shouldRecoverPrimaryMaster(master)) return false;
    if (!isIsolatedWorkerMode()) {
      cleanStaleChromiumLocks(PRIMARY_MASTER_PHONE);
    }
    log.info(`24/7 Keep-Alive: Reconnecting Primary Master (${PRIMARY_MASTER_PHONE})...`);
    await lindaMultiSimPool.connectAccount(PRIMARY_MASTER_PHONE);
    return true;
  })();
  keepAliveInFlight = run;
  try {
    return await run;
  } finally {
    if (keepAliveInFlight === run) keepAliveInFlight = null;
  }
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
    if (normalizePhoneDigits(acc.phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE)) return true;
    return autoReconnectAll && hasSavedLocalAuthProfile(acc.phoneNumber);
  });

  if (candidates.length === 0) {
    log.info('No saved Linda LocalAuth profiles eligible for auto-reconnect on boot.');
    return;
  }

  const staggerMs = parsePositiveDelayMs(process.env.ACCOUNT_SEQUENTIAL_DELAY, 5000, 2000);
  if (!bootReconnectPromise) {
    bootReconnectPromise = (async () => {
      if (isIsolatedWorkerMode()) {
        await ensureLindaWorkerRunning().catch(err => {
          log.warn('Isolated WhatsApp worker startup warning:', err instanceof Error ? err.message : err);
        });
      }
      for (let i = 0; i < candidates.length; i++) {
        const acc = candidates[i];
        if (i > 0) await new Promise(resolve => setTimeout(resolve, staggerMs));
        try {
          if (!isIsolatedWorkerMode()) cleanStaleChromiumLocks(acc.phoneNumber);
          log.info(`Auto-reconnecting saved Linda WhatsApp session ${acc.phoneNumber} (${acc.displayName})...`);
          const isPrimary = normalizePhoneDigits(acc.phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE);
          if (isPrimary) {
            const primaryEngine = lindaMultiSimPool.getEngineForAccount(acc);
            if (!primaryEngine.isConnected()) {
              primaryEngine.once('qr', () => {
                setTimeout(() => {
                  if (primaryEngine.isConnected()) return;
                  void lindaMultiSimPool
                    .requestAccountPairingCode(acc.phoneNumber)
                    .then(pairing => {
                      if (pairing?.pairingCode) {
                        log.info(`🔑 PRIMARY MASTER PAIRING CODE (${acc.phoneNumber}): ${pairing.pairingCode} — Enter in WhatsApp → Linked Devices → Link with phone number`);
                      }
                    })
                    .catch(err => {
                      log.warn(`Primary Master auto-pairing code failed (${acc.phoneNumber}): ${err instanceof Error ? err.message : String(err)}. Press [1] in Terminal Dashboard to retry.`);
                    });
                }, 1500).unref?.();
              });
            }
          }
          await lindaMultiSimPool.connectAccount(acc.phoneNumber);
        } catch (err) {
          log.warn(`Auto-reconnect failed for ${acc.phoneNumber}:`, err instanceof Error ? err.message : err);
        }
      }
    })().finally(() => {
      bootReconnectPromise = null;
    });
  }

  // 24/7 Primary Master Keep-Alive Watchdog (checks every 60s)
  const keepAliveMs = parsePositiveDelayMs(process.env.PRIMARY_MASTER_KEEPALIVE_MS, 60000, 30000);
  if (primaryMasterKeepAliveTimer) clearInterval(primaryMasterKeepAliveTimer);
  primaryMasterKeepAliveTimer = setInterval(() => {
    void runPrimaryMasterKeepAliveTick().catch(err => {
      log.warn('24/7 Keep-Alive reconnect failed:', err instanceof Error ? err.message : err);
    });
  }, keepAliveMs);
  if (typeof primaryMasterKeepAliveTimer.unref === 'function') primaryMasterKeepAliveTimer.unref();
}
