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


export const methodsPart4 = {
  getUserProfile(userId) {
    try {
      const conversation = this.conversations.get(userId);
      
      if (!conversation || !conversation.messages || conversation.messages.length === 0) {
        return {
          userId,
          conversationCount: 0,
          messageCount: 0,
          name: null,
          company: null,
          preferences: [],
          lastInteraction: null
        };
      }

      const messages = conversation.messages;
      
      // Extract name and company from messages
      let name = null;
      let company = null;
      const preferences = [];
      
      for (const message of messages) {
        if (!message) continue;
        
        // Support both body and text fields - try to extract text
        let text = '';
        if (message.body) {
          text = String(message.body).trim();
        } else if (message.text) {
          text = String(message.text).trim();
        }
        
        if (!text) continue;
        
        // Extract name - multiple patterns
        if (!name) {
          // Pattern 1: "My name is John"
          let match = text.match(/my\s+name\s+is\s+([A-Za-z]+)/i);
          if (match) {
            name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          }
          
          // Pattern 2: "Name: John"
          if (!match) {
            match = text.match(/name\s*:\s*([A-Za-z]+)/i);
            if (match) {
              name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            }
          }
          
          // Pattern 3: Look for capitalized words that look like names (fallback)
          if (!match) {
            const words = text.split(/\s+/);
            for (const word of words) {
              // Check if word is capitalized and not a common word
              const commonWords = ['my', 'name', 'is', 'and', 'i', 'work', 'at', 'for', 'the', 'a', 'an'];
              if (/^[A-Z][a-z]+$/.test(word) && !commonWords.includes(word.toLowerCase())) {
                name = word;
                break;
              }
            }
          }
        }
        
        // Extract company - multiple patterns
        if (!company) {
          // Pattern 1: "I work at Google" or "work at Google"
          let match = text.match(/(?:work\s+at|work\s+for)\s+([A-Za-z0-9&\s]+?)(?:\s+and|\s+or|$|\.)/i);
          if (match) {
            company = match[1].trim();
          }
          
          // Pattern 2: "Company: Google"
          if (!match) {
            match = text.match(/company\s*:\s*([A-Za-z0-9&\s]+?)(?:\s|$|\.)/i);
            if (match) {
              company = match[1].trim();
            }
          }
        }
        
        // Extract preferences
        const prefMatch = text.match(/(?:i\s+prefer|prefer)\s+([^.!?]+)/gi);
        if (prefMatch) {
          prefMatch.forEach(pref => {
            const cleaned = pref.replace(/^(?:i\s+prefer|prefer)\s+/i, '').trim();
            if (cleaned && !preferences.includes(cleaned)) {
              preferences.push(cleaned);
            }
          });
        }
      }
      
      return {
        userId,
        conversationCount: 1,
        messageCount: messages.length,
        name: name,
        company: company,
        preferences: preferences,
        lastInteraction: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        createdAt: conversation.createdAt
      };
    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message });
      return { userId, conversationCount: 0, messageCount: 0, name: null, company: null, preferences: [], lastInteraction: null };
    }
  },

  getLearningStats() {
    const allConversations = Array.from(this.conversations.values());
    const conversationsWithFeedback = allConversations.filter(c => c.feedback).length;
    const averageRating = allConversations.reduce((sum, c) => sum + (c.feedback?.rating || 0), 0) / allConversations.length;

    return {
      totalConversations: this.conversations.size,
      conversationsAnalyzed: allConversations.length,
      conversationsWithFeedback,
      averageRating: averageRating.toFixed(2),
      learningEnabled: this.learningEnabled,
      patternsLearned: this.conversationPatterns.size
    };
  },

  getEngineStats() {
    return {
      conversationsStored: this.conversations.size,
      patternsIdentified: this.conversationPatterns.size,
      topicsTracked: Object.keys(this.topicKewords).length,
      learningStats: this.getLearningStats()
    };
  },

  async isReady() {
    // Engine is ready immediately when instantiated
    return Promise.resolve(true);
  },

  getConversationTopic(contactId) {
    try {
      if (!contactId) return 'general';
      
      const conversation = this.conversations.get(contactId);
      if (!conversation) {
        return 'general';
      }

      // If we have explicit topic set, return it
      if (conversation.topic) {
        return conversation.topic;
      }

      // Otherwise, analyze messages for topics
      if (conversation.messages && conversation.messages.length > 0) {
        const topics = this.analyzeTopics(conversation.messages);
        if (topics && topics.length > 0) {
          return topics[0];  // Return primary topic
        }
      }

      return 'general';
    } catch (error) {
      logger.error('Failed to get conversation topic', { error: error.message });
      return 'general';
    }
  },

  clearHistory() {
    this.conversationHistory = [];
    this.conversations.clear();
    return { success: true, cleared: true };
  },

  getConversationContext(contactId) {
    const conversation = this.conversations.get(contactId);
    if (!conversation) {
      return { 
        contactId, 
        messages: [], 
        messageCount: 0,
        firstMessage: null,
        lastMessage: null,
        context: {} 
      };
    }
    const messages = conversation.messages || [];
    return {
      contactId,
      messages: messages,
      messageCount: messages.length,
      firstMessage: messages.length > 0 ? messages[0].body || messages[0].text : null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].body || messages[messages.length - 1].text : null,
      context: conversation.context || {},
      topic: conversation.topic || 'general'
    };
  },

  clearConversationHistory(contactId) {
    if (contactId) {
      this.conversations.delete(contactId);
      return { success: true, contactId };
    }
    this.conversationHistory = [];
    this.conversations.clear();
    return { success: true, allCleared: true };
  },

  getTopicHistory(contactId) {
    const conversation = this.conversations.get(contactId);
    if (!conversation || !conversation.topicHistory) {
      return [];
    }
    return conversation.topicHistory;
  }
};
