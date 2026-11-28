// @ts-nocheck
import { formatLiveLogFooterPanel } from '../liveLogBuffer.js';
/**
 * TerminalHealthDashboard.js
 * 
 * Interactive health dashboard for terminal monitoring with device tracking
 * - Display WhatsApp and Google account status
 * - Real-time device linking status and metadata
 * - Prompt for account re-linking
 * - Health summary with auto-refresh every 60 seconds
 * - Device management commands
 * 
 * Version: 2.0
 * Created: February 11, 2026
 * Status: Production Ready - Enhanced with Device Tracking
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import accountHealthMonitor from '../../accounts/AccountHealthMonitor.js';
import TerminalNumberMenu from '../TerminalNumberMenu.js';
import services from '../../core/ServiceRegistry.js';
import { SessionManager } from '../../sessions/SessionManager.js';
import TerminalLayout, { colorize, PANEL_COLORS } from '../TerminalLayout.js';
import FeatureCatalog from '../FeatureCatalog.js';
import TerminalPlaybooks, { PLAYBOOKS } from '../TerminalPlaybooks.js';
import { conversationReportLines, conversationSummaryLines } from '../TerminalConversationAnalysis.js';
import { getNewConversationGuard } from '../../outreach/MasterChatDirectory.js';
import OutreachCommand from '../../outreach/OutreachCommand.js';
import OutreachDailyRunner from '../../outreach/OutreachDailyRunner.js';
import {
  dedupeLines, intentLines, pickClient, scoreLines, sendSingleMessage, sentimentLines, similarLines, validateLines,
} from './TerminalFeatureCommands.js';

const COMMAND_HINT = 'First: master check | master ready = restore if offline | features = all commands | menu = choose options | help';
const APP_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version || '?';
  } catch {
    return '?';
  }
})();

/** Lay out short cells in as many columns as fit `width`. */
const gridLines = (cells, width) => {
  if (!cells.length) return [];
  const cellWidth = Math.max(...cells.map(cell => cell.length)) + 2;
  const columns = Math.max(1, Math.floor((width + 2) / cellWidth));
  const lines = [];
  for (let i = 0; i < cells.length; i += columns) {
    lines.push(cells.slice(i, i + columns).map(cell => cell.padEnd(cellWidth)).join('').trimEnd());
  }
  return lines;
};


