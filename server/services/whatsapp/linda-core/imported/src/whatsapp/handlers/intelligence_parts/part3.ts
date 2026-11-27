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


export const methodsPart3 = {
  async detectIntent(message) {
    try {
      if (!message || (!message.body && !message.text)) {
        return { intent: 'unknown', confidence: 0, alternatives: [] };
      }

      const text = (message.body || message.text || '').toLowerCase();

      // Detect complaint intent FIRST (highest priority)
      if (/\b(complaint|problem|issue|error|broken|fail|doesn't work|not working|upset|unhappy)\b/.test(text)) {
        return {
          intent: 'complaint',
          confidence: 0.85,
          alternatives: ['request', 'statement'],
          text
        };
      }

      // Detect request intent - look for request keywords before checking for questions
      if (/\b(can you|could you|would you|can i|could i|i need|i want|i'd like|send me|give me|please)\b/.test(text)) {
        return {
          intent: 'request',
          confidence: 0.85,
          alternatives: ['query', 'statement'],
          text
        };
      }

      // Detect greeting intent
      if (/^(hello|hi|hey|greetings|good morning|good afternoon|good evening)/.test(text)) {
        return {
          intent: 'greeting',
          confidence: 0.95,
          alternatives: ['statement'],
          text
        };
      }

      // Detect query/question intent (look for question marks and question words)
      if (/\?$/.test(text) || /\b(what|how|where|when|why|who)\b/.test(text)) {
        return {
          intent: 'query',
          confidence: 0.90,
          alternatives: ['question', 'request'],
          text
        };
      }

      // Detect confirmation intent
      if (/\b(yes|yeah|ok|okay|sure|confirm|confirmed|agreed)\b/.test(text)) {
        return {
          intent: 'confirmation',
          confidence: 0.90,
          alternatives: ['statement'],
          text
        };
      }

      // Detect rejection intent
      if (/\b(no|nope|don't|disagree|cancel|stop|don't want)\b/.test(text)) {
        return {
          intent: 'rejection',
          confidence: 0.90,
          alternatives: ['statement'],
          text
        };
      }

      // Default to statement/unknown
      return {
        intent: 'statement',
        confidence: 0.5,
        alternatives: ['query', 'request'],
        text
      };
    } catch (error) {
      logger.error('Failed to detect intent', { error: error.message });
      return { intent: 'unknown', confidence: 0, error: error.message };
    }
  },

  async getSentimentAnalysis(message) {
    try {
      if (!message || !message.body) {
        return { sentiment: 'neutral', score: 0 };
      }

      const result = this.analyzeSentiment([message]);
      return {
        sentiment: result.overall,
        score: parseFloat(result.score),
        details: result.details?.[0],
        category: result.overall
      };
    } catch (error) {
      logger.error('Failed to analyze sentiment', { error: error.message });
      return { sentiment: 'neutral', score: 0, error: error.message };
    }
  },

  learnFromFeedback(conversationId, feedback) {
    try {
      if (!this.learningEnabled) {
        return { success: false, message: 'Learning is disabled' };
      }

      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      conversation.feedback = {
        rating: feedback.rating,
        comment: feedback.comment,
        timestamp: new Date().toISOString(),
        helpful: feedback.helpful || false,
        improvements: feedback.improvements || []
      };

      logger.info('Learning from feedback', { conversationId, rating: feedback.rating });

      return { success: true, conversationId };
    } catch (error) {
      logger.error('Failed to learn from feedback', { error: error.message });
      throw error;
    }
  },

  getConversationInsights(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    return {
      conversationId,
      analysis: conversation.analysis,
      feedback: conversation.feedback,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  },

  isPositiveWord(word) {
    const positiveWords = [
      'good', 'great', 'excellent', 'awesome', 'perfect', 'thank', 'thanks', 'happy', 'love', 'amazing',
      'nice', 'wonderful', 'fantastic', 'cool', 'prefer', 'pleasure', 'appreciate', 'brilliant',
      'positive', 'best', 'beautiful', 'wonderful', 'brilliant', 'okay', 'ok', 'better', 'getting',
      'delighted', 'pleased', 'glad', 'thrilled', 'excited', 'superb', 'outstanding', 'remarkable',
      'fabulous', 'marvelous', 'fun', 'enjoy', 'enjoyed', 'joy', 'joyful'
    ];
    return positiveWords.includes(word);
  },

  isNegativeWord(word) {
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'poor', 'worst', 'fail', 'error', 'problem', 
      'issue', 'useless', 'broken', 'wrong', 'sick', 'disgusting', 'sad', 'upset', 
      'angry', 'furious', 'disappointed', 'disappointed', 'frustrated', 'annoyed',
      'miserable', 'depressed', 'unhappy', 'gloomy', 'pathetic',  'horrible'
    ];
    return negativeWords.includes(word);
  },

  storeMessage(message, botContext) {
    try {
      const conversationId = botContext?.contact?.id || 'unknown';
      const conversation = this.conversations.get(conversationId);
      if (conversation && conversation.messages) {
        conversation.messages.push({
          ...message,
          timestamp: new Date().toISOString(),
          from: botContext?.contact?.id
        });
      }
      return { success: true };
    } catch (error) {
      logger.error('Failed to store message', { error: error.message });
      return { success: false };
    }
  },

  updateSentimentThresholds(thresholds) {
    if (thresholds.positive !== undefined) {
      this.sentimentThresholds.positive = thresholds.positive;
    }
    if (thresholds.negative !== undefined) {
      this.sentimentThresholds.negative = thresholds.negative;
    }
  },

  categorizeSentiment(score) {
    if (score >= this.sentimentThresholds.positive) {
      return 'positive';
    }

    if (score <= this.sentimentThresholds.negative) {
      return 'negative';
    }

    return 'neutral';
  },

  getConversationHistory(conversationId = null) {
    try {
      if (conversationId) {
        const conversation = this.conversations.get(conversationId);
        return conversation ? conversation.messages || [] : [];
      }
      
      // Return all conversation messages
      const allMessages = [];
      for (const conversation of this.conversations.values()) {
        if (conversation.messages) {
          allMessages.push(...conversation.messages);
        }
      }
      return allMessages;
    } catch (error) {
      logger.error('Failed to get conversation history', { error: error.message });
      return [];
    }
  }
};
