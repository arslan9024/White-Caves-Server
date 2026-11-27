// @ts-nocheck
import { EventEmitter } from 'events';

export class AIIntentClassifier extends EventEmitter {
  constructor() {
    super();
    this.intents = {
      property_inquiry: {
        keywords: ['price', 'cost', 'how much', 'available', 'rent', 'buy', 'bedroom', 'sqft', 'location', 'area', 'size', 'payment plan'],
        weight: 1.0
      },
      viewing_request: {
        keywords: ['visit', 'see', 'viewing', 'tour', 'appointment', 'schedule', 'meet', 'show me', 'can i view'],
        weight: 1.2
      },
      documentation: {
        keywords: ['document', 'contract', 'paper', 'sign', 'ejari', 'title deed', 'noc', 'mortgage', 'loan'],
        weight: 1.0
      },
      negotiation: {
        keywords: ['offer', 'negotiate', 'discount', 'best price', 'deal', 'lower', 'final price', 'reduce'],
        weight: 1.1
      },
      urgency: {
        keywords: ['urgent', 'asap', 'immediately', 'today', 'now', 'quick', 'hurry', 'emergency'],
        weight: 1.3
      },
      greeting: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'salam', 'marhaba', 'good afternoon'],
        weight: 0.8
      },
      opt_out: {
        keywords: ['stop', 'unsubscribe', 'remove', 'do not send', 'opt-out', 'no more', 'delete my number', 'block'],
        weight: 1.5
      },
      complaint: {
        keywords: ['problem', 'issue', 'complaint', 'unhappy', 'disappointed', 'wrong', 'not satisfied', 'terrible'],
        weight: 1.2
      },
      thank_you: {
        keywords: ['thank', 'thanks', 'appreciate', 'grateful', 'shukran', 'excellent service'],
        weight: 0.7
      },
      follow_up: {
        keywords: ['update', 'status', 'progress', 'any news', 'waiting', 'heard back', 'response'],
        weight: 0.9
      },
      payment_inquiry: {
        keywords: ['payment', 'pay', 'cheque', 'bank', 'transfer', 'installment', 'down payment'],
        weight: 1.0
      },
      location_inquiry: {
        keywords: ['where', 'location', 'address', 'near', 'close to', 'metro', 'mall', 'school'],
        weight: 0.9
      }
    };

    this.arabicIntents = {
      property_inquiry: {
        keywords: ['سعر', 'كم', 'متاح', 'إيجار', 'شراء', 'غرفة', 'مساحة', 'موقع'],
        weight: 1.0
      },
      greeting: {
        keywords: ['السلام', 'مرحبا', 'صباح', 'مساء', 'أهلا'],
        weight: 0.8
      },
      thank_you: {
        keywords: ['شكرا', 'ممتن', 'جزاك الله'],
        weight: 0.7
      },
      opt_out: {
        keywords: ['توقف', 'أوقف', 'احذف', 'لا ترسل'],
        weight: 1.5
      },
      viewing_request: {
        keywords: ['معاينة', 'زيارة', 'أرى', 'موعد'],
        weight: 1.2
      }
    };

    this.contextPatterns = [
      { pattern: /(\d+)\s*(bed|br|bedroom)/i, intent: 'property_inquiry', boost: 0.2 },
      { pattern: /aed\s*[\d,]+/i, intent: 'property_inquiry', boost: 0.25 },
      { pattern: /(villa|apartment|studio|townhouse|penthouse)/i, intent: 'property_inquiry', boost: 0.15 },
      { pattern: /(tomorrow|next week|this weekend)/i, intent: 'viewing_request', boost: 0.2 },
      { pattern: /(palm|marina|downtown|jvc|jlt|business bay)/i, intent: 'location_inquiry', boost: 0.15 }
    ];
  }

  async classifyIntent(message) {
    const lowerMessage = message.toLowerCase();
    const results = [];

    for (const [intent, config] of Object.entries(this.intents)) {
      const matches = config.keywords.filter(kw => lowerMessage.includes(kw));
      if (matches.length > 0) {
        const confidence = Math.min(0.95, 0.4 + (matches.length * 0.12 * config.weight));
        results.push({ intent, confidence, matchedKeywords: matches, language: 'english' });
      }
    }

    for (const [intent, config] of Object.entries(this.arabicIntents)) {
      const matches = config.keywords.filter(kw => message.includes(kw));
      if (matches.length > 0) {
        const existing = results.find(r => r.intent === intent);
        if (existing) {
          existing.confidence = Math.min(0.98, existing.confidence + 0.15);
          existing.language = 'bilingual';
        } else {
          results.push({
            intent,
            confidence: Math.min(0.95, 0.45 + (matches.length * 0.12 * config.weight)),
            matchedKeywords: matches,
            language: 'arabic'
          });
        }
      }
    }

    for (const { pattern, intent, boost } of this.contextPatterns) {
      if (pattern.test(message)) {
        const existing = results.find(r => r.intent === intent);
        if (existing) {
          existing.confidence = Math.min(0.98, existing.confidence + boost);
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    this.emit('classification', { message, results });

    return {
      primaryIntent: results[0] || { intent: 'general', confidence: 0.25 },
      secondaryIntents: results.slice(1, 3),
      allIntents: results,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    };
  }

  addCustomIntent(name, keywords, weight = 1.0) {
    this.intents[name] = { keywords, weight };
    return true;
  }

  removeIntent(name) {
    if (this.intents[name]) {
      delete this.intents[name];
      return true;
    }
    return false;
  }
}