export const methodsPart1 = {
  headerPanel(masterInfo, devicesLine) {
    const uptime = Math.floor((Date.now() - this.startedAt) / 60000);
    const runtime = `Linda v${APP_VERSION} · Node ${process.version} · PID ${process.pid} · ` +
      `started ${new Date(this.startedAt).toLocaleTimeString()} · uptime ${Math.floor(uptime / 60)}h ${String(uptime % 60).padStart(2, '0')}m`;
    const job = [...this.conversationJobs.keys()];
    const master = masterInfo
      ? `Master: ${masterInfo.phone} · ${masterInfo.online ? 'ONLINE' : masterInfo.status} · ${masterInfo.link}`
      : `Master: ${this.masterPhoneNumber || 'not configured (type 2.1 or 2.2 to link)'}`;
    const activity = job.length ? `Working: analyzing conversations for ${job.join(', ')}` :
      this.commandRunning && this.lastCommand ? `Working: ${this.lastCommand}` : 'Idle · waiting for your command';
    return {
      title: 'LINDA · WHATSAPP BOT CONTROL CENTER',
      lines: [runtime, `${master} | ${devicesLine}`, activity],
      compactLines: [`Linda v${APP_VERSION} · ${master} | ${devicesLine}`],
    };
  },

  conversationLines(onlinePhones = []) {
    if (!this.conversationReporter) return [];
    const lines = [];
    for (const { phone } of onlinePhones) {
      const report = this.conversationReporter.get(phone);
      if (this.conversationJobs.has(phone)) {
        lines.push(`CONVERSATIONS ${phone}: analyzing… ${this.conversationJobs.get(phone).progress || ''}`.trimEnd());
      } else if (!report) {
        lines.push(`CONVERSATIONS ${phone}: no report yet (type convos ${phone})`);
      } else {
        lines.push(`CONVERSATIONS ${phone}: ${report.totalChats} chats · ${report.totalMessages}${report.cappedChats ? '+' : ''} messages · ` +
          `last: ${report.last ? report.last.name : 'none'} · full list: convos ${phone}`);
      }
    }
    return lines;
  },

  masterSectionLines(info) {
    if (!info) {
      const phone = this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber;
      return [
        `RELINK · ${phone ? `MASTER ${phone} NOT SET UP ON THIS COMPUTER` : 'NO MASTER ACCOUNT LINKED'}`,
        '  Link with pairing code: 2.1 link-code | Link with QR: 2.2 link-qr',
      ];
    }
    const { phone } = info;
    if (info.online) {
      const lines = [`MESSAGE ANALYZER · MASTER ${phone} ONLINE`];
      const inboxLine = this.inboxCountLine(phone);
      if (inboxLine) lines.push(`  ${inboxLine}`);
      const report = this.conversationReporter?.get(phone);
      if (!this.conversationReporter) {
        lines.push('  Conversation reports are unavailable in this run.');
      } else if (this.conversationJobs.has(phone)) {
        lines.push(`  Analyzing conversations… ${this.conversationJobs.get(phone).progress || 'reading chat list'}`.trimEnd());
      } else if (report) {
        lines.push(...conversationSummaryLines(report).map(line => `  ${line}`));
      } else {
        lines.push('  No report yet; it runs automatically after login, or type 8.11 now.');
      }
      lines.push(`  Analyzer: 8.11 convos (full report) | 8.9 chats ${phone} | 8.10 analyze ${phone} <#>`);
      return lines;
    }
    const lines = [`RELINK · MASTER ${phone} ${info.status}`];
    if (info.inProgress) {
      lines.push('  Reconnecting now; wait a moment. If it stalls: ' +
        `1.16 recover ${phone} | 1.9 relink master ${phone}`);
      return lines;
    }
    if (info.canRestore && info.previouslyLinked && !info.loggedOut) {
      lines.push(`  Still linked on the phone; saved session found → 1.16 recover ${phone} (reactivate, no new code)`);
      lines.push(`  Only if that fails: 1.9 relink master ${phone} (new pairing code or QR)`);
    } else {
      lines.push(`  ${info.loggedOut ? 'Removed or logged out on the phone' : 'No saved session on this computer'}` +
        ` → 1.9 relink master ${phone} (pairing code or QR)`);
      lines.push('  Or link fresh: 2.1 link-code | 2.2 link-qr');
    }
    if (info.lastError) lines.push(`  Last error: ${String(info.lastError).replace(/\s+/g, ' ').slice(0, 160)}`);
    return lines;
  },

  inboxCountLine(phone) {
    const reporter = this.conversationReporter;
    if (!reporter?.counts || !reporter.getCounts) return '';
    const counts = reporter.getCounts(phone);
    if (!counts && !this.inboxCountJobs.has(phone) && !this.inboxCountAttempts.has(phone)) {
      this.refreshInboxCounts(phone);
    }
    if (!counts) {
      return this.inboxCountJobs.has(phone) ? 'Inbox: counting conversations and unread messages…' :
        'Inbox: counts unavailable (they load when the master comes online; 8.11 convos for a full report)';
    }
    return `Inbox: ${counts.totalChats} conversations (${counts.people} people, ${counts.groups} groups) · ` +
      `Unread: ${counts.unreadMessages} messages in ${counts.unreadChats} chats · ` +
      `live, updated ${new Date(counts.at).toLocaleTimeString()}`;
  },

  refreshInboxCounts(phone, { refresh = false } = {}) {
    if (!this.conversationReporter?.counts) return Promise.resolve(null);
    if (this.inboxCountJobs.has(phone)) return this.inboxCountJobs.get(phone);
    this.inboxCountAttempts.add(phone);
    const job = Promise.resolve()
      .then(() => this.conversationReporter.counts(phone, { refresh }))
      .catch(error => {
        this.lastNotice = `Inbox counts for ${phone} failed: ${error.message}`;
        console.error(this.lastNotice);
        return null;
      })
      .finally(() => {
        this.inboxCountJobs.delete(phone);
        this.requestDashboardRefresh();
      });
    this.inboxCountJobs.set(phone, job);
    return job;
  },

  setConversationReporter(reporter) {
    this.conversationReporter = reporter;
  },

  onAccountReady(phone, delayMs = Number(process.env.LINDA_CHAT_REPORT_DELAY_MS) || 8000) {
    if (!this.conversationReporter) return;
    this.inboxCountAttempts.delete(phone);
    const countsTimer = setTimeout(() => this.refreshInboxCounts(phone, { refresh: true }), Math.min(delayMs, 3000));
    countsTimer.unref?.();
    if (process.env.LINDA_AUTO_CHAT_REPORT === '0') return;
    clearTimeout(this.conversationTimers.get(phone));
    const timer = setTimeout(() => {
      this.conversationTimers.delete(phone);
      this.runConversationReport(phone).catch(() => {});
    }, delayMs);
    timer.unref?.();
    this.conversationTimers.set(phone, timer);
  },

  async runConversationReport(phone, { printTable = false } = {}) {
    if (!this.conversationReporter) throw new Error('Conversation reports are unavailable');
    if (this.conversationJobs.has(phone)) {
      console.log(`Conversation analysis for ${phone} is already running.`);
      return this.conversationJobs.get(phone).promise;
    }
    const job = { progress: '' };
    console.log(`📊 Analyzing all conversations for ${phone}…`);
    job.promise = (async () => {
      try {
        const report = await this.conversationReporter.run(phone, {
          onProgress: (done, total) => {
            job.progress = `${done}/${total} chats`;
            console.log(`📊 ${phone}: counted messages in ${done}/${total} chats`);
            this.requestDashboardRefresh();
          },
        });
        const lines = printTable ? conversationReportLines(report) : conversationSummaryLines(report);
        console.log(`✅ Conversation report for ${report.phone}`);
        for (const line of lines) console.log(`   ${line}`);
        return report;
      } catch (error) {
        console.log(`⚠️  Conversation report for ${phone} failed: ${error.message}`);
        throw error;
      } finally {
        this.conversationJobs.delete(phone);
        this.requestDashboardRefresh();
      }
    })();
    this.conversationJobs.set(phone, job);
    this.requestDashboardRefresh();
    return job.promise;
  },

  featurePanel() {
    const count = command => this.features.actionCount(command);
    return {
      title: 'FEATURES · SECTIONS [code] ACTIONS ×USES · every code is on the INPUT board',
      lines: width => [this.features.summaryLine(), ...gridLines(this.sectionTabs(count), width)],
      compactLines: [this.features.summaryLine()],
    };
  },

  sectionTabs(count) {
    return [
      ...this.numberMenu.sections(count).map(section => (section.reference
        ? `[${section.code}] WhatsApp !commands (reference)`
        : `[${section.code}] ${section.label.replace(/\s*\(.*\)$/, '')} ${section.actions} ×${section.uses}`)),
      `[P] Playbooks P1-P${PLAYBOOKS.length}`,
    ];
  },

  inputBoard() {
    const count = command => this.features.actionCount(command);
    const sections = this.numberMenu.sections(count);
    const footer = 'SERVER INPUT: pair <phone> · 1.16 · p1.1 · 0 back · 00 home · help  ||  AICC-SANCTUM: [6] switch';
    return {
      lines: width => [
        ...sections.flatMap(section => (section.reference
          ? [`[${section.code}] ${section.label} - type ${section.code} to browse`]
          : [`[${section.code}] ${section.label.toUpperCase()} · ${section.actions} actions · used ×${section.uses}`,
            ...gridLines(section.cells, width - 2).map(line => `  ${line}`)])),
        'PLAYBOOKS · problem → steps · p<n> = show steps · p<n>.<step> = run step',
        ...this.playbooks.summaryLines().map(line => `  ${line}`),
        footer,
        ...formatLiveLogFooterPanel(width, 12),
      ],
      compactLines: width => [
        ...gridLines(sections.map(section => `[${section.code}] ${section.label.replace(/\s*\(.*\)$/, '')} ${section.reference ? '(ref)' : `${section.actions} ×${section.uses}`}`), width),
        ...gridLines(PLAYBOOKS.map(p => `P${p.id} ${p.problem.replace(/\s*\(.*\)$/, '')} ×${this.features.actionCount(`p${p.id}`)}`), width),
        `Enlarge the window for every code. ${footer}`,
        ...formatLiveLogFooterPanel(width, 12),
      ],
    };
  },

  printFeatureList() {
    this.numberMenu.refresh(false);
    for (const line of this.numberMenu.fullListLines(command => this.features.actionCount(command))) console.log(line);
  },

  get autoFeatureList() {
    return process.env.NODE_ENV !== 'test' && process.env.LINDA_FEATURE_LIST !== '0';
  },

  get usePanels() {
    return process.env.NODE_ENV !== 'test' && this.layout.enabled;
  },

  inputPanelLines() {
    if (this.activeQuestion) {
      return [...this.activeQuestion.split('\n').map(line => line.trimEnd()).filter(Boolean),
        '→ Type your answer at the prompt below and press Enter.'];
    }
    if (this.pairingCodes.size) {
      return [
        ...[...this.pairingCodes].map(([phone, code]) => `Pairing code for ${phone}: ${code}`),
        'Phone: WhatsApp > Linked devices > Link a device > Link with phone number instead.',
        'Code delayed, expired, or failed? Type r (or code <phone>) and press Enter for a new code.',
      ];
    }
    return ['Type a command at the prompt below and press Enter.', COMMAND_HINT];
  },

  inputPanel() {
    const title = 'INPUT · YOUR ACTION';
    if (this.activeQuestion || this.pairingCodes.size) return { title, lines: this.inputPanelLines() };
    return { title: `${title} · ALL OPTIONS & PLAYBOOKS`, ...this.inputBoard() };
  },

  renderInputPanel() {
    if (!this.usePanels) return;
    this.layout.updateInput(this.inputPanel());
  },

  setDeviceManager(deviceManager) {
    if (this.deviceManager && this.deviceStatusListener) {
      for (const event of this.deviceEvents) this.deviceManager.removeListener(event, this.deviceStatusListener);
    }
    this.deviceManager = deviceManager;
    this.deviceEvents = ['device:status-changed', 'device:linking-started', 'device:reset', 'device:added'];
    this.deviceStatusListener = () => this.requestDashboardRefresh();
    for (const event of this.deviceEvents) deviceManager.on(event, this.deviceStatusListener);
  },

  getAccountsAwaitingPairingCode() {
    return [...(this.connectionManagers?.entries() || [])]
      .filter(([, manager]) => manager?.isAwaitingPairingCode?.())
      .map(([phone]) => phone);
  },

  handlePairingCodeInput(input, requestCode) {
    const words = String(input).trim().toLowerCase().split(/\s+/);
    const refresh = ['r', 'refresh', 'new-code'].includes(words[0]) && words.length === 1 ||
      words.join(' ') === 'new code' || words[0] === 'code' && words.length <= 2;
    if (!refresh) return false;
    const waiting = this.getAccountsAwaitingPairingCode();
    // Only intercept while a pairing-code link is waiting; otherwise input keeps its normal meaning.
    if (!waiting.length) return false;
    const requested = words[0] === 'code' ? words[1] : null;
    const normalize = phone => String(phone).replace(/^\+/, '');
    const phone = requested
      ? waiting.find(entry => normalize(entry) === normalize(requested))
      : waiting.length === 1 ? waiting[0] : null;
    if (requested && !phone) return false;
    return this.refreshPairingCode(phone, waiting, requestCode);
  }
};
