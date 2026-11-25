import fs from 'node:fs';
import path from 'node:path';
import qrcode from 'qrcode';
import { getWhatsAppEngine, WhatsAppEngine, WhatsAppEngineStatus } from './WhatsAppEngine.js';
import { MultiAccountSwitcherManager } from './linda-core/imported/src/accounts/MultiAccountSwitcherManager.js';
import { MultiSimAccountRotator } from './linda-core/imported/src/accounts/MultiSimAccountRotator.js';
import { gaussianDelay, isDubaiBusinessHours, isFridayPrayerPause, rotateTemplate } from './anti-ban/index.js';
import {
  computeSimWarmupPolicy, isPhoneSuppressed, scheduleHunter3TouchCadence,
} from './dh2OutreachGovernanceService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import {
  DH2_CLUSTERS, DH2_LANDLORD_TEMPLATES, processLandlordAvailabilityReply, routeInboundTenantViewingInquiry,
} from './dh2LandlordReplyVaultSync.js';
import {
  isPrimaryMasterAccount, loadPoolAccountsConfig, normalizePhoneDigits, type PoolAccountConfig,
} from './lindaPoolAccountsConfig.js';
export { DH2_CLUSTERS, DH2_LANDLORD_TEMPLATES, normalizePhoneDigits, type PoolAccountConfig };
import { LINDA_SESSIONS_PATH, LINDA_HEADLESS } from '../../config/env.js';
import { getSocketServer } from '../socketServer.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('LindaMultiSimPool');

export interface PoolAccountLiveStatus extends PoolAccountConfig {
  digits: string; engineStatus: WhatsAppEngineStatus; isConnected: boolean; isActive: boolean;
  qrAvailable: boolean; sessionDirExists: boolean; hourlySent: number; hourlyRemaining: number;
  messagesSent: number; messagesReceived: number;
}

export const computeAntiBanDelayMs = (): number => Math.min(65_000, Math.max(35_000, gaussianDelay(50_000, 7_500)));

class LindaMultiSimPoolService {
  private readonly accounts: PoolAccountConfig[];
  private readonly switcher: MultiAccountSwitcherManager;
  private readonly rotator: MultiSimAccountRotator;
  private readonly attachedInbound = new Set<string>();

  constructor() {
    this.accounts = loadPoolAccountsConfig();
    this.switcher = new MultiAccountSwitcherManager(
      this.accounts.map(a => ({ id: a.id, name: a.displayName, phone: a.phoneNumber, status: 'DISCONNECTED' }))
    );
    this.rotator = new MultiSimAccountRotator({ maxHourlySends: 18 });
  }

  public findAccount(idOrPhone: string): PoolAccountConfig | undefined {
    const clean = normalizePhoneDigits(idOrPhone);
    return this.accounts.find(
      a => a.id === idOrPhone || a.phoneNumber === idOrPhone || normalizePhoneDigits(a.phoneNumber) === clean
    );
  }

  public getHunterPoolAccounts(): PoolAccountConfig[] {
    return this.accounts.filter(a => !isPrimaryMasterAccount(a));
  }

  public getPrimaryAccount(): PoolAccountConfig {
    return this.accounts.find(a => isPrimaryMasterAccount(a)) || this.accounts[0];
  }

  public getBestConnectedEngine(preferredAccount?: string): { account: PoolAccountConfig; engine: WhatsAppEngine } | null {
    if (preferredAccount) {
      const matched = this.findAccount(preferredAccount);
      if (matched) {
        const eng = this.getEngineForAccount(matched);
        if (eng.isConnected()) return { account: matched, engine: eng };
      }
    }
    const primary = this.getPrimaryAccount();
    const primaryEng = this.getEngineForAccount(primary);
    if (primaryEng.isConnected()) return { account: primary, engine: primaryEng };
    for (const acc of this.accounts) {
      const eng = this.getEngineForAccount(acc);
      if (eng.isConnected()) return { account: acc, engine: eng };
    }
    return null;
  }

