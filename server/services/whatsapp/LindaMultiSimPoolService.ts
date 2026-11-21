import fs from 'node:fs';
import path from 'node:path';
import qrcode from 'qrcode';
import { getWhatsAppEngine, WhatsAppEngine, WhatsAppEngineStatus } from './WhatsAppEngine.js';
import { MultiAccountSwitcherManager } from './linda-core/imported/src/accounts/MultiAccountSwitcherManager.js';
import { MultiSimAccountRotator } from './linda-core/imported/src/accounts/MultiSimAccountRotator.js';
import { gaussianDelay, isDubaiBusinessHours, rotateTemplate } from './anti-ban/index.js';
import { LINDA_SESSIONS_PATH, LINDA_HEADLESS } from '../../config/env.js';
import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('LindaMultiSimPool');
const db = prisma as any;

export interface PoolAccountConfig {
  id: string;
  phoneNumber: string;
  sessionId: string;
  displayName: string;
  role: 'master' | 'employee' | 'servant';
  hourlyLimit: number;
}

export interface PoolAccountLiveStatus extends PoolAccountConfig {
  digits: string;
  engineStatus: WhatsAppEngineStatus;
  isConnected: boolean;
  isActive: boolean;
  qrAvailable: boolean;
  sessionDirExists: boolean;
  hourlySent: number;
  hourlyRemaining: number;
  messagesSent: number;
  messagesReceived: number;
}

const DEFAULT_ACCOUNTS: PoolAccountConfig[] = [
  { id: 'acc-001', phoneNumber: '+971505760056', sessionId: 'session-971505760056', displayName: 'Primary Master: Arslan Malik', role: 'master', hourlyLimit: 20 },
  { id: 'acc-002', phoneNumber: '+971503869886', sessionId: 'session-971503869886', displayName: 'Master Desk 2 (DH2 Landlords)', role: 'master', hourlyLimit: 20 },
  { id: 'acc-003', phoneNumber: '+971505110636', sessionId: 'session-971505110636', displayName: 'Master Line 3 (DH2 Tenants)', role: 'master', hourlyLimit: 20 },
  { id: 'acc-004', phoneNumber: '+971589969886', sessionId: 'session-971589969886', displayName: 'Employee Desk (Leasing Viewings)', role: 'employee', hourlyLimit: 20 },
  { id: 'acc-005', phoneNumber: '+971553633595', sessionId: 'session-971553633595', displayName: 'Servant & Outreach Line (Campaigns)', role: 'servant', hourlyLimit: 20 },
];

export const DH2_CLUSTERS = ['Camelia', 'Albizia', 'Basswood', 'Pacifica', 'Clivia', 'Amargo', 'Zinnia', 'Mimosa', 'Vardon', 'Juniper'];

export const DH2_LANDLORD_TEMPLATES = [
  'Hello {{ownerName}}, this is Linda from White Caves Real Estate LLC (DAMAC Hills 2 Leasing Desk). We have pre-qualified tenants looking for {{bedrooms}}BR units in {{cluster}}, DAMAC Hills 2. Is your unit {{unitRef}} available for rent soon?',
  'Hi {{ownerName}}, White Caves Real Estate LLC here. Demand for {{cluster}} in DAMAC Hills 2 is very strong this week — are you considering leasing unit {{unitRef}}? We handle verified viewings and Ejari directly.',
  'Greetings {{ownerName}}! Linda from White Caves Real Estate (DAMAC Hills 2 Specialists). We currently have active corporate tenants searching in {{cluster}}. Would you like us to list {{unitRef}} on whitecaves.com at zero landlord commission?',
];

