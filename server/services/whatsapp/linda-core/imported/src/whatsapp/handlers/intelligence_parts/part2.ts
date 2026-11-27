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


export const methodsPart2 = {
  identifyPatterns(messages) {
    const lengths = messages.map(m => (m.body || m.text || '').length);
    const patterns = {
      conversationLength: messages.length,
      averageMessageLength: lengths.reduce((sum, len) => sum + len, 0) / messages.length || 0,
      longestMessage: Math.max(...lengths, 0),
      shortestMessage: Math.min(...lengths.filter(l => l > 0), 0),
      totalCharacters: lengths.reduce((sum, len) => sum + len, 0),
      questionCount: messages.filter(m => (m.body || m.text || '').includes('?')).length,
      exclamationCount: messages.filter(m => (m.body || m.text || '').includes('!')).length,
      hasUrls: messages.some(m => /https?:\/\//.test(m.body || m.text || '')),
      hasEmojis: messages.some(m => /[\u{1F600}-\u{1F64F}]/u.test(m.body || m.text || '')),
      hasNumbers: messages.some(m => /\d+/.test(m.body || m.text || ''))
    };

    // Store pattern for learning
    if (this.learningEnabled) {
      this.conversationPatterns.set(Date.now().toString(), patterns);
    }

    return patterns;
  },

  extractKeyPhrases(messages) {
    const keyPhrases = [];
    const allText = messages.map(m => m.text || '').join(' ');
    const words = allText.toLowerCase().split(/\s+/);

    // Extract 2-3 word phrases that appear multiple times
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      const existing = keyPhrases.find(kp => kp.phrase === phrase);

      if (existing) {
        existing.frequency++;
      } else if (words[i].length > 3 && words[i + 1].length > 3) {
        keyPhrases.push({ phrase, frequency: 1 });
      }
    }

    return keyPhrases
      .filter(kp => kp.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  },

  calculateEngagement(messages) {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const botMessages = messages.filter(m => m.sender === 'bot').length;

    return {
      totalMessages,
      userMessages,
      botMessages,
      exchangeRatio: totalMessages > 0 ? (userMessages / totalMessages).toFixed(2) : 0,
      isPaired: userMessages > 0 && botMessages > 0,
      isActive: totalMessages > 5
    };
  },

  calculateAverageResponseTime(messages) {
    let totalTime = 0;
    let responseCount = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].sender === 'user' && messages[i + 1].sender === 'bot') {
        const time = new Date(messages[i + 1].timestamp) - new Date(messages[i].timestamp);
        totalTime += time;
        responseCount++;
      }
    }

    return responseCount > 0 ? Math.round(totalTime / responseCount) : 0;
  },

  generateSummary(messages) {
    const topics = this.extractTopics(messages);
    const intents = this.recognizeIntents(messages);
    const mainTopic = topics.length > 0 ? topics[0].topic : 'unknown';
    const mainIntent = intents.length > 0 ? intents[0].intents[0]?.intent || 'unknown' : 'unknown';

    return {
      messageCount: messages.length,
      mainTopic,
      mainIntent,
      duration: messages.length > 0 
        ? new Date(messages[messages.length - 1].timestamp) - new Date(messages[0].timestamp)
        : 0,
      topicCount: topics.length,
      intentCount: intents.length
    };
  },

  async addToHistory(message, botContext) {
    try {
      const conversationId = botContext?.contact?.id || 'unknown';
      let conversation = this.conversations.get(conversationId);
      
      if (!conversation) {
        conversation = {
          messages: [],
          topicHistory: [],
          createdAt: new Date().toISOString()
        };
      }

      // Add message
      conversation.messages.push({
        ...message,
        timestamp: new Date().toISOString(),
        from: botContext?.contact?.id
      });

      // Track topic for this message
      const text = message.body || message.text || '';
      let topic = 'general';
      
      // Simple topic detection
      if (text.toLowerCase().includes('order')) topic = 'order';
      else if (text.toLowerCase().includes('support') || text.toLowerCase().includes('help')) topic = 'support';
      else if (text.toLowerCase().includes('product')) topic = 'product';
      else if (text.toLowerCase().includes('billing') || text.toLowerCase().includes('payment')) topic = 'billing';
      
      // Store topic transition
      if (!conversation.topicHistory) {
        conversation.topicHistory = [];
      }
      if (conversation.topicHistory.length === 0 || conversation.topicHistory[conversation.topicHistory.length - 1].topic !== topic) {
        conversation.topicHistory.push({
          topic,
          timestamp: new Date().toISOString(),
          messageIndex: conversation.messages.length - 1
        });
      }

      // Apply context window constraint
      if (conversation.messages.length > this.contextWindow) {
        conversation.messages = conversation.messages.slice(-this.contextWindow);
      }

      this.conversations.set(conversationId, conversation);
      logger.info('Added message to history', { conversationId });

      return { success: true, conversationId };
    } catch (error) {
      logger.error('Failed to add to history', { error: error.message });
      throw error;
    }
  },

  async detectUrgency(message) {
    try {
      if (!message || (!message.body && !message.text)) {
        return { urgencyLevel: 0.3 };
      }

      const text = (message.body || message.text || '').toLowerCase();
      let urgencyLevel = 0.3;
      
      // Check for critical keywords first (highest priority)
      const criticalKeywords = ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'now', 'crisis', 'help me', 'help', 'please help'];
      for (const keyword of criticalKeywords) {
        if (text.includes(keyword)) {
          urgencyLevel = 0.85;
          break;
        }
      }

      // If not critical, check for high urgency
      if (urgencyLevel === 0.3) {
        const highKeywords = ['important', 'soon', 'quickly', 'hurry', 'rush', 'serious', 'please'];
        for (const keyword of highKeywords) {
          if (text.includes(keyword)) {
            urgencyLevel = 0.75;
            break;
          }
        }
      }

      // Boost score if message has multiple exclamation marks
      const originalText = message.body || message.text || '';
      const exclamationCount = (originalText.match(/!/g) || []).length;
      if (exclamationCount >= 2) {
        urgencyLevel = Math.min(urgencyLevel + 0.1, 0.99);
      } else if (exclamationCount === 1) {
        urgencyLevel = Math.min(urgencyLevel + 0.05, 0.95);
      }

      return { urgencyLevel };
    } catch (error) {
      logger.error('Failed to detect urgency', { error: error.message });
      return { urgencyLevel: 0.3 };
    }
  },

  async extractEntities(message) {
    try {
      if (!message || (!message.body && !message.text)) {
        return { entities: [] };  // ← Return object with entities array
      }

      const text = message.body || message.text || '';
      
      // Regex patterns for various entity types
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      // Phone patterns: flexible matching for different phone formats
      // Matches: 555-1234, 555-555-5555, (555) 555-5555, +1-555-555-5555, etc.
      const phoneRegex = /(?:\+\d{1,3})?[-.\s]?(?:\(?\d{3}\)?)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;
      const nameRegex = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g;
      const orderRegex = /#\d+|order\s*#?\d+/gi;
      
      // Location names (common cities/countries)
      const locationRegex = /\b(New York|London|Paris|Tokyo|Dubai|Singapore|San Francisco|Los Angeles|New Zealand|Australia|Canada|India|China|Brazil)\b/gi;
      
      // Date patterns
      const dateRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}\b/gi;

      // Extract entities
      const emails = text.match(emailRegex) || [];
      const phones = text.match(phoneRegex) || [];
      const names = text.match(nameRegex) || [];
      const orders = text.match(orderRegex) || [];
      const locations = text.match(locationRegex) || [];
      const dates = text.match(dateRegex) || [];

      const entities = [
        ...names.map(n => ({ type: 'PERSON', text: n })),
        ...emails.map(e => ({ type: 'EMAIL', text: e })),
        ...phones.map(p => ({ type: 'PHONE', text: p })),
        ...orders.map(o => ({ type: 'ORDER_ID', text: o })),
        ...locations.map(l => ({ type: 'LOCATION', text: l })),
        ...dates.map(d => ({ type: 'DATE', text: d }))
      ];

      // Remove duplicates
      const uniqueEntities = Array.from(
        new Map(entities.map(e => [e.type + ':' + e.text, e])).values()
      );

      return {
        entities: uniqueEntities,  // ← Wrap in object with entities property
        count: uniqueEntities.length
      };
    } catch (error) {
      logger.error('Failed to extract entities', { error: error.message });
      return { entities: [], count: 0 };  // ← Return object with empty entities array
    }
  }
};