  public getEngineForAccount(account: PoolAccountConfig): WhatsAppEngine {
    const digits = normalizePhoneDigits(account.phoneNumber);
    const engine = getWhatsAppEngine(digits, {
      sessionPath: process.env.LINDA_SESSIONS_PATH || LINDA_SESSIONS_PATH || './.linda-sessions',
      headless: process.env.LINDA_HEADLESS !== 'false' && LINDA_HEADLESS,
      autoRestart: true,
    });
    if (!this.attachedInbound.has(digits)) {
      this.attachedInbound.add(digits);
      engine.on('message', (msg: { from?: string; body?: string; isFromMe?: boolean }) => {
        if (!msg.isFromMe && msg.from && msg.body) {
          void this.handleInboundWhatsAppMessage(account, msg.from, msg.body).catch(err =>
            log.warn('Inbound WhatsApp routing error', err)
          );
        }
      });
    }
    return engine;
  }

  private async handleInboundWhatsAppMessage(account: PoolAccountConfig, fromPhone: string, body: string) {
    if (!isPrimaryMasterAccount(account)) {
      const landlordSync = await processLandlordAvailabilityReply({
        hunterSimPhone: account.phoneNumber, landlordPhone: fromPhone, message: body,
      });
      if (landlordSync.syncedToMaryVault) {
        log.info(`Mary Vault auto-populated from Hunter SIM ${account.phoneNumber} -> ${landlordSync.handoff?.handoffId}`);
        getSocketServer()?.emitLindaHotLead({
          type: 'LANDLORD_AVAILABLE_SYNCED', phone: fromPhone, cluster: landlordSync.cluster,
          unitNumber: landlordSync.unitNumber, askingRentAed: landlordSync.askingRentAed,
          routedTo: 'AI Mary (SUP-06-1-01-1) -> MD Closer (+971505760056)',
        });
        return landlordSync;
      }
    }
    const tenant = await this.routeInboundTenantToViewing({ fromPhone, message: body, receivedOnLine: account.phoneNumber });
    if (tenant?.routed) {
      getSocketServer()?.emitLindaHotLead({
        type: 'TENANT_VIEWING_MATCHED', phone: fromPhone, cluster: tenant.cluster,
        bedrooms: tenant.bedrooms, matchedUnitsCount: tenant.matchedUnits?.length ?? 0,
        routedTo: 'AI Daisy (SUP-05-2-01-1)',
      });
    }
    return tenant;
  }

  public listPoolAccounts(): PoolAccountLiveStatus[] {
    const active = this.switcher.getActiveAccount();
    const sessionsBase = path.resolve(process.cwd(), process.env.LINDA_SESSIONS_PATH || LINDA_SESSIONS_PATH || './.linda-sessions');
    return this.accounts.map(account => {
      const digits = normalizePhoneDigits(account.phoneNumber);
      const engine = this.getEngineForAccount(account);
      const stats = engine.getStats();
      const hourlySent = this.rotator.getHourlyCount(account.phoneNumber);
      const sessionDirExists = fs.existsSync(path.join(sessionsBase, `session-${digits}`));
      return {
        ...account,
        digits,
        engineStatus: stats.status,
        isConnected: stats.isConnected,
        isActive: active?.id === account.id,
        qrAvailable: Boolean(engine.getQRCode()),
        sessionDirExists,
        hourlySent,
        hourlyRemaining: Math.max(0, account.hourlyLimit - hourlySent),
        messagesSent: stats.messagesSent,
        messagesReceived: stats.messagesReceived,
      };
    });
  }