export function normalizePhoneDigits(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function computeAntiBanDelayMs(): number {
  // 35–65s randomized Gaussian pacing (mean 50s, std 7.5s) per Aegis DH2 Directive
  const sample = gaussianDelay(50_000, 7_500);
  return Math.min(65_000, Math.max(35_000, sample));
}

class LindaMultiSimPoolService {
  private readonly accounts: PoolAccountConfig[];
  private readonly switcher: MultiAccountSwitcherManager;
  private readonly rotator: MultiSimAccountRotator;
  private readonly attachedInbound = new Set<string>();

  constructor() {
    this.accounts = this.loadAccountsConfig();
    this.switcher = new MultiAccountSwitcherManager(
      this.accounts.map(a => ({ id: a.id, name: a.displayName, phone: a.phoneNumber, status: 'DISCONNECTED' })) as any
    );
    this.rotator = new MultiSimAccountRotator({ maxHourlySends: 20 });
  }

  private loadAccountsConfig(): PoolAccountConfig[] {
    try {
      const configPath = path.resolve(process.cwd(), 'data/app/whatsapp-accounts.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (Array.isArray(parsed?.accounts) && parsed.accounts.length > 0) {
          return parsed.accounts.map((a: any, idx: number) => ({
            id: String(a.id || `acc-00${idx + 1}`),
            phoneNumber: String(a.phoneNumber),
            sessionId: String(a.sessionId || `session-${normalizePhoneDigits(a.phoneNumber)}`),
            displayName: String(a.displayName || a.phoneNumber),
            role: (a.role === 'employee' || a.role === 'servant' ? a.role : 'master') as PoolAccountConfig['role'],
            hourlyLimit: Number(a.hourlyLimit || 20),
          }));
        }
      }
    } catch (err) {
      log.warn('Failed reading whatsapp-accounts.json, using canonical 5-SIM defaults', err);
    }
    return DEFAULT_ACCOUNTS;
  }

  public findAccount(idOrPhone: string): PoolAccountConfig | undefined {
    const clean = normalizePhoneDigits(idOrPhone);
    return this.accounts.find(
      a => a.id === idOrPhone || a.phoneNumber === idOrPhone || normalizePhoneDigits(a.phoneNumber) === clean
    );
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
          void this.routeInboundTenantToViewing({
            fromPhone: msg.from,
            message: msg.body,
            receivedOnLine: account.phoneNumber,
          }).catch(err => log.warn('Inbound tenant routing error', err));
        }
      });
    }
    return engine;
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
    const connectedCount = accounts.filter(a => a.isConnected).length;
    const totalHourlyCapacity = accounts.reduce((sum, a) => sum + a.hourlyLimit, 0);
    const totalHourlyUsed = accounts.reduce((sum, a) => sum + a.hourlySent, 0);
    return {
      poolSize: accounts.length,
      connectedCount,
      activeAccount: this.switcher.getActiveAccount(),
      antiBanPolicy: {
        pacingRangeSeconds: [35, 65],
        distribution: 'gaussian',
        perSimHourlyCap: 20,
        totalHourlyCapacity,
        totalHourlyUsed,
        totalHourlyRemaining: Math.max(0, totalHourlyCapacity - totalHourlyUsed),
        dubaiBusinessHoursActive: isDubaiBusinessHours(),
      },
      accounts,
      timestamp: new Date().toISOString(),
    };
  }

  public switchActiveAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 5-SIM pool`);
    return this.switcher.switchAccount(account.id);
  }

  public async connectAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 5-SIM pool`);
    const engine = this.getEngineForAccount(account);
    if (!engine.isConnected() && engine.getStatus() !== WhatsAppEngineStatus.AUTHENTICATING) {
      void engine.initialize().catch(err => log.error(`Failed initializing ${account.phoneNumber}:`, err));
    }
    return {
      account: account.phoneNumber,
      displayName: account.displayName,
      status: engine.getStatus(),
      isConnected: engine.isConnected(),
      qrAvailable: Boolean(engine.getQRCode()),
    };
  }

  public async connectAllAccounts() {
    const results = [];
    for (const account of this.accounts) {
      results.push(await this.connectAccount(account.phoneNumber));
    }
    return results;
  }

  public async disconnectAccount(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 5-SIM pool`);
    const engine = this.getEngineForAccount(account);
    await engine.disconnect();
    return { account: account.phoneNumber, disconnected: true };
  }

  public async getAccountQr(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 5-SIM pool`);
    const engine = this.getEngineForAccount(account);
    const rawQr = engine.getQRCode();
    if (!rawQr) {
      return {
        phoneNumber: account.phoneNumber,
        isConnected: engine.isConnected(),
        status: engine.getStatus(),
        qrCode: null,
        rawQr: null,
        message: engine.isConnected() ? 'Already paired and connected' : 'Initializing — retry in 2–5 seconds after calling connect',
      };
    }
    const qrCode = await qrcode.toDataURL(rawQr, { margin: 2, scale: 6 });
    return { phoneNumber: account.phoneNumber, isConnected: false, status: engine.getStatus(), qrCode, rawQr };
  }

  public async requestAccountPairingCode(idOrPhone: string) {
    const account = this.findAccount(idOrPhone);
    if (!account) throw new Error(`WhatsApp account "${idOrPhone}" not found in 5-SIM pool`);
    const engine = this.getEngineForAccount(account);
    const digits = normalizePhoneDigits(account.phoneNumber);
    const pairingCode = await engine.requestPairingCode(digits);
    return {
      phoneNumber: account.phoneNumber,
      pairingCode,
      instructions: 'Open WhatsApp on phone → Linked Devices → Link with phone number → Enter code',
    };
  }

  public async dispatchRotatedOutreach(input: {
    recipients: Array<{ phone: string; ownerName?: string; cluster?: string; unitRef?: string; bedrooms?: string }>;
    templates?: string[];
    dryRun?: boolean;
    respectBusinessHours?: boolean;
  }) {
    const templates = input.templates?.length ? input.templates : DH2_LANDLORD_TEMPLATES;
    const connectedAccounts = this.listPoolAccounts().filter(a => a.isConnected);
    const availablePhones = (connectedAccounts.length ? connectedAccounts : this.accounts).map(a => a.phoneNumber);
    const outsideHours = input.respectBusinessHours !== false && !isDubaiBusinessHours();

    const plan: Array<{
      to: string;
      assignedSim: string;
      delayMs: number;
      message: string;
      status: 'sent' | 'dry_run' | 'queued_outside_hours' | 'no_connected_sim' | 'rate_capped' | 'error';
      error?: string;
    }> = [];

    for (let i = 0; i < input.recipients.length; i++) {
      const target = input.recipients[i];
      const cleanTo = normalizePhoneDigits(target.phone);
      const selectedSim = this.rotator.selectBestAccount(availablePhones as any);
      const delayMs = i === 0 ? 0 : computeAntiBanDelayMs();
      const baseTemplate = rotateTemplate('dh2-landlord-outreach', templates);
      const message = baseTemplate
        .replace(/\{\{ownerName\}\}/g, target.ownerName || 'Valued Owner')
        .replace(/\{\{cluster\}\}/g, target.cluster || 'DAMAC Hills 2')
        .replace(/\{\{unitRef\}\}/g, target.unitRef || 'your villa/townhouse')
        .replace(/\{\{bedrooms\}\}/g, target.bedrooms || '3');

      if (!selectedSim) {
        plan.push({ to: cleanTo, assignedSim: 'none', delayMs, message, status: 'rate_capped', error: 'All 5 SIMs at 20/hr anti-ban cap' });
        continue;
      }
      if (input.dryRun) {
        this.rotator.recordSend(selectedSim);
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'dry_run' });
        continue;
      }
      if (outsideHours) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'queued_outside_hours' });
        continue;
      }
      const account = this.findAccount(selectedSim)!;
      const engine = this.getEngineForAccount(account);
      if (!engine.isConnected()) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'no_connected_sim', error: `SIM ${selectedSim} not paired yet` });
        continue;
      }
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      try {
        await engine.sendMessage(cleanTo, message);
        this.rotator.recordSend(selectedSim);
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'sent' });
      } catch (err) {
        plan.push({ to: cleanTo, assignedSim: selectedSim, delayMs, message, status: 'error', error: err instanceof Error ? err.message : 'Send failed' });
      }
    }

    return {
      total: plan.length,
      sent: plan.filter(p => p.status === 'sent').length,
      dryRunCount: plan.filter(p => p.status === 'dry_run').length,
      connectedSims: connectedAccounts.length,
      outsideDubaiHours: outsideHours,
      plan,
    };
  }

  public async routeInboundTenantToViewing(input: {
    fromPhone: string;
    message: string;
    tenantName?: string;
    receivedOnLine?: string;
    preferredDate?: string;
  }) {
    const text = input.message.toLowerCase();
    const isRentalViewingIntent = /(rent|lease|view|viewing|visit|damac|hills 2|dh2|akoya|camelia|albizia|basswood|pacifica|clivia|amargo|townhouse|villa|bedroom|br)/i.test(text);
    const matchedCluster = DH2_CLUSTERS.find(c => text.includes(c.toLowerCase())) || 'DAMAC Hills 2';
    const bedMatch = text.match(/(\d)\s*(?:br|bed|bhk|bedroom)/i);
    const bedrooms = bedMatch ? Number(bedMatch[1]) : 3;
    const cleanPhone = normalizePhoneDigits(input.fromPhone);

    if (!isRentalViewingIntent) {
      return { routed: false, reason: 'No rental/viewing intent detected', cleanPhone };
    }

    let leadId: string | null = null;
    try {
      const existing = await db.lead.findFirst({ where: { phone: { contains: cleanPhone.slice(-9) } }, select: { id: true } });
      if (existing) {
        leadId = existing.id;
      } else {
        const created = await db.lead.create({
          data: {
            name: input.tenantName || `DH2 Tenant (${cleanPhone})`,
            phone: `+${cleanPhone}`,
            email: `tenant-${cleanPhone}@whitecaves.local`,
            source: 'WHATSAPP_LINDA',
            status: 'VIEWING_SCHEDULED',
            notes: `Auto-routed by Linda (${input.receivedOnLine || '+971505760056'}) → Daisy (MGR-05-2): ${matchedCluster} ${bedrooms}BR. Msg: ${input.message.slice(0, 240)}`,
          },
        });
        leadId = created.id;
      }
    } catch (err) {
      log.warn('Lead persistence skipped during inbound viewing routing:', err instanceof Error ? err.message : err);
    }

    const scheduledAt = input.preferredDate
      ? new Date(input.preferredDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      routed: true,
      delegatedTo: { id: 'MGR-05-2', name: 'Daisy', department: 'Leasing & Tenancy' },
      leadId,
      tenantPhone: `+${cleanPhone}`,
      cluster: matchedCluster,
      bedrooms,
      proposedViewingAt: scheduledAt.toISOString(),
      suggestedReply: `Thank you for contacting White Caves Real Estate LLC! Our DAMAC Hills 2 leasing specialist Daisy has reserved a ${bedrooms}BR viewing slot in ${matchedCluster} for ${scheduledAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}. Reply YES to confirm or share your preferred time.`,
    };
  }
}

export const lindaMultiSimPool = new LindaMultiSimPoolService();
export default lindaMultiSimPool;
