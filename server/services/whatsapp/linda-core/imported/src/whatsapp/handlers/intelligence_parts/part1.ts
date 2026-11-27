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


export const methodsPart1 = {
  async initialize() {
    try {
      this.initialized = true;
      logger.info('Conversation Intelligence Engine initialized successfully');
      return { success: true, message: 'Intelligence engine ready' };
    } catch (error) {
      logger.error('Failed to initialize intelligence engine', { error: error.message });
      throw error;
    }
  },

  async processMessage(message, botContext) {
    try {
      const messageText = message?.body || message?.text;
      if (!message || !messageText) {
        return {
          success: true,
          isEmpty: true,
          messageId: message?.id,
          timestamp: new Date().toISOString(),
          contactId: botContext?.contact?.id
        };
      }

      const tokens = messageText.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      const sentiment = this.analyzeSentiment([message]);
      const topics = this.extractTopics([message]);
      const intents = this.recognizeIntents([message]);

      return {
        success: true,
        isEmpty: false,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        contactId: botContext?.contact?.id,
        analysis: {
          sentiment: sentiment.overall,
          sentimentScore: sentiment.score,
          topics,
          intents,
          wordCount: tokens.length
        },
        tokens,
        body: messageText,
        metadata: {
          from: botContext?.contact?.id,
          timestamp: new Date().toISOString(),
          messageId: message.id
        }
      };
    } catch (error) {
      logger.error('Error processing message', { error: error.message });
      return {
        success: false,
        error: error.message,
        messageId: message?.id
      };
    }
  },

  initializeTopicKeywords() {
    return {
      greeting: ['hello', 'hi', 'hey', 'greetings', 'welcome', 'good morning', 'good afternoon', 'good evening'],
      contact: ['contact', 'phone', 'number', 'email', 'address', 'reach', 'call', 'message', 'whatsapp'],
      schedule: ['meeting', 'appointment', 'schedule', 'time', 'date', 'when', 'availability', 'book'],
      payment: ['payment', 'invoice', 'bill', 'cost', 'price', 'fee', 'charge', 'pay', 'transaction'],
      error: ['error', 'problem', 'issue', 'fail', 'not working', 'broken', 'crash', 'bug', 'wrong'],
      feedback: ['thank', 'great', 'awesome', 'good', 'excellent', 'hate', 'bad', 'terrible', 'poor'],
      technical: ['sync', 'database', 'server', 'connection', 'api', 'data', 'integration', 'system'],
      help: ['help', 'assist', 'support', 'guide', 'how to', 'tutorial', 'instructions', 'steps']
    };
  },

  analyzeConversation(conversationId, messages) {
    try {
      const analysis = {
        conversationId,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
        sentiment: this.analyzeSentiment(messages),
        topics: this.extractTopics(messages),
        intents: this.recognizeIntents(messages),
        patterns: this.identifyPatterns(messages),
        keyPhrases: this.extractKeyPhrases(messages),
        engagement: this.calculateEngagement(messages),
        averageResponseTime: this.calculateAverageResponseTime(messages),
        summary: this.generateSummary(messages)
      };

      // Store conversation analysis
      this.conversations.set(conversationId, {
        messages,
        analysis,
        topicHistory: messages.map((msg, index) => {
          let topic = 'general';
          if (msg.body || msg.text) {
            const text = (msg.body || msg.text).toLowerCase();
            if (text.includes('order')) topic = 'order';
            else if (text.includes('support') || text.includes('help')) topic = 'support';
            else if (text.includes('product')) topic = 'product';
            else if (text.includes('billing') || text.includes('payment')) topic = 'billing';
          }
          return { topic, messageIndex: index, timestamp: msg.timestamp };
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      logger.info('Conversation analyzed', { conversationId, messageCount: messages.length });

      return {
        success: true,
        conversationId,
        analysis
      };
    } catch (error) {
      logger.error('Failed to analyze conversation', { error: error.message });
      throw error;
    }
  },

  analyzeSentiment(messages) {
    // Handle both single message and array of messages
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    const sentiments = messageArray.map(msg => {
      const text = msg.body?.toLowerCase() || msg.text?.toLowerCase() || '';
      const words = text.split(/\s+/);

      let score = 0;
      let wordCount = 0;
      let positiveCount = 0;
      let negativeCount = 0;

      for (let word of words) {
        // Remove punctuation from word
        word = word.replace(/[.,!?;:\'"—\-()[\]{}]/g, '');
        
        if (word.length === 0) continue; // Skip empty words
        
        if (this.isPositiveWord(word)) {
          score += 1;
          wordCount++;
          positiveCount++;
        } else if (this.isNegativeWord(word)) {
          score -= 1;
          wordCount++;
          negativeCount++;
        }
      }

      const sentiment = wordCount > 0 ? score / wordCount : 0;

      return {
        messageId: msg.id,
        sentiment,
        score: score,
        wordCount,
        positiveCount,
        negativeCount,
        category: this.categorizeSentiment(sentiment)
      };
    });

    const averageSentiment = sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length;
    const category = this.categorizeSentiment(averageSentiment);
    
    // Calculate confidence based on word count and sentiment strength
    let confidence = 0.3; // Default low confidence
    const totalWords = sentiments.reduce((sum, s) => sum + s.wordCount, 0);
    if (totalWords > 2) {
      confidence = Math.min(0.9, 0.4 + (totalWords * 0.1));
    }

    return {
      overall: category,
      sentiment: category,  // ← Backward compatibility
      score: parseFloat(averageSentiment.toFixed(2)),
      confidence: confidence,  // ← ADD: Confidence field for tests
      details: sentiments,
      sentiments: sentiments,  // ← ADD: For tests that expect this field
      positive: sentiments.filter(s => s.category === 'positive').length,
      neutral: sentiments.filter(s => s.category === 'neutral').length,
      negative: sentiments.filter(s => s.category === 'negative').length
    };
  },

  extractTopics(messages) {
    const topics = {};
    const text = messages.map(m => (m.body || m.text || '').toLowerCase()).join(' ');

    for (const [topic, keywords] of Object.entries(this.topicKewords)) {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > 0) {
        topics[topic] = {
          count: matches,
          relevance: (matches / messages.length).toFixed(2)
        };
      }
    }

    const sortedTopics = Object.entries(topics)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([topic, data]) => ({ topic, ...data }));

    return sortedTopics.length > 0 ? sortedTopics : [];
  },

  recognizeIntents(messages) {
    const intents = [];

    for (const message of messages) {
      const text = (message.body || message.text || '').toLowerCase();
      const detected = {
        messageId: message.id,
        intents: []
      };

      // Detect common intents
      if (/^(hello|hi|hey|greetings)/.test(text)) {
        detected.intents.push({ intent: 'greeting', confidence: 0.95 });
      }

      if (/\b(help|support|assist)\b/.test(text)) {
        detected.intents.push({ intent: 'help_request', confidence: 0.9 });
      }

      if (/\?$/.test(text) || text.includes('what') || text.includes('how')) {
        detected.intents.push({ intent: 'question', confidence: 0.85 });
      }

      if (/\b(confirm|yes|okay|ok)\b/.test(text)) {
        detected.intents.push({ intent: 'confirmation', confidence: 0.9 });
      }

      if (/\b(no|disagree|cancel)\b/.test(text)) {
        detected.intents.push({ intent: 'rejection', confidence: 0.9 });
      }

      if (/\b(complaint|problem|issue|error|broken|fail)\b/.test(text)) {
        detected.intents.push({ intent: 'complaint', confidence: 0.85 });
      }

      if (detected.intents.length > 0) {
        intents.push(detected);
      }
    }

    return intents;
  }
};
