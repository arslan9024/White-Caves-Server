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
import accountHealthMonitor from '../accounts/AccountHealthMonitor.js';
import TerminalNumberMenu from './TerminalNumberMenu.js';
import services from '../core/ServiceRegistry.js';
import { SessionManager } from '../sessions/SessionManager.js';
import TerminalLayout, { colorize, PANEL_COLORS } from './TerminalLayout.js';
import FeatureCatalog from './FeatureCatalog.js';
import TerminalPlaybooks, { PLAYBOOKS } from './TerminalPlaybooks.js';
import { conversationReportLines, conversationSummaryLines } from './TerminalConversationAnalysis.js';
import { getNewConversationGuard } from '../outreach/MasterChatDirectory.js';
import OutreachCommand from '../outreach/OutreachCommand.js';
import OutreachDailyRunner from '../outreach/OutreachDailyRunner.js';
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

class TerminalHealthDashboard {
  constructor() {
    this.rl = null;
    this.isMonitoring = false;
    this.deviceManager = null; // Will be set by index.js
    this.accountConfigManager = null; // NEW: Will be set by index.js
    this.autoRefreshInterval = null;
    this.autoRefreshDelay = 60000; // 60 seconds
    this.masterPhoneNumber = null; // Set by index.js
    this.isSelectingLinkingMethod = false;
    this.linkingPromptQueue = Promise.resolve();
    this.numberMenu = new TerminalNumberMenu(this);
    this.linkingChallenges = new Set();
    this.lastDashboard = '';
    this.lastCommand = '';
    this.lastNotice = '';
    this.dashboardRefreshTimer = null;
    this.commandRunning = false;
    this.layout = new TerminalLayout(process.stdout);
    this.layout.onResize = () => this.displayHealthDashboard(true);
    this.activeQuestion = null;
    this.pairingCodes = new Map();
    this.features = new FeatureCatalog();
    this.playbooks = new TerminalPlaybooks(
      this.numberMenu,
      () => this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber || null,
      key => this.features.actionCount(key),
    );
    this.startedAt = Date.now();
    this.conversationReporter = null;
    this.conversationJobs = new Map();
    this.conversationTimers = new Map();
    this.inboxCountJobs = new Map();
    this.inboxCountAttempts = new Set();
  }
}

import { methodsPart1 } from './dashboard_parts/part1.js';
import { methodsPart2 } from './dashboard_parts/part2.js';
import { methodsPart3 } from './dashboard_parts/part3.js';
import { methodsPart4 } from './dashboard_parts/part4.js';
import { methodsPart5 } from './dashboard_parts/part5.js';
import { methodsPart6 } from './dashboard_parts/part6.js';
Object.assign(TerminalHealthDashboard.prototype, methodsPart1, methodsPart2, methodsPart3, methodsPart4, methodsPart5, methodsPart6);


// Create singleton instance
const terminalHealthDashboard = new TerminalHealthDashboard();

export default terminalHealthDashboard;
export { TerminalHealthDashboard };

