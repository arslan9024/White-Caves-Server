// @ts-nocheck
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


export const methodsPart2 = {
  async refreshPairingCode(phone, waiting, requestCode) {
    if (!phone) {
      console.log(`Several accounts are linking. Use: code <phone> (${waiting.join(', ')})`);
      return true;
    }
    if (this.refreshingPairingCode) {
      console.log('A new pairing code is already being requested. Please wait.');
      return true;
    }
    this.refreshingPairingCode = true;
    console.log(`\nRequesting a new WhatsApp pairing code for ${phone}...`);
    try {
      await requestCode?.(phone);
    } catch (error) {
      console.log(`Could not refresh the pairing code: ${error.message}`);
    } finally {
      this.refreshingPairingCode = false;
    }
    return true;
  },

  setLinkingChallenge(phoneNumber, active, details = {}) {
    if (active) this.linkingChallenges.add(phoneNumber);
    else this.linkingChallenges.delete(phoneNumber);
    if (active && details.kind === 'code' && details.code) this.pairingCodes.set(phoneNumber, details.code);
    else if (!active || details.kind === 'qr') this.pairingCodes.delete(phoneNumber);
    // A QR code needs the whole screen; panels are pinned again on the next dashboard render.
    if (active && details.kind === 'qr') this.layout.release();
    else this.renderInputPanel();
  },

  recordNotice(message, level = 'info') {
    if (!this.isMonitoring || this.isSelectingLinkingMethod || this.linkingChallenges.size) return false;
    if (message.trim() && ['error', 'warn', 'ready', 'success'].includes(level)) {
      this.lastNotice = message.replace(/\s+/g, ' ').slice(0, 180);
      this.requestDashboardRefresh();
    }
    return true;
  },

  requestDashboardRefresh() {
    if (!this.isMonitoring || this.dashboardRefreshTimer) return;
    this.dashboardRefreshTimer = setTimeout(() => {
      this.dashboardRefreshTimer = null;
      this.refreshDashboard();
    }, 100);
  },

  refreshDashboard(force = false) {
    if (!this.isMonitoring || this.commandRunning || this.isSelectingLinkingMethod ||
        this.numberMenu.pending || this.linkingChallenges.size || this.isCampaignMenuActive?.()) return;
    this.displayHealthDashboard(force);
  },

  setAccountConfigManager(accountConfigManager) {
    this.accountConfigManager = accountConfigManager;
  },

  setMasterPhoneNumber(phoneNumber) {
    this.masterPhoneNumber = phoneNumber;
  },

  setConnectionSources(accountClients, connectionManagers) {
    this.accountClients = accountClients;
    this.connectionManagers = connectionManagers;
  },

  async showMasterSelection(onRelinkMaster) {
    try {
      if (!this.accountConfigManager) {
        console.log(`\n❌ Account manager not available\n`);
        return;
      }

      // Get all master accounts
      const masterAccounts = this.accountConfigManager.getAllAccounts?.()?.filter(a => a.role === 'master') || [];
      
      if (masterAccounts.length === 0) {
        console.log(`\n⚠️  No master accounts found.\n`);
        console.log(`   Use 'link master <+phone>' to add a master account.\n`);
        return;
      }

      if (masterAccounts.length === 1) {
        // Only one master - auto-select
        const master = masterAccounts[0];
        console.log(`\n⏳ Auto-relinking: ${master.displayName} (${master.phoneNumber})`);
        if (onRelinkMaster) {
          await onRelinkMaster(master.phoneNumber);
        }
        return;
      }

      // Multiple masters - show selection UI
      console.log(`\n📱 Available Master Accounts:`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      masterAccounts.forEach((account, index) => {
        console.log(`  [${index + 1}] ${account.displayName}`);
        console.log(`       └─ Phone: ${account.phoneNumber}`);
        if (account.servants && account.servants.length > 0) {
          console.log(`       └─ Servants: ${account.servants.length}`);
        }
      });
      console.log();
      console.log(`  💡 Usage: 'relink master <phone>'`);
      console.log(`     (e.g., 'relink master ${masterAccounts[0].phoneNumber}')\n`);

    } catch (error) {
      console.log(`\n❌ Error showing master selection: ${error.message}\n`);
    }
  },

  initializeInput() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colorize('▶ Linda Bot [features = all commands | help] > ', PANEL_COLORS.input, { bold: true })
      });
    }
    return this.rl;
  },

  selectLinkingMethod(phoneNumber) {
    return this.queuedChoice(
      `\nLink ${phoneNumber}\n  [1] Pairing code (default)\n  [2] QR code\nChoose 1/code or 2/qr [1], or cancel: `,
      { '': 'code', 1: 'code', code: 'code', 2: 'qr', qr: 'qr' },
      'Invalid choice. Enter 1/code, 2/qr, or cancel.',
      'Linking selection timed out. Run link master to try again.',
      'Linking cancelled by user'
    );
  },

  selectMasterActivation(phoneNumber) {
    return this.queuedChoice(
      `\nMaster ${phoneNumber} is offline\n  [1] Reconnect saved linked session (default, no relink)\n` +
        '  [2] Relink with pairing code\n  [3] Relink with QR code\nChoose 1/reconnect, 2/code or 3/qr [1], or cancel: ',
      { '': 'reconnect', 1: 'reconnect', reconnect: 'reconnect', 2: 'code', code: 'code', 3: 'qr', qr: 'qr' },
      'Invalid choice. Enter 1/reconnect, 2/code, 3/qr, or cancel.',
      `Master activation prompt timed out. Use recover ${phoneNumber} or relink master ${phoneNumber}.`,
      'Master activation cancelled by user'
    );
  },

  queuedChoice(question, choices, invalidText, timeoutText, cancelText) {
    const select = async () => {
      const input = this.rl?.input || process.stdin;
      if (this.rl?.closed || input.destroyed || input.readable === false) {
        throw new Error('Terminal input is unavailable. Start linking with link-code or link-qr.');
      }

      const rl = this.initializeInput();
      this.isSelectingLinkingMethod = true;
      this.activeQuestion = question;
      this.renderInputPanel();
      // While the question is pinned in the INPUT panel, the prompt line stays short.
      const prompt = this.layout.current && this.usePanels
        ? colorize('▶ Answer > ', PANEL_COLORS.input, { bold: true })
        : question;
      try {
        while (true) {
          const answer = await new Promise((resolve, reject) => {
            const onClose = () => {
              clearTimeout(timer);
              reject(new Error('Linking selection cancelled: terminal closed'));
            };
            const timer = setTimeout(() => {
              rl.removeListener('close', onClose);
              controller.abort();
              reject(new Error(timeoutText));
            }, 120000);
            let settled = false;
            const controller = new AbortController();
            rl.once('close', onClose);
            const q = rl.question(
              prompt,
              { signal: controller.signal },
              (input) => {
                clearTimeout(timer);
                rl.removeListener('close', onClose);
                resolve(input.trim().toLowerCase());
              }
            );
            if (q && typeof q.catch === 'function') q.catch(() => {});
          });
          if (Object.hasOwn(choices, answer)) {
            return choices[answer];
          }
          if (answer === 'cancel') {
            throw new Error(cancelText);
          }
          console.log(invalidText);
        }
      } finally {
        this.isSelectingLinkingMethod = false;
        this.activeQuestion = null;
        this.renderInputPanel();
      }
    };
    const selection = this.linkingPromptQueue.then(select);
    // A cancelled prompt must not block other accounts waiting for a choice.
    this.linkingPromptQueue = selection.then(() => undefined, () => undefined);
    return selection;
  }
};
