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


export const methodsPart5 = {
  async startInteractiveMonitoring(callbacks = {}) {
    this.initializeInput();
    this.isMonitoring = true;

    const {
      onLinkMaster,  // NEW: Manual linking with health check (Phase 21)
      onAddNewMaster,  // NEW: Add new master account (Phase 25)
      onRelinkMaster,
      onRelinkServant,  // NEW: Add servant relink support (Phase 24)
      onRelinkDevice,
      onSwitchTo6Digit,
      onShowDeviceDetails,
      onListDevices,
      onRestoreAllSessions,  // NEW: Restore all previous sessions (Phase 28)
      onRestoreAccount,
      onCheckMaster,
      onDisconnectAccount,
      onListChats,
      onAnalyzeChat,
      onCampaigns,
      onCampaignInput,
      isCampaignMenuActive,
      getCampaignWorkspace,
      onGorahaStatusRequested,  // NEW: GorahaBot status (Phase 26)
      onGorahaFilterRequested,  // NEW: GorahaBot filter (Phase 28)
      onAnalyticsReportRequested,  // NEW: Analytics reporting (Phase 29e)
      onGoogleSheetsRead,  // NEW: Google Sheets read (Phase 30)
      onGoogleSheetsCreate,  // NEW: Google Sheets create (Phase 30)
      onGoogleSheetsUpdate,  // NEW: Google Sheets update (Phase 30)
      onGoogleSheetsDelete,  // NEW: Google Sheets delete (Phase 30)
      onGoogleSheetsSearch,  // NEW: Google Sheets search (Phase 30)
      onGoogleSheetsMetadata,  // NEW: Google Sheets metadata (Phase 30)
    } = callbacks;
    this.isCampaignMenuActive = isCampaignMenuActive;

    // Daily outreach checks itself every few minutes; it only acts when enabled with `outreach auto`.
    try {
      this.getOutreach(getCampaignWorkspace, onCheckMaster).daily.start();
    } catch (error) {
      console.log(`⚠️  Daily outreach scheduler unavailable: ${error.message}`);
    }

    // Start auto-refresh
    this.startAutoRefresh(() => {
      this.refreshDashboard();
    });

    this.rl.on('line', async (input) => {
      if (this.isSelectingLinkingMethod) {
        return;
      }
      const pairingRefresh = this.handlePairingCodeInput(input, onSwitchTo6Digit);
      if (pairingRefresh) {
        await pairingRefresh;
        return;
      }
      if (this.commandRunning) {
        console.log('A command is still running. Wait for it to finish.');
        return;
      }
      if (this.isCampaignMenuActive?.()) {
        this.commandRunning = true;
        try {
          await onCampaignInput(input);
        } catch (error) {
          console.error(`Campaign command failed: ${error.message}`);
        } finally {
          this.commandRunning = false;
          if (!this.isCampaignMenuActive()) this.refreshDashboard(true);
          this.safePrompt();
        }
        return;
      }
      if (!this.numberMenu.pending) {
        const play = this.playbooks.resolve(input);
        if (play?.lines) {
          for (const line of play.lines) console.log(line);
          this.safePrompt();
          return;
        }
        if (play) {
          this.features.recordInput(`p${play.id}`);
          console.log(`▶ Playbook P${play.id}: ${play.input}`);
          input = play.input;
        }
      }
      const shortcut = this.features.resolve(input);
      if (shortcut?.error) {
        console.log(shortcut.error);
        this.safePrompt();
        return;
      }
      if (shortcut) input = shortcut.command;
      try {
        const selection = shortcut ? {} : this.numberMenu.handleInput(input);
        if (selection.command) {
          input = selection.command;
        } else if (selection.handled) {
          if (/^menu$/i.test(input.trim())) {
            this.features.record('menu');
            this.features.recordInput('menu');
            this.renderInputPanel();
          }
          this.safePrompt();
          return;
        }
      } catch (error) {
        console.error(`Numbered menu failed: ${error.message}`);
        return;
      }
      const input_original = input.trim();
      const parts = input_original.split(/\s+/);
      const command = parts[0].toLowerCase();
      if (['link', 'relink', 'link-method', 'goraha', 'analytics', 'metrics', 'google', 'sheets'].includes(command) && parts[1]) {
        parts[1] = parts[1].toLowerCase();
      }

      // Helper function to extract display name with quoted string support
      const extractDisplayName = (originalInput, phoneNumber) => {
        // Find the phone number in the original input
        const phoneIndex = originalInput.indexOf(phoneNumber);
        if (phoneIndex === -1) return '';
        
        // Get everything after the phone number
        let afterPhone = originalInput.substring(phoneIndex + phoneNumber.length).trim();
        
        // Remove quotes if present
        if ((afterPhone.startsWith('"') && afterPhone.endsWith('"')) ||
            (afterPhone.startsWith("'") && afterPhone.endsWith("'"))) {
          afterPhone = afterPhone.slice(1, -1);
        }
        
        return afterPhone;
      };

      if (this.commandRunning) {
        console.log('A command is still running. Wait for it to finish.');
        return;
      }
      this.commandRunning = true;
      this.lastCommand = input_original;
      this.features.record(command);
      this.features.recordInput(input_original);
      try {
      switch (command) {
        case 'features':
        case 'list-all':
          this.printFeatureList();
          console.log('Legacy shortcuts still work: f<id> [args] (e.g. f21 0501234567). F-id list: features f');
          if (parts[1]?.toLowerCase() === 'f') for (const line of this.features.listLines()) console.log(line);
          break;

        case 'sentiment':
        case 'intent': {
          const text = input_original.slice(parts[0].length).trim();
          if (!text) {
            console.log(`Usage: ${command} <text>`);
            break;
          }
          for (const line of command === 'sentiment' ? sentimentLines(text) : intentLines(text)) console.log(line);
          break;
        }

        case 'similar':
          for (const line of similarLines(input_original.slice(parts[0].length))) console.log(line);
          break;

        case 'dedupe': {
          const file = input_original.slice(parts[0].length).trim().replace(/^["']|["']$/g, '');
          if (!file) {
            console.log('Usage: dedupe <contacts.csv|contacts.xlsx|contacts.json>');
            break;
          }
          for (const line of await dedupeLines(file)) console.log(line);
          break;
        }

        case 'score':
          for (const line of await scoreLines(this.connectionManagers, parts[1] || null)) console.log(line);
          break;

        case 'validate': {
          if (!parts[1]) {
            console.log('Usage: validate <number>');
            break;
          }
          const sender = pickClient(this.accountClients, this.connectionManagers,
            this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
          for (const line of await validateLines(parts.slice(1).join(''), sender?.client)) console.log(line);
          break;
        }

        case 'send': {
          const number = parts[1];
          const message = number ? input_original.slice(input_original.indexOf(number) + number.length).trim() : '';
          if (!number || !message) {
            console.log('Usage: send <number> <message>');
            break;
          }
          const sender = pickClient(this.accountClients, this.connectionManagers,
            this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
          if (!sender) {
            console.log('No active WhatsApp connection. Reactivate a device first (recover <phone>).');
            break;
          }
          const preview = message.length > 60 ? `${message.slice(0, 57)}...` : message;
          const answer = await this.queuedChoice(
            `\nSend from ${sender.phone} to ${number}:\n  "${preview}"\nConfirm y/yes or n/no [n]: `,
            { '': 'no', n: 'no', no: 'no', y: 'yes', yes: 'yes' },
            'Enter y/yes or n/no.',
            'Send confirmation timed out; nothing was sent.',
            'Send cancelled; nothing was sent.',
          );
          if (answer !== 'yes') {
            console.log('Send cancelled; nothing was sent.');
            break;
          }
          const result = await sendSingleMessage(sender.client, number, message, {
            guard: this.newConversationGuard || getNewConversationGuard(),
            account: sender.phone,
          });
          this.lastNotice = `Sent to ${result.to} from ${sender.phone}`;
          console.log(`✅ Sent to ${result.to} from ${sender.phone}${result.id ? ` (id ${result.id})` : ''}`);
          break;
        }

        case 'campaigns':
          if (!onCampaigns) throw new Error('Terminal campaigns are unavailable.');
          await onCampaigns();
          break;
        case 'link-code':
        case 'link-qr':
          if (parts.length !== 1) {
            console.error('Use link-code or link-qr without arguments to link the configured master.');
            break;
          }
          if (!onLinkMaster) {
            console.error('Master linking handler is not available.');
            break;
          }
          await onLinkMaster(command === 'link-code' ? 'code' : 'qr');
          break;

        case 'link-method':
          console.log('Linking preferences are no longer saved. Use link-code or link-qr to start linking directly.');
          break;

        // NEW: Link master account with health check (Phase 21 & enhanced Phase 25)
        case 'link':
          if (parts[1] === 'master') {
            const phoneNumber = parts[2]; // e.g., +971553633595
            const displayName = extractDisplayName(input_original, phoneNumber); // e.g., Big Broker
            
            if (phoneNumber) {
              // NEW: Link new master account (Phase 25)
              console.log(`\n⏳ Adding new master account...`);
              if (onAddNewMaster) {
                await onAddNewMaster(phoneNumber, displayName);
              } else {
                console.log(`❌ Add master handler not available\n`);
              }
            } else {
              // Original: Link first/default master (Phase 21)
              console.log(`\n⏳ Initiating master account linking...`);
              if (onLinkMaster) {
                await onLinkMaster();
              } else {
                console.log(`❌ Linking handler not available\n`);
              }
            }
          } else {
            console.log(`\n⚠️  Usage: 'link master' or 'link master <+phone> [name]'\n`);
          }
          break;

        case 'master':
          if (!parts[1] || ['check', 'ready'].includes(parts[1].toLowerCase())) {
            if (!onCheckMaster) throw new Error('Master readiness check is unavailable');
            await onCheckMaster({ recover: parts[1]?.toLowerCase() === 'ready' });
          } else {
            console.log('Usage: master check (live status) | master ready (restore if offline). All commands: features | help.');
          }
          break;

        case 'status':
          this.displayHealthDashboard(true);
          break;

        case 'relink':
          if (parts[1] === 'master') {
            // NEW: Support "relink master <phone>" for specific master account
            const masterPhone = parts[2];
            
            if (masterPhone) {
              // Specific master requested - relink directly
              console.log(`\n⏳ Re-linking master account: ${masterPhone}...`);
              if (onRelinkMaster) {
                await onRelinkMaster(masterPhone);
              }
            } else {
              // No phone specified - show master selection UI
              if (this.accountConfigManager) {
                await this.showMasterSelection(onRelinkMaster);
              } else {
                // Fallback: use default master phone
                const defaultMasterPhone = this.masterPhoneNumber;
                if (defaultMasterPhone) {
                  console.log(`\n⏳ Re-linking master account: ${defaultMasterPhone}...`);
                  if (onRelinkMaster) {
                    await onRelinkMaster(defaultMasterPhone);
                  }
                } else {
                  console.log(`\n⚠️  No master account specified.`);
                  console.log(`   Usage: 'relink master [+phone-number]'`);
                  console.log(`   Example: 'relink master +971505760056'\n`);
                }
              }
            }
          } else if (parts[1] === 'servant') {
            // NEW: Support "relink servant <phone>" for servant account relinking
            const servantPhone = parts[2];
            if (servantPhone) {
              console.log(`\n⏳ Re-linking servant account: ${servantPhone}...`);
              if (onRelinkServant) {
                await onRelinkServant(servantPhone);
              }
            } else {
              console.log(`\n⚠️  No servant account specified.`);
              console.log(`   Usage: 'relink servant <+phone-number>'`);
              console.log(`   Example: 'relink servant +971553633595'\n`);
            }
          } else if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\n⏳ Re-linking device ${phoneNumber}...`);
            if (onRelinkDevice) {
              await onRelinkDevice(phoneNumber);
            }
          } else {
            console.log(`\n⚠️  Usage:`);
            console.log(`   'relink master [+phone]'          → Re-link master account`);
            console.log(`   'relink <phone>'                  → Re-link specific device\n`);
          }
          break;

        case 'code':
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\nRequesting WhatsApp pairing code for ${phoneNumber}...`);
            if (onSwitchTo6Digit) {
              await onSwitchTo6Digit(phoneNumber);
            }
          } else {
            console.log(`\n⚠️  Usage: 'code <phone>'\n`);
          }
          break;

        case 'disconnect':
          if (!parts[1] || parts.length !== 2) throw new Error('Usage: disconnect <phone> (keeps the local session)');
          if (!onDisconnectAccount) throw new Error('Local disconnect is unavailable');
          await onDisconnectAccount(parts[1]);
          this.lastNotice = 'Disconnected locally; saved session retained. Recover explicitly or restart to reconnect.';
          break;

        case 'chats':
          if (!onListChats) throw new Error('Local conversation inspection is unavailable');
          if (parts.length > 3) throw new Error('Usage: chats [phone] [page]');
          await onListChats(parts[1], parts[2]);
          break;

        case 'outreach': {
          const plan = await this.getOutreach(getCampaignWorkspace, onCheckMaster).run(parts.slice(1));
          if (plan?.totals) {
            this.lastNotice = `Outreach ${plan.projects.join(', ')}: today ${plan.totals.today}, held ${plan.totals.waiting}, existing ${plan.totals.existing}`;
          }
          break;
        }

        case 'convos':
        case 'conversations': {
          if (!this.conversationReporter) throw new Error('Conversation reports are unavailable');
          if (parts.length > 2) throw new Error('Usage: convos [phone]');
          const target = parts[1] || this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber;
          if (!target) throw new Error('Usage: convos <phone> (no master configured)');
          await this.runConversationReport(target, { printTable: true });
          this.lastNotice = `Conversation report ready for ${target}.`;
          break;
        }

        case 'analyze':
          if (!onAnalyzeChat) throw new Error('Local conversation analysis is unavailable');
          if (parts.length < 3 || parts.length > 4) throw new Error('Usage: analyze <phone> <chat-number> [message-limit]');
          await onAnalyzeChat(parts[1], parts[2], parts[3]);
          break;

        case 'device':
          if (parts[1]) {
            const phoneNumber = parts[1];
            this.displayDeviceDetails(phoneNumber);
          } else {
            console.log(`\n⚠️  Usage: 'device <phone>'\n`);
          }
          break;

        case 'list':
          if (onListDevices) {
            onListDevices();
          } else {
            this.listAllDevices();
          }
          break;

        case 'masters':
          // NEW: Show all master accounts
          if (this.accountConfigManager) {
            this.accountConfigManager.listAllAccountsWithRoles();
          } else {
            console.log(`\n⚠️  Account manager not available\n`);
          }
          break;

        case 'servants':
          // NEW: Show all servant accounts
          if (this.accountConfigManager) {
            this.accountConfigManager.listAllAccountsWithRoles();
          } else {
            console.log(`\n⚠️  Account manager not available\n`);
          }
          break;

        // NEW COMMANDS: Per-account health & monitoring (Phase 26)
        case 'accounts':
          // List all accounts with per-account status
          console.clear();
          console.log(`\n╔════════════════════════════════════════════════════════════╗`);
          console.log(`║           📱 ALL ACCOUNTS - STATUS OVERVIEW                 ║`);
          console.log(`╚════════════════════════════════════════════════════════════╝\n`);
          
          if (this.accountConfigManager && this.deviceManager) {
            try {
              const accounts = this.accountConfigManager.getAllAccounts();
              
              if (accounts.length === 0) {
                console.log(`  No accounts configured yet.\n`);
                break;
              }

              accounts.forEach((account, index) => {
                const device = this.deviceManager.getDevice(account.phoneNumber);
                const statusSymbol = device ? ({
                  'linked': '✅',
                  'linking': '⏳',
                  'error': '❌',
                  'unlinked': '❌'
                }[device.status] || '❓') : '❓';

                const onlineSymbol = device?.isOnline ? '🟢' : '🔴';
                const uptime = device?.uptime ? `${Math.floor(device.uptime / 60)}m` : '--';

                console.log(`  ${index + 1}. ${statusSymbol} ${account.phoneNumber}`);
                console.log(`     Name: ${account.displayName}`);
                console.log(`     Role: ${account.role.toUpperCase()}`);
                console.log(`     Status: ${device?.status?.toUpperCase() || 'UNKNOWN'} ${onlineSymbol}`);
                console.log(`     Uptime: ${uptime}`);
                console.log(`     Last Sync: ${device?.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : '--'}`);
                console.log();
              });
            } catch (error) {
              console.log(`  ❌ Error loading accounts: ${error.message}\n`);
            }
          } else {
            console.log(`  ⚠️  Account manager or device manager not available\n`);
          }
          break;

        case 'health':
          // Show detailed health for specific account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📊 ACCOUNT HEALTH REPORT                          ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);

            if (this.deviceManager) {
              const device = this.deviceManager.getDevice(phoneNumber);
              
              if (!device) {
                console.log(`  ❌ Account not found: ${phoneNumber}\n`);
                break;
              }

              try {
                const healthScore = this._calculateHealthScore(device);
                const healthStatus = this._getHealthStatus(healthScore);
                
                console.log(`  Account: ${phoneNumber}`);
                console.log(`  Display: ${device.name}`);
                console.log(`  Role: ${device.role.toUpperCase()}`);
                console.log();
                console.log(`  Status: ${device.status.toUpperCase()}`);
                console.log(`  Online: ${device.isOnline ? '🟢 YES' : '🔴 NO'}`);
                console.log(`  Health: ${healthStatus} (${healthScore}/100)`);
                console.log();
                console.log(`  Connection:`);
                console.log(`    Auth Method: ${device.authMethod || '--'}`);
                console.log(`    Linked At: ${device.linkedAt ? new Date(device.linkedAt).toLocaleString() : '--'}`);
                console.log(`    Last Heartbeat: ${device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : '--'}`);
                console.log(`    Uptime: ${device.uptime ? Math.floor(device.uptime / 60) + 'm' : '--'}`);
                console.log();
                
                if (device.lastError) {
                  console.log(`  Last Error: ${device.lastError.message || device.lastError}`);
                  console.log();
                }

                console.log(`  IP Address: ${device.ipAddress || '--'}`);
                console.log(`  Create: ${device.createdAt ? new Date(device.createdAt).toLocaleDateString() : '--'}`);
                console.log();
              } catch (error) {
                console.log(`  ❌ Error generating health report: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Device manager not available\n`);
            }
          } else {
            this.displayHealthDashboard(true);
          }
          break;

        case 'stats':
          // Show metrics for specific account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📈 ACCOUNT METRICS                                 ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);

            if (this.deviceManager) {
              const device = this.deviceManager.getDevice(phoneNumber);
              
              if (!device) {
                console.log(`  ❌ Account not found: ${phoneNumber}\n`);
                break;
              }

              try {
                const uptime = device.uptime || 0;
                const uptimeMins = Math.floor(uptime / 60000);
                const uptimeHours = Math.floor(uptimeMins / 60);
                const uptimeDays = Math.floor(uptimeHours / 24);
                
                // Get metrics from accountHealthMonitor if available
                const healthMetrics = accountHealthMonitor?.getMetrics?.(phoneNumber) || {};

                console.log(`  Account: ${phoneNumber}`);
                console.log(`  Display: ${device.name}`);
                console.log();
                console.log(`  UPTIME:`);
                if (device.isOnline) {
                  if (uptimeDays > 0) {
                    console.log(`    ${uptimeDays} days, ${uptimeHours % 24} hours, ${uptimeMins % 60} minutes`);
                  } else if (uptimeHours > 0) {
                    console.log(`    ${uptimeHours} hours, ${uptimeMins % 60} minutes`);
                  } else {
                    console.log(`    ${uptimeMins} minutes`);
                  }
                } else {
                  console.log(`    --  (offline)`);
                }
                console.log();
                
                console.log(`  ACTIVITY:`);
                console.log(`    Last Activity: ${device.lastActivity ? new Date(device.lastActivity).toLocaleTimeString() : '--'}`);
                console.log(`    Heartbeats: ${device.heartbeatCount || 0}`);
                console.log(`    Link Attempts: ${device.linkAttempts || 0}/${device.maxLinkAttempts || 5}`);
                console.log();

                console.log(`  HEALTH:`);
                console.log(`    Status: ${device.status.toUpperCase()}`);
                console.log(`    Online: ${device.isOnline ? 'YES' : 'NO'}`);
                console.log(`    Recovery Mode: ${device.recoveryMode ? 'YES' : 'NO'}`);
                console.log();

                if (healthMetrics.messageCount !== undefined) {
                  console.log(`  MESSAGES:`);
                  console.log(`    Messages Sent: ${healthMetrics.messageCount || 0}`);
                  console.log(`    Errors: ${healthMetrics.errorCount || 0}`);
                  console.log();
                }
              } catch (error) {
                console.log(`  ❌ Error generating stats: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Device manager not available\n`);
            }
          } else {
            console.log(`\n⚠️  Usage: 'stats <+phone-number>'`);
            console.log(`  Example: 'stats +971505760056'\n`);
          }
          break;

        case 'recover':
          // Attempt session restoration for account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\n⏳ Attempting session restoration for ${phoneNumber}...`);
            
            try {
              if (!onRestoreAccount) throw new Error('Session restore handler is unavailable');
              await onRestoreAccount(phoneNumber);
            } catch (error) {
              this.lastNotice = `Restore failed: ${error.message}`;
              console.log(`  ❌ Error during recovery: ${error.message}\n`);
            }
          } else {
            console.log(`\n⚠️  Usage: 'recover <+phone-number>'`);
            console.log(`  Example: 'recover +971505760056'\n`);
          }
          break;

        case 'restore-sessions':
        case 'restore':
          if (parts[1]?.toLowerCase() === 'master') {
            const masterPhone = parts[2] || this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber;
            if (!masterPhone) {
              console.log('\n⚠️  No master is configured yet. Link one: link-code (2.1) or link-qr (2.2)\n');
              break;
            }
            console.log(`\n⏳ Restoring master ${masterPhone} from its saved session (no new code)...`);
            try {
              if (!onRestoreAccount) throw new Error('Session restore handler is unavailable');
              await onRestoreAccount(masterPhone);
            } catch (error) {
              this.lastNotice = `Restore master failed: ${error.message}`;
              console.log(`  ❌ Error during recovery: ${error.message}`);
              console.log(`  Next step (P1.2): relink master ${masterPhone}\n`);
            }
            break;
          }
          // Restore all previous WhatsApp sessions
          console.clear();
          console.log(`\n╔════════════════════════════════════════════════════════════╗`);
          console.log(`║       🔄 RESTORING ALL PREVIOUS WHATSAPP SESSIONS            ║`);
          console.log(`╚════════════════════════════════════════════════════════════╝\n`);
          console.log(`⏳ Loading all saved sessions...\n`);
          
          if (onRestoreAllSessions) {
            try {
              await onRestoreAllSessions();
            } catch (error) {
              console.log(`  ❌ Error during restore: ${error.message}\n`);
            }
          } else {
            console.log(`  ⚠️  Restore function not available\n`);
          }
          break;

        // NEW: GorahaBot status (Phase 26 & 28)
        case 'goraha':
          if (parts[1] === 'verify' || parts[1] === 'v') {
            // Force verification
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║       📱 GORAHA BOT - VERIFICATION & STATUS CHECK           ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Verifying GorahaBot service account...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(true); // true = force refresh
              } catch (error) {
                console.log(`  ❌ Error during verification: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else if (parts[1] === 'contacts' || parts[1] === 'count') {
            // Show total contacts count
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║          📱 GORAHA BOT - TOTAL CONTACTS COUNT               ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Fetching total contacts count...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(false); // Get stats with total count
                console.log(`\n💡 Use 'goraha filter <string>' to find specific contacts`);
                console.log(`   Example: 'goraha filter D2 Security'\n`);
              } catch (error) {
                console.log(`  ❌ Error fetching contacts: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else if (parts[1] === 'filter' || parts[1] === 'search') {
            // Filter contacts by string
            const filterString = parts.slice(2).join(' ');
            
            if (!filterString || filterString.trim().length === 0) {
              console.log(`\n⚠️  Usage: 'goraha filter <search_string>'`);
              console.log(`   Example: 'goraha filter D2 Security'`);
              console.log(`   Example: 'goraha filter Broker'\n`);
              break;
            }

            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║       📱 GORAHA BOT - FILTERED CONTACT SEARCH               ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`🔍 Searching for contacts matching: "${filterString}"\n`);
            console.log(`⏳ Loading...\n`);

            if (onGorahaFilterRequested) {
              try {
                await onGorahaFilterRequested(filterString);
              } catch (error) {
                console.log(`  ❌ Error during search: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha filter not available\n`);
            }
          } else if (!parts[1] || parts[1] === 'status') {
            // Display status (default command)
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║              📱 GORAHA BOT - CONTACT STATUS                ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Fetching GorahaBot contact stats...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(false); // false = use cache if available
              } catch (error) {
                console.log(`  ❌ Error fetching status: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else {
            console.log(`\n⚠️  Usage:`);
            console.log(`  'goraha' or 'goraha status'     → Display contact stats (cached)`);
            console.log(`  'goraha verify'                 → Force verification and recount`);
            console.log(`  'goraha contacts' or 'count'    → Show total contacts count`);
            console.log(`  'goraha filter <string>'        → Search for specific contacts`);
            console.log(`\n  Examples:`);
            console.log(`    goraha filter D2 Security`);
            console.log(`    goraha filter Broker`);
            console.log(`    goraha filter Developer\n`);
          }
          break;

        // NEW: Analytics commands (Phase 29e)
        case 'analytics':
        case 'metrics':
          if (parts[1] === 'report') {
            // Generate full analytics report
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║           📊 FULL ANALYTICS REPORT - PHASE 29e              ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Generating full analytics report...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('full');
              } catch (error) {
                console.log(`  ❌ Error generating report: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else if (parts[1] === 'uptime') {
            // Show uptime metrics for all accounts
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║        ⏱️  UPTIME METRICS - ALL ACCOUNTS (Phase 29e)         ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading uptime metrics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('uptime');
              } catch (error) {
                console.log(`  ❌ Error fetching uptime metrics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else if (parts[1] === 'account' && parts[2]) {
            // Account-specific analytics
            const phoneNumber = parts[2];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║        📈 ACCOUNT ANALYTICS - ${phoneNumber}                   ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading account analytics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('account', phoneNumber);
              } catch (error) {
                console.log(`  ❌ Error fetching account analytics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else {
            // Show real-time metrics dashboard
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📊 REAL-TIME METRICS DASHBOARD - Phase 29e          ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading real-time metrics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('realtime');
              } catch (error) {
                console.log(`  ❌ Error loading metrics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          }
          break;

        // NEW: Phase 30 - Google Sheets CRUD operations
        case 'google':
        case 'sheets':
          if (parts[1] === 'read') {
            const sheetId = parts[2];
            const range = parts[3] || 'Sheet1';
            if (sheetId) {
              if (onGoogleSheetsRead) {
                await onGoogleSheetsRead(sheetId, range);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets read <spreadsheet-id> [range]'`);
              console.log(`     Example: 'sheets read 1A2B3C4D5E6F7G8H Sheet1!A1:Z100'\n`);
            }
          } else if (parts[1] === 'add' || parts[1] === 'create') {
            const sheetId = parts[2];
            const sheetName = parts[3] || 'Sheet1';
            const values = parts.slice(4);
            if (sheetId && values.length > 0) {
              if (onGoogleSheetsCreate) {
                await onGoogleSheetsCreate(sheetId, sheetName, values);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets add <spreadsheet-id> <sheet-name> <value1> [value2] ...'`);
              console.log(`     Example: 'sheets add 1A2B3C4D5E6F7G8H Sheet1 John Doe john@example.com'\n`);
            }
          } else if (parts[1] === 'update') {
            const sheetId = parts[2];
            const cell = parts[3];
            const value = parts.slice(4).join(' ');
            if (sheetId && cell && value) {
              if (onGoogleSheetsUpdate) {
                await onGoogleSheetsUpdate(sheetId, cell, value);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets update <spreadsheet-id> <cell> <value>'`);
              console.log(`     Example: 'sheets update 1A2B3C4D5E6F7G8H Sheet1!A1 Updated Value'\n`);
            }
          } else if (parts[1] === 'delete' || parts[1] === 'remove') {
            const sheetId = parts[2];
            const sheetName = parts[3] || 'Sheet1';
            const rowIndex = parseInt(parts[4]) || 1;
            if (sheetId) {
              if (onGoogleSheetsDelete) {
                await onGoogleSheetsDelete(sheetId, sheetName, rowIndex);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets delete <spreadsheet-id> <sheet-name> [row-index]'`);
              console.log(`     Example: 'sheets delete 1A2B3C4D5E6F7G8H Sheet1 1'\n`);
            }
          } else if (parts[1] === 'search') {
            const sheetId = parts[2];
            const range = parts[3] || 'Sheet1';
            const searchValue = parts.slice(4).join(' ');
            if (sheetId && searchValue) {
              if (onGoogleSheetsSearch) {
                await onGoogleSheetsSearch(sheetId, range, searchValue);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets search <spreadsheet-id> [range] <search-value>'`);
              console.log(`     Example: 'sheets search 1A2B3C4D5E6F7G8H Sheet1 John'\n`);
            }
          } else if (parts[1] === 'info' || parts[1] === 'meta' || parts[1] === 'metadata') {
            const sheetId = parts[2];
            if (sheetId) {
              if (onGoogleSheetsMetadata) {
                await onGoogleSheetsMetadata(sheetId);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets info <spreadsheet-id>'`);
              console.log(`     Example: 'sheets info 1A2B3C4D5E6F7G8H'\n`);
            }
          } else {
            console.log(`\n📊 Google Sheets Operations (Phase 30):`);
            console.log(`   sheets read <id> [range]                → Read sheet data`);
            console.log(`   sheets add <id> <sheet> <values...>     → Add row to sheet`);
            console.log(`   sheets update <id> <cell> <value>       → Update cell value`);
            console.log(`   sheets delete <id> <sheet> [row]        → Delete row`);
            console.log(`   sheets search <id> [range] <text>       → Search for value`);
            console.log(`   sheets info <id>                        → Get sheet metadata\n`);
          }
          break;

        case 'help':
          console.log('Numbered menu: menu | 0 = back | 00 = home | dotted code = direct selection');
          console.log(`\n📚 Available Commands:`);
          console.log(`\n  ACCOUNT MANAGEMENT:`);
          console.log(`    link master               → Link first master WhatsApp account (with health check)`);
          console.log(`    link master <+phone> [n]  → Add additional master WhatsApp account`);
          console.log(`    accounts                  → List all accounts with per-account status`);
          console.log(`\n  ACCOUNT HEALTH & MONITORING:`);
          console.log('    master check              → Check the master live before continuing');
          console.log('    master ready              → Check live; restore saved session if offline; show relink options if needed');
          console.log(`    health <+phone>           → Show detailed health for specific account`);
          console.log(`    stats <+phone>            → Show metrics (uptime, messages, errors)`);
          console.log(`    recover <+phone>          → Attempt session restoration for one account`);
          console.log(`    restore-sessions / restore → Restore ALL previous WhatsApp sessions`);
          console.log(`    restore master [+phone]   → Reactivate the master's saved session (no new code)`);
          console.log(`    p / p<n> / p<n>.<step>    → Playbooks: list, show steps, run one step (e.g. p1.1)`);
          console.log(`\n  GORAHA BOT (Phase 28):`);
          console.log(`    goraha (or 'goraha status')  → Display contact stats (cached)`);
          console.log(`    goraha verify                → Force verification and recount`);
          console.log(`    goraha contacts (count)      → Show total contacts count`);
          console.log(`    goraha filter <string>       → Search contacts by name`);
          console.log(`\n  ANALYTICS (Phase 29e):`);
          console.log(`    analytics or metrics      → Show real-time metrics dashboard`);
          console.log(`    analytics report          → Generate full analytics report`);
          console.log(`    analytics uptime          → Show uptime metrics for all accounts`);
          console.log(`    analytics account <phone> → Show account-specific analytics`);
          console.log(`\n  GOOGLE SHEETS (Phase 30):`);
          console.log(`    sheets read <id> [range]                → Read sheet data`);
          console.log(`    sheets add <id> <sheet> <values...>     → Add row to sheet`);
          console.log(`    sheets update <id> <cell> <value>       → Update cell value`);
          console.log(`    sheets delete <id> <sheet> [row]        → Delete row`);
          console.log(`    sheets search <id> [range] <text>       → Search for value`);
          console.log(`    sheets info <id>                        → Get sheet metadata`);
          console.log(`\n  DEVICE MANAGEMENT:`);
          console.log(`    status / health           → Display full dashboard`);
          console.log(`    relink master [+phone]    → Re-link master account (optional: specify phone)`);
          console.log(`    relink servant [+phone]   → Re-link servant account`);
          console.log(`    relink <phone>            → Re-link specific device`);
          console.log(`    code <phone>              → Request WhatsApp pairing code`);
          console.log('    link-code                 → Link master with a pairing code (this attempt only)');
          console.log('    link-qr                   → Link master with a QR code (this attempt only)');
          console.log(`    device <phone>            → Show detailed device information`);
          console.log('    disconnect <phone>        → Close locally; keep the saved session');
          console.log('    chats [phone] [page]      → List available chats; no message history read');
          console.log('    convos [phone]            → Conversation report: total chats, last conversation, messages per chat');
          console.log('    analyze <phone> <n> [max] → Locally analyze selected chat (1-500 messages)');
          console.log(`    list                      → List all devices`);
          console.log(`    masters                   → Show all master accounts`);
          console.log(`    servants                  → Show all servant accounts`);
          console.log(`\n  MESSAGING & INTELLIGENCE (restored):`);
          console.log(`    send <number> <message>   → Send one message from the master (asks to confirm)`);
          console.log('    outreach <project…>       → Sheet owners of a project: existing chat vs new; today/hold plan under the new-conversation limit');
          console.log('    outreach projects|budget  → Projects in the owners sheet | new conversations used today/this month (by source)');
          console.log('    outreach daily [project…] → Daily run now: plan + CSV + sheet status + draft campaign (start it from campaigns)');
          console.log('    outreach send-today [p…]  → Daily run now: plan + CSV + sheet status + send today\'s verified picks (spaced, in hours)');
          console.log('    outreach auto draft|send <project…> | auto off | auto → Automatic daily run (once a day, restores master first)');
          console.log('    outreach changes [p…]     → Owners sheet changes since the previous daily snapshot');
          console.log('    outreach link [project]   → wa.me link for SMS/email/ads; owner-started chats use no budget');
          console.log(`    validate <number>         → Normalize/validate a number; checks WhatsApp when online`);
          console.log(`    score [+phone]            → Health score 0-100 with trend and recommendations`);
          console.log(`    sentiment <text>          → Sentiment score, label and mood of a text`);
          console.log(`    intent <text>             → Classify intent and suggested reply strategy`);
          console.log(`    similar <a> | <b>         → Compare two names or phone numbers`);
          console.log(`    dedupe <file>             → Find duplicate contacts in CSV/XLSX/JSON`);
          console.log(`\n  SYSTEM:`);
          console.log(`    features / list-all       → Full numbered list of every feature (dotted codes) with usage counters`);
          console.log(`    <code>                    → Run a feature by its code, e.g. 2.1 (link-code), 1.13 (device), 8.2 (validate)`);
          console.log(`    f<id> [args] / #<id>      → Legacy shortcut, e.g. f8 or f21 0501234567 (features f lists F-ids)`);
          console.log(`    help                      → Show this help message`);
          console.log(`    quit / exit               → Exit monitoring\n`);
          break;

        case 'quit':
        case 'exit':
          console.log(`\n👋 Exiting device manager...\n`);
          this.features.flush();
          this.isMonitoring = false;
          this.stopAutoRefresh();
          clearTimeout(this.dashboardRefreshTimer);
          this.layout.close();
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }
          return;

        case '':
          // Empty input - refresh display
          this.displayHealthDashboard(true);
          break;

        default:
          if (input.trim()) {
            console.log(`\n❓ Unknown command: '${command}'. Type 'help' for available commands.\n`);
          }
      }
      } catch (error) {
        this.lastNotice = error.message;
        console.error(`Command failed: ${error.message}`);
      } finally {
        this.commandRunning = false;
        if (!['help', 'menu', 'campaigns', 'features', 'list-all'].includes(command)) {
          this.refreshDashboard();
          // Pinned panels already show the codes; otherwise reprint the list under the output.
          if (this.autoFeatureList && !this.usePanels && this.isMonitoring && !this.isSelectingLinkingMethod &&
              !this.numberMenu.pending && !this.linkingChallenges.size && !this.isCampaignMenuActive?.()) {
            this.printFeatureList();
          }
        }
      }
      if (this.isMonitoring && !this.isSelectingLinkingMethod) {
        this.safePrompt();
      }
    });

    this.rl.on('close', () => {
      this.isMonitoring = false;
      this.layout.close();
      this.stopAutoRefresh();
      clearTimeout(this.dashboardRefreshTimer);
    });

    // Initial display
    this.displayHealthDashboard();
    if (onCheckMaster) {
      this.commandRunning = true;
      try {
        await onCheckMaster();
      } catch (error) {
        console.error(`Master readiness check failed: ${error.message}`);
      } finally {
        this.commandRunning = false;
      }
    }
    if (this.autoFeatureList) this.printFeatureList();
    console.log(COMMAND_HINT);
    this.safePrompt();
  }
};
