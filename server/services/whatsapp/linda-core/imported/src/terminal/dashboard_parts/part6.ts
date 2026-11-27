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


export const methodsPart6 = {
  displayQuickStatus() {
    const report = accountHealthMonitor.generateDetailedHealthReport();
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 QUICK STATUS`);
    console.log(`${'─'.repeat(60)}`);

    if (this.deviceManager) {
      const count = this.deviceManager.getDeviceCount();
      console.log(`Devices: ${count.linked}/${count.total} linked | Status: ${count.unlinked} unlinked, ${count.linking} linking`);
    }

    console.log(`WhatsApp: ${report.whatsappAccounts.active} active, ${report.whatsappAccounts.inactive} inactive, ${report.whatsappAccounts.warning} warning`);
    console.log(`Google: ${report.googleAccounts.connected} of ${report.googleAccounts.total} connected`);
    console.log(`System Uptime: ${report.systemStatus.uptime}`);
    console.log(`${'─'.repeat(60)}\n`);
  },

  displayDeviceDetails(phoneNumber) {
    if (!this.deviceManager) {
      console.log(`\n❌ Device manager not available\n`);
      return;
    }

    const device = this.deviceManager.getDevice(phoneNumber);
    if (!device) {
      console.log(`\n❌ Device not found: ${phoneNumber}\n`);
      return;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📱 DEVICE DETAILS: ${device.name}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Phone Number:     ${device.phoneNumber}`);
    console.log(`Device ID:        ${device.deviceId}`);
    console.log(`Role:             ${device.role}`);
    console.log(`Status:           ${device.status}`);
    console.log(`Online:           ${device.isOnline ? '✅ Yes' : '❌ No'}`);
    console.log(`\nAuthentication:`);
    console.log(`  Method:         ${device.authMethod || 'Not set'}`);
    console.log(`  Linked At:      ${device.linkedAt || 'Never'}`);
    console.log(`  Link Attempts:  ${device.linkAttempts}/${device.maxLinkAttempts}`);
    console.log(`\nActivity:`);
    console.log(`  Uptime:         ${Math.floor(device.uptime / 3600000)}h ${Math.floor((device.uptime % 3600000) / 60000)}m`);
    console.log(`  Last Heartbeat: ${device.lastHeartbeat || 'N/A'}`);
    console.log(`  Last Activity:  ${device.lastActivity || 'N/A'}`);
    console.log(`  Heartbeat Count:${device.heartbeatCount}`);
    console.log(`\nNetwork:`);
    console.log(`  IP Address:     ${device.ipAddress || 'N/A'}`);
    console.log(`\nStatus:`);
    console.log(`  Last Error:     ${device.lastError || 'None'}`);
    console.log(`  Recovery Mode:  ${device.recoveryMode ? '🟡 Yes' : '🟢 No'}`);
    console.log(`${'═'.repeat(60)}\n`);
  },

  listAllDevices() {
    if (!this.deviceManager) {
      console.log(`\n❌ Device manager not available\n`);
      return;
    }

    const devices = this.deviceManager.getAllDevices();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📱 ALL DEVICES (${devices.length} total)`);
    console.log(`${'═'.repeat(60)}`);

    devices.forEach((device, idx) => {
      const statusSymbol = {
        linked: '✅',
        unlinked: '❌',
        linking: '⏳',
        error: '⚠️',
      }[device.status] || '❓';

      console.log(`${idx + 1}. ${statusSymbol} ${device.phoneNumber} - ${device.name} [${device.role}]`);
    });

    console.log(`${'═'.repeat(60)}\n`);
  },

  _calculateHealthScore(device) {
    try {
      if (!device) return 0;

      let score = 0;

      // Status points (40)
      if (device.status === 'linked') score += 40;
      else if (device.status === 'linking') score += 20;

      // Online status points (30)
      if (device.isOnline) score += 30;

      // Uptime points (20)
      if (device.uptime > 3600000) score += 20; // > 1 hour
      else if (device.uptime > 600000) score += 10; // > 10 mins

      // Error penalty (-10)
      if (device.lastError) score -= 10;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error(`  ❌ Error calculating health score: ${error.message}`);
      return 0;
    }
  },

  _getHealthStatus(healthScore) {
    if (healthScore >= 80) return '🟢 HEALTHY';
    if (healthScore >= 50) return '🟡 FAIR';
    if (healthScore >= 20) return '🟠 POOR';
    return '🔴 CRITICAL';
  },

  displayAnalyticsMetrics(metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         📊 REAL-TIME METRICS DASHBOARD - PHASE 29e          ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics) {
        console.log(`  ⚠️  No metrics available\n`);
        return;
      }

      // Overall metrics
      console.log(`📈 OVERALL METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Messages Sent:     ${metrics.totalMessages || 0}`);
      console.log(`  Total Errors:            ${metrics.totalErrors || 0}`);
      console.log(`  System Uptime:           ${metrics.systemUptime || '--'}`);
      console.log(`  Active Accounts:         ${metrics.activeAccounts || 0}`);
      console.log();

      // Per-account metrics
      if (metrics.accountMetrics && Object.keys(metrics.accountMetrics).length > 0) {
        console.log(`📱 PER-ACCOUNT METRICS`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        Object.entries(metrics.accountMetrics).forEach(([phone, data]) => {
          console.log(`  ${phone}:`);
          console.log(`    Messages:             ${data.messageCount || 0}`);
          console.log(`    Errors:               ${data.errorCount || 0}`);
          console.log(`    Success Rate:         ${data.successRate?.toFixed(2) || '--'}%`);
          console.log(`    Uptime:               ${data.uptime || '--'}`);
        });
        console.log();
      }

      console.log(`💡 Commands:`);
      console.log(`  • 'analytics report'           → Generate full report`);
      console.log(`  • 'analytics uptime'           → Show uptime metrics`);
      console.log(`  • 'analytics account <phone>'  → Account-specific metrics\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying metrics: ${error.message}\n`);
    }
  },

  displayUptimeMetrics(metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         ⏱️  UPTIME METRICS - ALL ACCOUNTS (Phase 29e)        ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics || !metrics.accountMetrics) {
        console.log(`  ⚠️  No uptime data available\n`);
        return;
      }

      console.log(`📊 ACCOUNT UPTIME SUMMARY`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Accounts:          ${Object.keys(metrics.accountMetrics).length}`);
      console.log();

      Object.entries(metrics.accountMetrics).forEach(([phone, data]) => {
        const uptime = data.uptime || '--';
        const uptimePercent = data.uptimePercentage?.toFixed(2) || '--';
        const statusSymbol = data.isOnline ? '🟢' : '🔴';
        
        console.log(`  ${statusSymbol} ${phone}`);
        console.log(`     Uptime:               ${uptime}`);
        console.log(`     SLA Compliance:       ${uptimePercent}%`);
        console.log(`     Last Check:           ${data.lastCheck ? new Date(data.lastCheck).toLocaleTimeString() : '--'}`);
      });
      console.log();

      console.log(`💡 SLA Target: 99.9% availability\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying uptime metrics: ${error.message}\n`);
    }
  },

  displayAccountAnalytics(phoneNumber, metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         📈 ACCOUNT ANALYTICS - ${phoneNumber}                   ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics) {
        console.log(`  ⚠️  No analytics data for ${phoneNumber}\n`);
        return;
      }

      console.log(`📊 ACCOUNT PERFORMANCE`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Phone Number:            ${phoneNumber}`);
      console.log(`  Status:                  ${metrics.status || '--'}`);
      console.log(`  Connection:              ${metrics.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
      console.log();

      console.log(`📈 ACTIVITY METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Messages Sent:           ${metrics.messageCount || 0}`);
      console.log(`  Errors Encountered:      ${metrics.errorCount || 0}`);
      console.log(`  Success Rate:            ${metrics.successRate?.toFixed(2) || '--'}%`);
      console.log();

      console.log(`⏱️  UPTIME METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Uptime:            ${metrics.uptime || '--'}`);
      console.log(`  SLA Compliance:          ${metrics.uptimePercentage?.toFixed(2) || '--'}%`);
      console.log(`  Last Heartbeat:          ${metrics.lastHeartbeat ? new Date(metrics.lastHeartbeat).toLocaleTimeString() : '--'}`);
      console.log();

      if (metrics.lastError) {
        console.log(`⚠️  RECENT ISSUE`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`  Error:                   ${metrics.lastError.message || metrics.lastError}`);
        console.log(`  Time:                    ${metrics.lastError.timestamp ? new Date(metrics.lastError.timestamp).toLocaleTimeString() : '--'}`);
        console.log();
      }

      console.log(`💡 Commands:`);
      console.log(`  • 'analytics'            → Real-time metrics dashboard`);
      console.log(`  • 'analytics report'     → Full analytics report`);
      console.log(`  • 'health <phone>'       → Detailed health report\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying account analytics: ${error.message}\n`);
    }
  },

  close() {
    this.stopAutoRefresh();
    this.features.flush();
    this.layout.close();
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.isMonitoring = false;
  }
};
