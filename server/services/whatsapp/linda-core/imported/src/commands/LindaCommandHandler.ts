// @ts-nocheck
/**
 * LINDA COMMAND HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 * Main command parser and router for Linda AI Assistant
 * 
 * Responsibilities:
 * 1. Parse incoming messages for commands (! prefix)
 * 2. Validate command syntax and arguments
 * 3. Route to appropriate command handler
 * 4. Log conversations and feedback
 * 5. Handle errors gracefully
 * 6. Track usage statistics
 * 
 * Architecture: Command Pattern with Registry
 * - Registry: Centralized command metadata
 * - Handlers: Individual command implementations
 * - Logger: Conversation logging and ML data
 */

import LindaCommandRegistry from './LindaCommandRegistry.js';
import LindaConversationLearner from './LindaConversationLearner.js';
import services from '../core/ServiceRegistry.js';
import CampaignCommands from './CampaignCommands.js';

export class LindaCommandHandler {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.registry = LindaCommandRegistry;
    this.learner = new LindaConversationLearner();
    this.commandHandlers = new Map();
    this.sessionAuth = new Map(); // Track authenticated sessions
    this.usageStats = {
      totalCommands: 0,
      commandsByName: {},
      commandsByCategory: {},
      errorCount: 0,
      successCount: 0,
      startTime: new Date()
    };

    this.initializeHandlers();
  }
}

import { methodsPart1 } from './handler_parts/part1.js';
import { methodsPart2 } from './handler_parts/part2.js';
import { methodsPart3 } from './handler_parts/part3.js';
import { methodsPart4 } from './handler_parts/part4.js';
import { methodsPart5 } from './handler_parts/part5.js';
Object.assign(LindaCommandHandler.prototype, methodsPart1, methodsPart2, methodsPart3, methodsPart4, methodsPart5);


export default LindaCommandHandler;

