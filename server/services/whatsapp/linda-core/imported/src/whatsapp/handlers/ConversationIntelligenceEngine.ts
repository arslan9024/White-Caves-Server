// @ts-nocheck
/**
 * Conversation Intelligence Engine for WhatsApp Integration
 * Analyzes and learns from conversations for improved responses
 * 
 * Features:
 * - Conversation analysis and sentiment detection
 * - Topic extraction and categorization
 * - Intent recognition
 * - Learning from user interactions
 * - Response quality assessment
 * - Conversation patterns identification
 * - User preference tracking
 * - Knowledge base learning
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const loggerModule = require('../../integrations/google/utils/logger.js');
const logger = loggerModule?.logger || loggerModule?.default || loggerModule;

class ConversationIntelligenceEngine {
  constructor(options = {}) {
    this.conversations = new Map();
    this.conversationPatterns = new Map();
    this.conversationHistory = [];  // ← ADD: For test compatibility
    this.contextWindow = options.contextWindow || options.maxContextLength || 5;  // ← ADD: Accept both contextWindow and maxContextLength
    this.sentimentThresholds = options.sentimentThresholds || {
      positive: 0.1,  // ← LOWERED FURTHER: More sensitive to positive sentiment (was 0.2)
      negative: -0.1  // ← LOWERED FURTHER: More sensitive to negative sentiment (was -0.2)
    };
    this.learningEnabled = options.learningEnabled !== false;
    this.minContextWords = options.minContextWords || 3;
    this.topicKewords = this.initializeTopicKeywords();
    this.initialized = false;
  }
}

import { methodsPart1 } from './intelligence_parts/part1.js';
import { methodsPart2 } from './intelligence_parts/part2.js';
import { methodsPart3 } from './intelligence_parts/part3.js';
import { methodsPart4 } from './intelligence_parts/part4.js';
import { methodsPart5 } from './intelligence_parts/part5.js';
import { methodsPart6 } from './intelligence_parts/part6.js';
import { triageIncomingDh2Reply } from '../../../dh2ReplyTriage.js';
Object.assign(ConversationIntelligenceEngine.prototype, methodsPart1, methodsPart2, methodsPart3, methodsPart4, methodsPart5, methodsPart6);

ConversationIntelligenceEngine.prototype.triageIncomingReply = function (phone, messageText) {
  return triageIncomingDh2Reply(phone, messageText);
};


module.exports = ConversationIntelligenceEngine;

