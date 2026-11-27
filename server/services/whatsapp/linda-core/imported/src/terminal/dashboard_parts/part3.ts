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


export const methodsPart3 = {
  displayHealthDashboard(force = false) {
    const accounts = this.accountConfigManager?.getAllAccounts() || [];
    const devices = this.deviceManager?.getAllDevices() || [];
    const rows = new Map(accounts.map(account => [account.phoneNumber, account]));
    for (const device of devices) rows.set(device.phoneNumber, { ...rows.get(device.phoneNumber), ...device });
    const sessionState = services.get('sessionStateManager');
    const lines = [];
    let active = 0;
    let saved = 0;
    let linked = 0;
    let deviceNumber = 0;
    let masterInfo = null;
    const onlinePhones = [];
    for (const [phone, device] of rows) {
      const metadata = sessionState?.getDeviceMetadata(phone) || {};
      const clientId = SessionManager.resolveClientId(phone, metadata, device);
      const manager = this.connectionManagers?.get(phone);
      const connected = this.accountClients?.has(phone) && manager?.state === 'CONNECTED';
      const inProgress = manager && !manager.authRequired &&
        (manager.isInitializing || manager.isReconnecting || manager.state === 'CONNECTING');
      const authRequired = !connected && !inProgress && (manager?.authRequired ||
        device.status === 'auth_required' || metadata.status === 'auth_required');
      const loggedOut = !connected && !inProgress && (['logged_out', 'auth_failed'].includes(device.status) ||
        ['logged_out', 'auth_failed'].includes(metadata.status));
      const canRestore = !loggedOut && SessionManager.canRestoreSession(clientId);
      const online = this.accountClients ? connected :
        device.status === 'linked' && device.isOnline === true;
      const previouslyLinked = Boolean(online || metadata.deviceLinked || metadata.linkedAt || device.linkedAt);
      if (previouslyLinked && !loggedOut) linked++;
      const status = loggedOut ? 'LOGGED OUT' : online ? 'ACTIVE' : authRequired ? 'AUTH REQUIRED' :
        inProgress ? (manager.isReconnecting ? 'RECONNECTING' : 'CONNECTING') :
        device.status === 'paused' || metadata.status === 'paused' ? 'PAUSED' :
        device.status === 'restoring' || device.status === 'restore_failed' && manager?.reconnectTimer ? 'RECONNECTING' :
          device.status === 'restore_failed' ? 'RESTORE FAILED' :
        device.status === 'authenticated' ? 'AUTHENTICATED' :
          manager?.state === 'CONNECTING' ? 'CONNECTING' :
            device.status === 'linking' ? 'LINKING' :
              ['ERROR', 'SUSPENDED'].includes(manager?.state) || device.status === 'error' ? 'ERROR' : 'OFFLINE';
      if (online && !loggedOut) active++;
      if (canRestore) saved++;
      const master = phone === (this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
      const link = loggedOut ? 'NOT LINKED (logged out)' : previouslyLinked ? 'LINKED' :
        status === 'LINKING' ? 'LINKING' : 'NOT LINKED';
      if (master) {
        masterInfo = {
          phone, status, link, online: online && !loggedOut, canRestore, previouslyLinked, loggedOut,
          inProgress: Boolean(inProgress), authRequired: Boolean(authRequired),
          lastError: manager?.connectionFailureReason || device.lastError || metadata.lastError || '',
        };
      }
      if (online && !loggedOut) onlinePhones.push({ phone, master });
      lines.push(`${++deviceNumber}. ${device.displayName || device.name || phone}${master ? ' [MASTER]' : ''} | ${phone} | Link: ${link} | Connection: ${status} | session: ${canRestore ? `saved (${clientId})` : online ? 'active; save pending' : 'relink needed'}`);
      if (master) continue; // The master's reconnect guidance lives in its RELINK / ANALYZER section.
      if (previouslyLinked && !online && !loggedOut && !inProgress) {
        lines.push(`   Linked device; currently offline. ${
          !canRestore ? `No saved WhatsApp login on this computer; relink needed: relink ${master ? 'master' : 'servant'} ${phone}` :
            authRequired ? `WhatsApp Web asked to verify this session. Reactivate first: recover ${phone} | relink only if it fails: relink ${master ? 'master' : 'servant'} ${phone}` :
              `Reactivate (no relink): recover ${phone}`}`);
      } else if (loggedOut) {
        lines.push(`   Device was removed or logged out. Relink: relink ${master ? 'master' : 'servant'} ${phone}`);
      }
      const lastError = manager?.connectionFailureReason || device.lastError || metadata.lastError;
      if (!online && !inProgress && lastError) {
        lines.push(`   Connection error: ${String(lastError).replace(/\s+/g, ' ').slice(0, 240)}`);
      }
    }
    const devicesLine = `Devices: ${rows.size} | Linked: ${linked} | Active (online): ${active} | Offline: ${rows.size - active} | Saved sessions: ${saved}`;
    const conversationLines = [
      ...this.masterSectionLines(masterInfo),
      ...this.conversationLines(onlinePhones.filter(entry => !entry.master)),
    ];
    const screen = [
      'LINDA | DEVICE DASHBOARD',
      devicesLine,
      'Linked = registered on the phone (last known). Active = connected now. Reactivating an offline linked device does not need relinking.',
      ...lines,
      ...conversationLines,
      this.lastCommand ? `Last command: ${this.lastCommand}` : '',
      this.lastNotice ? `Notice: ${this.lastNotice}` : '',
      this.features.summaryLine(),
      COMMAND_HINT,
    ].filter(Boolean).join('\n');
    const usePanels = this.usePanels;
    if (!force && screen === this.lastDashboard && (!usePanels || this.layout.current)) return;
    this.lastDashboard = screen;
    if (usePanels) {
      // Title and device totals move to the HEADER; feature counters get their own panel.
      const outputLines = screen.split('\n').slice(2, -2);
      const result = this.layout.render(
        { title: `OUTPUT · DEVICES & ${masterInfo?.online ? 'MESSAGE ANALYZER' : 'RELINK MASTER'}`, lines: outputLines },
        this.inputPanel(),
        this.featurePanel(),
        this.headerPanel(masterInfo, devicesLine),
      );
      // A full re-pin clears the log area, so put the prompt back.
      if (result === 'repinned' && this.isMonitoring && !this.commandRunning && !this.isSelectingLinkingMethod) {
        this.safePrompt(true);
      }
      return;
    }
    // Replace the terminal viewport, never the scrollback or redirected output.
    if (process.stdout.isTTY) {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
    }
    console.log(`\n${screen}\n`);
  },

  displayGorahaStatus(stats, validation) {
    try {
      const timestamp = new Date().toLocaleTimeString();
      
      // Section 1: Contact Statistics
      console.log(`\n📊 GORAHA BOT - CONTACT STATISTICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (stats.error) {
        console.log(`  ⚠️  ERROR: ${stats.error}`);
        if (stats.lastFetched) {
          console.log(`  Last Successful Fetch: ${new Date(stats.lastFetched).toLocaleString()}`);
        }
      } else {
        console.log(`  Total Contacts:          ${stats.total || 0}`);
        console.log(`  "D2 Security" Contacts:  ${stats.d2SecurityCount || 0}`);
        const d2Percentage = stats.total > 0 ? Math.round((stats.d2SecurityCount / stats.total) * 100) : 0;
        console.log(`  Percentage:              ${d2Percentage}%`);
        console.log(`  Data Status:             ${stats.cached ? '📦 Cached' : '🔄 Fresh'}`);
        console.log(`  Last Fetched:            ${new Date(stats.lastFetched).toLocaleString()}`);
      }
      console.log();

      // Section 2: Account Status
      console.log(`📱 GOOGLE SERVICE ACCOUNT STATUS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (validation.error) {
        console.log(`  ❌ Account Status: INVALID`);
        console.log(`  Error: ${validation.error}`);
      } else {
        const accountStatusSymbol = validation.isActive ? '✅' : '❌';
        const accountStatusText = validation.isActive ? 'ACTIVE & VALID' : 'INVALID / UNREACHABLE';
        
        console.log(`  Account Status:          ${accountStatusSymbol} ${accountStatusText}`);
        console.log(`  Structure Valid:         ${validation.structureValid ? '✅ Yes' : '❌ No'}`);
        console.log(`  API Access Valid:        ${validation.apiAccessValid ? '✅ Yes' : '❌ No'}`);
      }
      
      if (validation.details && validation.details.email) {
        console.log(`  Service Account Email:   ${validation.details.email}`);
      }
      if (validation.details && validation.details.project) {
        console.log(`  Google Cloud Project:    ${validation.details.project}`);
      }
      
      console.log(`  Last Checked:            ${new Date().toLocaleTimeString()}`);
      console.log();

      // Section 3: Next Steps
      console.log(`💡 COMMANDS:`);
      console.log(`  goraha status            → Refresh contact stats (uses cache if recent)`);
      console.log(`  goraha verify            → Force full verification and recount`);
      console.log(`  goraha filter <string>   → Search for specific contacts`);
      console.log();

    } catch (error) {
      console.log(`\n❌ Error displaying GorahaBot status: ${error.message}\n`);
    }
  },

  displayGorahaFilterResults(result) {
    try {
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`\n🔍 GORAHA BOT - FILTERED CONTACT SEARCH`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Search Filter:           "${result.filterString}"`);
      console.log();
      
      if (result.error) {
        console.log(`  ⚠️  ERROR: ${result.error}`);
        console.log();
      } else {
        console.log(`  📱 RESULTS`);
        console.log(`  ────────────────────────────────────────────────────`);
        console.log(`  Total Matches Found:     ${result.totalMatched}`);
        console.log();

        if (result.totalMatched > 0 && result.contacts && result.contacts.length > 0) {
          console.log(`  📋 MATCHING CONTACTS:`);
          console.log(`  ────────────────────────────────────────────────────`);
          
          result.contacts.slice(0, 50).forEach((contact, index) => {
            // Extract contact name/email
            let displayName = contact.names?.[0]?.displayName || 'Unknown';
            let emails = contact.emailAddresses?.map(e => e.value).join(', ') || 'No email';
            let phones = contact.phoneNumbers?.map(p => p.value).join(', ') || 'No phone';
            
            console.log(`  ${index + 1}. ${displayName}`);
            if (emails !== 'No email') {
              console.log(`     📧 ${emails}`);
            }
            if (phones !== 'No phone') {
              console.log(`     ☎️  ${phones}`);
            }
          });

          if (result.totalMatched > 50) {
            console.log(`  ... and ${result.totalMatched - 50} more contacts`);
          }
        } else {
          console.log(`  ❌ No contacts found matching "${result.filterString}"`);
        }
        
        console.log();
        console.log(`  Fetched:                 ${new Date(result.lastFetched).toLocaleString()}`);
      }
      console.log();

      // Section 2: Commands
      console.log(`💡 NEXT STEPS:`);
      console.log(`  goraha filter <string>   → Search with different filter`);
      console.log(`  goraha status            → View overview statistics`);
      console.log(`  goraha verify            → Force full verification`);
      console.log();

    } catch (error) {
      console.log(`\n❌ Error displaying filtered results: ${error.message}\n`);
    }
  }
};
