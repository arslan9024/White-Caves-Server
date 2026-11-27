// @ts-nocheck
import { ContextAnalysisHelpers } from './contextAnalysisHelpers.js';

export class ContextPreservationEngine extends ContextAnalysisHelpers {
  constructor() {
    this.conversationContexts = new Map(); // conversationId -> context
    this.retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  /**
   * Initialize context for a new conversation
   */
  initializeContext(conversationId, clientData = {}) {
    const context = {
      conversationId,
      clientId: clientData.clientId,
      clientName: clientData.clientName,
      clientTier: clientData.clientTier || 'BASIC',
      clientBudget: clientData.budget,
      clientPreferences: {
        propertyType: clientData.preferredPropertyType || [],
        locations: clientData.preferredLocations || [],
        language: clientData.preferredLanguage || 'ENGLISH',
        communicationChannels: clientData.preferredChannels || ['EMAIL', 'WHATSAPP'],
      },
      conversationHistory: [],
      contextSummary: '',
      currentAssistant: null,
      previousAssistants: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      metadata: {
        complexity: 'SIMPLE',
        priority: 'NORMAL',
        keywords: [],
        intents: [],
      },
    };

    this.conversationContexts.set(conversationId, context);
    return context;
  }

  /**
   * Add message to conversation history
   */
  addMessage(conversationId, message) {
    const context = this.conversationContexts.get(conversationId);
    if (!context) {
      return { error: 'Context not found' };
    }

    const messageRecord = {
      timestamp: new Date(),
      sender: message.sender, // 'ASSISTANT' or 'CLIENT'
      senderName: message.senderName || 'Unknown',
      messageType: message.type || 'TEXT', // TEXT, DOCUMENT, LINK, etc.
      content: message.content,
      intent: this._detectIntent(message.content),
      sentiment: this._detectSentiment(message.content),
      attachments: message.attachments || [],
    };

    context.conversationHistory.push(messageRecord);
    context.lastUpdated = new Date();

    // Update metadata
    this._updateMetadata(context, messageRecord);

    // Generate context summary every 5 messages
    if (context.conversationHistory.length % 5 === 0) {
      context.contextSummary = this._generateContextSummary(context);
    }

    return { success: true, messageId: context.conversationHistory.length };
  }

  /**
   * Switch current assistant and prepare handoff
   */
  switchAssistant(conversationId, newAssistantId, reason = '') {
    const context = this.conversationContexts.get(conversationId);
    if (!context) {
      return { error: 'Context not found' };
    }

    // Record previous assistant
    if (context.currentAssistant) {
      context.previousAssistants.push({
        assistantId: context.currentAssistant,
        duration: Date.now() - context.lastAssistantChange || 0,
        timestamp: new Date(),
      });
    }

    context.currentAssistant = newAssistantId;
    context.lastAssistantChange = Date.now();

    // Generate handoff summary
    const handoffSummary = this._generateHandoffSummary(context, newAssistantId);

    return {
      success: true,
      handoffData: handoffSummary,
      contextForNewAssistant: this._prepareContextForAssistant(context, newAssistantId),
    };
  }

  /**
   * Get context for current assistant
   */
  getContextForAssistant(conversationId, assistantId) {
    const context = this.conversationContexts.get(conversationId);
    if (!context) {
      return { error: 'Context not found' };
    }

    return {
      clientId: context.clientId,
      clientName: context.clientName,
      clientTier: context.clientTier,
      clientPreferences: context.clientPreferences,
      recentConversationSummary: this._getRecentSummary(context, 5), // Last 5 messages
      fullContextSummary: context.contextSummary,
      conversationHistory: context.conversationHistory.slice(-10), // Last 10 messages
      intents: [...new Set(context.metadata.intents)],
      keywords: [...new Set(context.metadata.keywords)],
      complexity: context.metadata.complexity,
      priority: context.metadata.priority,
      suggestions: this._generateSuggestionsForAssistant(context, assistantId),
      warnings: this._getContextWarnings(context),
    };
  }

  /**
   * Generate context summary for brief review
   */
  _generateContextSummary(context) {
    const messages = context.conversationHistory.slice(-20); // Last 20 messages

    let summary = `Client: ${context.clientName} (${context.clientTier} tier)\n`;
    summary += `Budget: ${context.clientBudget ? 'AED ' + context.clientBudget : 'Not specified'}\n`;
    summary += `Preferences: ${context.clientPreferences.propertyType.join(', ') || 'Not specified'}\n`;
    summary += `Locations: ${context.clientPreferences.locations.join(', ') || 'Not specified'}\n`;
    summary += `Key Points:\n`;

    // Extract key points from last messages
    const keyMessages = messages.filter(m => m.type === 'TEXT' && m.content.length > 50);
    keyMessages.slice(-3).forEach(msg => {
      const brief = msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
      summary += `  - ${msg.senderName}: ${brief}\n`;
    });

    return summary;
  }

  /**
   * Generate handoff summary
   */
  _generateHandoffSummary(context, newAssistantId) {
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    const clientMessages = context.conversationHistory.filter(m => m.sender === 'CLIENT');
    const latestClientMessage = clientMessages[clientMessages.length - 1];

    return {
      fromAssistant: context.currentAssistant,
      toAssistant: newAssistantId,
      reason: 'Specialist needed for next phase',
      clientCurrentNeed: latestClientMessage?.intent || 'Unknown',
      lastInteraction: lastMessage?.content || 'No recent message',
      clientSentiment: this._getAverageSentiment(context.conversationHistory),
      urgency: context.metadata.priority,
      contextPreserved: true,
      suggestedGreeting: this._generateGreeting(context, newAssistantId),
    };
  }

  /**
   * Prepare context for new assistant to use
   */
  _prepareContextForAssistant(context, assistantId) {
    const recentMessages = context.conversationHistory.slice(-10);

    return {
      conversationState: {
        clientName: context.clientName,
        clientTier: context.clientTier,
        stage: this._determineConversationStage(context),
        progress: context.conversationHistory.length, // Number of exchanges
      },
      clientData: {
        budget: context.clientBudget,
        preferences: context.clientPreferences,
        previousAssistants: context.previousAssistants.map(a => a.assistantId),
      },
      immediateContext: {
        lastClientMessage: context.conversationHistory.filter(m => m.sender === 'CLIENT').pop()
          ?.content,
        conversationTopic: this._identifyMainTopic(context),
        pendingActions: this._extractPendingActions(context),
        blockers: this._identifyBlockers(context),
      },
      recentHistory: recentMessages.map(m => ({
        speaker: m.senderName,
        message: m.content,
        intent: m.intent,
      })),
    };
  }

  /**
   * Detect intent from message
   */

  cleanupOldContexts() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [conversationId, context] of this.conversationContexts.entries()) {
      const age = now - context.createdAt.getTime();
      if (age > this.retentionPeriod) {
        this.conversationContexts.delete(conversationId);
        deletedCount++;
      }
    }

    return { deletedCount, remaining: this.conversationContexts.size };
  }

  /**
   * Get context statistics
   */
  getStatistics() {
    let totalMessages = 0;
    let totalContexts = this.conversationContexts.size;
    let avgMessagesPerContext = 0;

    for (const context of this.conversationContexts.values()) {
      totalMessages += context.conversationHistory.length;
    }

    if (totalContexts > 0) {
      avgMessagesPerContext = Math.round(totalMessages / totalContexts);
    }

    return {
      activeContexts: totalContexts,
      totalMessages,
      averageMessagesPerContext: avgMessagesPerContext,
      retentionPeriodDays: this.retentionPeriod / (24 * 60 * 60 * 1000),
    };
  }
}

// Export both engine classes