  public getPoolTelemetry() {
    const accounts = this.listPoolAccounts();
    const hunters = accounts.filter(a => !isPrimaryMasterAccount(a));
    const totalHunterHourlyCapacity = hunters.reduce((sum, a) => sum + a.hourlyLimit, 0);
    const totalHunterHourlyUsed = hunters.reduce((sum, a) => sum + a.hourlySent, 0);
    return {
      poolSize: accounts.length, hunterPoolSize: hunters.length, primaryMasterPhone: PRIMARY_MASTER_PHONE,
      primaryMasterProtectedFromColdOutreach: true, connectedCount: accounts.filter(a => a.isConnected).length,
      connectedHunterCount: hunters.filter(a => a.isConnected).length, activeAccount: this.switcher.getActiveAccount(),
      antiBanPolicy: {
        pacingRangeSeconds: [35, 65], distribution: 'gaussian', perSimHourlyCap: 18,
        totalHourlyCapacity: totalHunterHourlyCapacity, totalHourlyUsed: totalHunterHourlyUsed,
        totalHourlyRemaining: Math.max(0, totalHunterHourlyCapacity - totalHunterHourlyUsed),
        dubaiBusinessHoursActive: isDubaiBusinessHours(), fridayPrayerPauseActive: isFridayPrayerPause(),
      },
      accounts, timestamp: new Date().toISOString(),
    };
  }

