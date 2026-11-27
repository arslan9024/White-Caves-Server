// @ts-nocheck
export class ContextAnalysisHelpers {
  _detectIntent(content) {
    const intents = {
      SEARCH: ['find', 'search', 'looking for', 'show me'],
      SCHEDULE: ['schedule', 'meeting', 'viewing', 'appointment', 'when', 'time'],
      PRICING: ['price', 'cost', 'fee', 'commission', 'calculate', 'how much'],
      DOCUMENTATION: ['document', 'contract', 'sign', 'agreement', 'paper'],
      NEGOTIATION: ['negotiate', 'offer', 'bid', 'reduce', 'discount'],
      COMPLAINT: ['problem', 'issue', 'wrong', 'not happy', 'complaint'],
      QUESTION: ['why', 'how', 'what', 'when', 'where', 'who'],
      APPROVAL: ['yes', 'approved', 'agree', 'proceed', 'okay', 'ok'],
    };

    const lowerContent = content.toLowerCase();

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        return intent;
      }
    }

    return 'GENERAL';
  }

  /**
   * Detect sentiment from message
   */
  _detectSentiment(content) {
    const positiveWords = [
      'great',
      'perfect',
      'excellent',
      'happy',
      'satisfied',
      'amazing',
      'wonderful',
    ];
    const negativeWords = ['bad', 'poor', 'angry', 'unhappy', 'problem', 'issue', 'complaint'];

    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerContent.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerContent.includes(w)).length;

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Extract keywords from content
   */
  _extractKeywords(content) {
    const keywords = [];
    const propertyTypes = ['villa', 'apartment', 'townhouse', 'penthouse', 'studio'];
    const locations = ['damac', 'marina', 'downtown', 'jumeirah', 'deira', 'dubai hills'];

    const lowerContent = content.toLowerCase();
    propertyTypes.forEach(type => {
      if (lowerContent.includes(type)) keywords.push(type.toUpperCase());
    });
    locations.forEach(loc => {
      if (lowerContent.includes(loc)) keywords.push(loc.toUpperCase());
    });

    return keywords;
  }

  /**
   * Update context metadata
   */
  _updateMetadata(context, message) {
    if (message.intent) {
      if (!context.metadata.intents.includes(message.intent)) {
        context.metadata.intents.push(message.intent);
      }
    }

    const keywords = this._extractKeywords(message.content);
    keywords.forEach(kw => {
      if (!context.metadata.keywords.includes(kw)) {
        context.metadata.keywords.push(kw);
      }
    });

    // Update complexity
    if (context.conversationHistory.length > 10) {
      context.metadata.complexity = 'COMPLEX';
    }

    // Update priority based on sentiment and intents
    if (message.sentiment === 'NEGATIVE') {
      context.metadata.priority = 'HIGH';
    }
  }

  /**
   * Get recent summary
   */
  _getRecentSummary(context, messageCount) {
    return context.conversationHistory
      .slice(-messageCount)
      .map(m => `${m.senderName}: ${m.content}`)
      .join('\n');
  }

  /**
   * Generate suggestions for assistant
   */
  _generateSuggestionsForAssistant(context, assistantId) {
    const suggestions = [];

    // Suggestion based on intents
    if (context.metadata.intents.includes('SEARCH')) {
      suggestions.push('Client is looking for properties - offer specific recommendations');
    }
    if (context.metadata.intents.includes('PRICING')) {
      suggestions.push('Client asking about pricing - have pricing models ready');
    }
    if (context.metadata.intents.includes('COMPLAINT')) {
      suggestions.push('Client has concern - address immediately with empathy');
    }

    // Suggestion based on conversation length
    if (context.conversationHistory.length > 20) {
      suggestions.push('Long conversation - client is engaged, move toward closing');
    }

    return suggestions;
  }

  /**
   * Get warnings for assistant
   */
  _getContextWarnings(context) {
    const warnings = [];

    // Check for negative sentiment
    const negativeSentiments = context.conversationHistory
      .filter(m => m.sender === 'CLIENT')
      .filter(m => m.sentiment === 'NEGATIVE');

    if (negativeSentiments.length > 0) {
      warnings.push(
        `Client has expressed ${negativeSentiments.length} negative sentiment(s) - handle carefully`
      );
    }

    // Check for blockers
    const recentMessages = context.conversationHistory.slice(-5);
    if (
      recentMessages.some(
        m =>
          m.content.toLowerCase().includes("can't") || m.content.toLowerCase().includes('problem')
      )
    ) {
      warnings.push('Potential blocker identified - resolve before proceeding');
    }

    return warnings;
  }

  /**
   * Determine conversation stage
   */
  _determineConversationStage(context) {
    const intents = context.metadata.intents;

    if (intents.includes('SEARCH')) return 'DISCOVERY';
    if (intents.includes('SCHEDULE')) return 'ENGAGEMENT';
    if (intents.includes('PRICING') || intents.includes('NEGOTIATION')) return 'CONSIDERATION';
    if (intents.includes('DOCUMENTATION') || intents.includes('APPROVAL')) return 'DECISION';

    return 'INITIAL';
  }

  /**
   * Identify main conversation topic
   */
  _identifyMainTopic(context) {
    const intents = context.metadata.intents;
    const keywords = context.metadata.keywords;

    if (intents.includes('SEARCH')) {
      return `Property search: ${keywords.join(', ')}`;
    }
    if (intents.includes('PRICING')) {
      return 'Pricing and financial discussion';
    }
    if (intents.includes('SCHEDULE')) {
      return 'Viewing or meeting scheduling';
    }

    return 'General inquiry';
  }

  /**
   * Extract pending actions
   */
  _extractPendingActions(context) {
    const actions = [];
    const lastMessages = context.conversationHistory.slice(-5);

    lastMessages.forEach(msg => {
      if (msg.intent === 'SCHEDULE') {
        actions.push('Schedule viewing');
      }
      if (msg.intent === 'PRICING') {
        actions.push('Provide pricing quote');
      }
      if (msg.intent === 'DOCUMENTATION') {
        actions.push('Send documents');
      }
    });

    return actions;
  }

  /**
   * Identify blockers
   */
  _identifyBlockers(context) {
    const blockers = [];
    const allMessages = context.conversationHistory.map(m => m.content.toLowerCase()).join(' ');

    if (allMessages.includes('not available') || allMessages.includes("can't")) {
      blockers.push('Availability or capability constraint');
    }
    if (allMessages.includes('budget')) {
      blockers.push('Budget limitation');
    }
    if (allMessages.includes('timeline') || allMessages.includes('deadline')) {
      blockers.push('Time constraint');
    }

    return blockers;
  }

  /**
   * Get average sentiment
   */
  _getAverageSentiment(messages) {
    const sentiments = messages.filter(m => m.sender === 'CLIENT').map(m => m.sentiment);
    const positiveCount = sentiments.filter(s => s === 'POSITIVE').length;
    const negativeCount = sentiments.filter(s => s === 'NEGATIVE').length;

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Generate personalized greeting for next assistant
   */
  _generateGreeting(context, newAssistantId) {
    const clientName = context.clientName;
    const previousAssistant = context.currentAssistant;

    const greetings = {
      MARY: `Hi ${clientName}! I'm Mary from our Inventory team. ${previousAssistant} mentioned you're looking for properties - I have some great options to show you!`,
      THEODORA: `Hi ${clientName}! I'm Theodora from Finance. Let me work up the best payment options for you based on what we discussed.`,
      LINDA: `Hi ${clientName}! I'm Linda. Let's get that viewing scheduled for you right away!`,
      CLARA: `Hi ${clientName}! I'm Clara from our Sales team. I have all the details from our conversation - let's move forward!`,
      SOPHIA: `Hi ${clientName}! I'm Sophia, managing your deal timeline. Let's make sure everything stays on track!`,
    };

    return greetings[newAssistantId] || `Hi ${clientName}! Connecting you with our specialist...`;
  }

  /**
   * Clean up old contexts
   */
}
