// @ts-nocheck
/**
 * LINDA COMMAND REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * Centralized registry of all Linda AI Assistant commands
 * Provides command metadata, help, and validation
 * 
 * Command Categories:
 * 1. WhatsApp Management - Device linking, account control, session management
 * 2. Google Contacts - Contact lookup, sync, add, update, delete
 * 3. Google Sheets - Query, add data, update sheets, create reports
 * 4. Admin - Configuration, diagnostics, status, health monitoring
 * 5. Learning - Conversation logging, feedback, ML training data
 * 
 * Feature: Automatic help generation, command validation, usage tracking
 */

import { registerCommandsPart1 } from './registry_parts/part1.js';
import { registerCommandsPart2 } from './registry_parts/part2.js';
import { registerCommandsPart3 } from './registry_parts/part3.js';
import { registerCommandsPart4 } from './registry_parts/part4.js';
import { registerCommandsPart5 } from './registry_parts/part5.js';

export class LindaCommandRegistry {
  constructor() {
    this.commands = new Map();
    this.commandsByCategory = new Map();
    this.initializeCommands();
  }

  /**
   * Initialize all available commands
   */
  initializeCommands() {
    // ════════════════════════════════════════════════════════════════════════
    registerCommandsPart1(this);
    registerCommandsPart2(this);
    registerCommandsPart3(this);
    registerCommandsPart4(this);
    registerCommandsPart5(this);
  }
  registerCommand(commandData) {
    const {
      name,
      category,
      description,
      usage,
      examples,
      requiresAuth,
      handler,
      helpText
    } = commandData;

    this.commands.set(name, {
      name,
      category,
      description,
      usage,
      examples,
      requiresAuth,
      handler,
      helpText,
      aliases: commandData.aliases || [],
      enabled: true
    });

    if (!this.commandsByCategory.has(category)) {
      this.commandsByCategory.set(category, []);
    }
    this.commandsByCategory.get(category).push(name);
  }

  /**
   * Get a command by name
   */
  getCommand(name) {
    // Check direct name
    let cmd = this.commands.get(name);
    if (cmd) return cmd;

    // Check aliases
    for (const [cmdName, cmdData] of this.commands) {
      if (cmdData.aliases && cmdData.aliases.includes(name)) {
        return cmdData;
      }
    }

    return null;
  }

  /**
   * Get all commands
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category) {
    const cmdNames = this.commandsByCategory.get(category) || [];
    return cmdNames.map(name => this.commands.get(name));
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.commandsByCategory.keys());
  }

  /**
   * Get help text for all commands
   */
  getHelpText(commandName = null) {
    if (!commandName) {
      // Return help for all commands grouped by category
      const helpText = {};
      for (const category of this.getCategories()) {
        const commands = this.getCommandsByCategory(category);
        helpText[category] = commands.map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          usage: cmd.usage
        }));
      }
      return helpText;
    }

    // Return specific command help
    const cmd = this.getCommand(commandName);
    return cmd || null;
  }

  /**
   * Validate a command
   */
  isValidCommand(name) {
    return this.commands.has(name) || 
           Array.from(this.commands.values()).some(cmd => 
             cmd.aliases && cmd.aliases.includes(name)
           );
  }

  /**
   * Get command count
   */
  getCommandCount() {
    return this.commands.size;
  }

  /**
   * Get category count
   */
  getCategoryCount() {
    return this.commandsByCategory.size;
  }
}

export default new LindaCommandRegistry();