  public switchActiveAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 10-SIM pool`);
    return this.switcher.switchAccount(account.id);
  }

  public async connectAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 10-SIM pool`);
    const engine = this.getEngineForAccount(account);
    if (!engine.isConnected() && engine.getStatus() !== WhatsAppEngineStatus.AUTHENTICATING) {
      void engine.initialize().catch(err => log.error(`Failed initializing ${account.phoneNumber}:`, err));
    }
    return {
      account: account.phoneNumber, displayName: account.displayName, simTier: account.simTier,
      status: engine.getStatus(), isConnected: engine.isConnected(), qrAvailable: Boolean(engine.getQRCode()),
    };
  }

  public async connectAllAccounts() {
    const results = [];
    for (const account of this.accounts) results.push(await this.connectAccount(account.phoneNumber));
    return results;
  }

  public async disconnectAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 10-SIM pool`);
    await this.getEngineForAccount(account).disconnect();
    return { account: account.phoneNumber, disconnected: true };
  }

  public async getAccountQr(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 10-SIM pool`);
    const engine = this.getEngineForAccount(account);
    const rawQr = engine.getQRCode();
    if (!rawQr) {
      return {
        phoneNumber: account.phoneNumber,
        simTier: account.simTier,
        isConnected: engine.isConnected(),
        status: engine.getStatus(),
        qrCode: null,
        rawQr: null,
        message: engine.isConnected() ? 'Already paired and connected' : 'Initializing — retry in 2–5 seconds after calling connect',
      };
    }
    const qrCode = await qrcode.toDataURL(rawQr, { margin: 2, scale: 6 });
    return { phoneNumber: account.phoneNumber, simTier: account.simTier, isConnected: false, status: engine.getStatus(), qrCode, rawQr };
  }

  public async requestAccountPairingCode(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 10-SIM pool`);
    const engine = this.getEngineForAccount(account);
    const pairingCode = await engine.requestPairingCode(normalizePhoneDigits(account.phoneNumber));
    return {
      phoneNumber: account.phoneNumber,
      simTier: account.simTier,
      pairingCode,
      instructions: 'Open WhatsApp on phone → Linked Devices → Link with phone number → Enter code',
    };
  }

  /**
   * Mission 1 Cold Landlord Outreach — HARD-EXCLUDES Primary Master (+971505760056).
   * Rotates exclusively across the 9 Hunter Outreach SIMs with 35–65s Gaussian jitter & 18/hr cap.
   */
  public async dispatchRotatedOutreach(input: {
    recipients: Array<{ phone: string; ownerName?: string; cluster?: string; unitRef?: string; bedrooms?: string }>;
    templates?: string[];
    dryRun?: boolean;
    respectBusinessHours?: boolean;
    scheduleCadence?: boolean;
    simActivatedAtMap?: Record<string, Date | string>;
    dbOverride?: any;
  }) {
    const templates = input.templates?.length ? input.templates : DH2_LANDLORD_TEMPLATES;
    const hunterAccounts = this.listPoolAccounts().filter(a => !isPrimaryMasterAccount(a));
    const connectedHunters = hunterAccounts.filter(a => a.isConnected);
    const activeHunters = connectedHunters.length ? connectedHunters : hunterAccounts;
    const availableHunterPhones = activeHunters.filter(a => {
      const warmup = computeSimWarmupPolicy(input.simActivatedAtMap?.[a.phoneNumber]);
      return a.hourlySent < Math.min(a.hourlyLimit, warmup.hourlyCap);
    }).map(a => a.phoneNumber);
    const fridayPause = isFridayPrayerPause();
    const outsideHours = input.respectBusinessHours !== false && (!isDubaiBusinessHours() || fridayPause);

    const plan: Array<{
      to: string; assignedSim: string; delayMs: number; message: string;
      status: 'sent' | 'dry_run' | 'queued_outside_hours' | 'no_connected_sim' | 'rate_capped' | 'dnc_suppressed' | 'error';
      error?: string;
    }> = [];

    for (let i = 0; i < input.recipients.length; i++) {
      const target = input.recipients[i];
      const cleanTo = normalizePhoneDigits(target.phone);
      const delayMs = i === 0 ? 0 : computeAntiBanDelayMs();
      const message = rotateTemplate('dh2-landlord-outreach', templates)
        .replace(/\{\{ownerName\}\}/g, target.ownerName || 'Valued Owner')
        .replace(/\{\{cluster\}\}/g, target.cluster || 'DAMAC Hills 2')
        .replace(/\{\{unitRef\}\}/g, target.unitRef || 'your villa/townhouse')
        .replace(/\{\{bedrooms\}\}/g, target.bedrooms || '3');

      if (await isPhoneSuppressed(cleanTo, input.dbOverride)) {
        plan.push({ to: cleanTo, assignedSim: 'none', delayMs: 0, message, status: 'dnc_suppressed', error: 'Global DNC opt-out active' });
        continue;
      }
      const selectedSim = this.rotator.selectBestAccount(availableHunterPhones);
      if (!selectedSim) {
        plan.push({ to: cleanTo, assignedSim: 'none', delayMs, message, status: 'rate_capped', error: 'All 9 Hunter SIMs at warmup/hourly anti-ban cap' });
        continue;
      }
      if (input.dryRun) {
        this.rotator.recordSend(selectedSim);
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'dry_run' });
        continue;
      }
      if (outsideHours) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'queued_outside_hours', error: fridayPause ? 'Friday prayer pause (12:00–14:30 GST)' : undefined });
        continue;
      }
      const account = this.findAccount(selectedSim)!;
      const engine = this.getEngineForAccount(account);
      if (!engine.isConnected()) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'no_connected_sim', error: `Hunter SIM ${selectedSim} not paired yet` });
        continue;
      }
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      try {
        await engine.sendMessage(cleanTo, message);
        this.rotator.recordSend(selectedSim);
        if (input.scheduleCadence !== false) {
          await scheduleHunter3TouchCadence({
            landlordPhone: cleanTo, ownerName: target.ownerName, cluster: target.cluster || 'DAMAC Hills 2',
            unitRef: target.unitRef || 'TBD', bedrooms: target.bedrooms, hunterSimPhone: selectedSim, dbOverride: input.dbOverride,
          });
        }
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'sent' });
      } catch (err) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'error', error: err instanceof Error ? err.message : 'Send failed' });
      }
    }

    return {
      total: plan.length, sent: plan.filter(p => p.status === 'sent').length,
      dryRunCount: plan.filter(p => p.status === 'dry_run').length,
      dncSuppressedCount: plan.filter(p => p.status === 'dnc_suppressed').length,
      connectedHunterSims: connectedHunters.length, primaryMasterProtected: PRIMARY_MASTER_PHONE,
      outsideDubaiHours: outsideHours, fridayPrayerPauseActive: fridayPause, plan,
    };
  }

  public async routeInboundTenantToViewing(input: {
    fromPhone: string;
    message: string;
    tenantName?: string;
    receivedOnLine?: string;
    preferredDate?: string;
  }) {
    return routeInboundTenantViewingInquiry({
      ...input,
      primaryMasterPhone: PRIMARY_MASTER_PHONE,
    });
  }
}

export const lindaMultiSimPool = new LindaMultiSimPoolService();
export default lindaMultiSimPool;
