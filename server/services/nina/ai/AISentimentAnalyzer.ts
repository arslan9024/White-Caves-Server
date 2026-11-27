// @ts-nocheck
import { EventEmitter } from 'events';

export class AISentimentAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.lexicon = {
      positive: {
        strong: ['excellent', 'amazing', 'perfect', 'wonderful', 'fantastic', 'outstanding', 'love'],
        moderate: ['good', 'great', 'nice', 'happy', 'pleased', 'satisfied', 'helpful'],
        mild: ['okay', 'fine', 'interested', 'curious', 'considering']
      },
      negative: {
        strong: ['terrible', 'awful', 'horrible', 'hate', 'worst', 'scam', 'fraud'],
        moderate: ['bad', 'disappointed', 'frustrated', 'angry', 'annoyed', 'upset'],
        mild: ['not sure', 'hesitant', 'concern', 'worry', 'doubt']
      },
      urgency: {
        high: ['urgent', 'asap', 'immediately', 'emergency', 'critical'],
        medium: ['soon', 'quickly', 'today', 'this week'],
        low: ['eventually', 'sometime', 'no rush', 'whenever']
      }
    };

    this.negationWords = ['not', "don't", "doesn't", "won't", "can't", "never", "no"];
    this.intensifiers = ['very', 'really', 'extremely', 'absolutely', 'totally'];
  }

  async analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveScore = 0;
    let negativeScore = 0;
    let urgencyScore = 0;
    const indicators = { positive: [], negative: [], urgency: [] };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = words[i - 1] || '';
      const isNegated = this.negationWords.includes(prevWord);
      const isIntensified = this.intensifiers.includes(prevWord);
      const multiplier = isIntensified ? 1.5 : 1;

      for (const [level, levelWords] of Object.entries(this.lexicon.positive)) {
        if (levelWords.some(w => word.includes(w))) {
          const baseScore = level === 'strong' ? 0.3 : level === 'moderate' ? 0.2 : 0.1;
          if (isNegated) {
            negativeScore += baseScore * multiplier;
            indicators.negative.push(word);
          } else {
            positiveScore += baseScore * multiplier;
            indicators.positive.push(word);
          }
        }
      }

      for (const [level, levelWords] of Object.entries(this.lexicon.negative)) {
        if (levelWords.some(w => word.includes(w))) {
          const baseScore = level === 'strong' ? 0.3 : level === 'moderate' ? 0.2 : 0.1;
          if (isNegated) {
            positiveScore += baseScore * 0.5;
            indicators.positive.push(`not ${word}`);
          } else {
            negativeScore += baseScore * multiplier;
            indicators.negative.push(word);
          }
        }
      }

      for (const [level, levelWords] of Object.entries(this.lexicon.urgency)) {
        if (levelWords.some(w => lowerText.includes(w))) {
          urgencyScore = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
          indicators.urgency.push(word);
        }
      }
    }

    let sentiment = 'neutral';
    let score = 0.5;

    if (positiveScore > negativeScore + 0.1) {
      sentiment = 'positive';
      score = Math.min(1, 0.5 + positiveScore);
    } else if (negativeScore > positiveScore + 0.1) {
      sentiment = 'negative';
      score = Math.max(0, 0.5 - negativeScore);
    }

    const result = {
      sentiment,
      score: Math.round(score * 100) / 100,
      confidence: Math.min(0.95, 0.6 + Math.abs(positiveScore - negativeScore)),
      indicators,
      urgency: urgencyScore > 0,
      urgencyLevel: urgencyScore >= 3 ? 'high' : urgencyScore >= 2 ? 'medium' : urgencyScore >= 1 ? 'low' : 'none',
      requiresEscalation: sentiment === 'negative' && negativeScore > 0.3,
      timestamp: new Date().toISOString()
    };

    this.emit('analyzed', result);
    return result;
  }

  addToLexicon(category, level, words) {
    if (this.lexicon[category] && this.lexicon[category][level]) {
      this.lexicon[category][level].push(...words);
      return true;
    }
    return false;
  }
}
