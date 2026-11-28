/**
 * ninaEngine.ts — NinaBotAgent extends BaseAIAgent (AEG-042 <350 lines)
 * Hybrid OOP + Functional NLP Engine for White Caves Real Estate.
 */

import {
  BaseAIAgent,
  type AgentIdentity,
  type AgentTaskResult,
  type BaseAIAgentConfig,
} from '../ai/BaseAIAgent.js';
import {
  CONFIDENCE_GATE_THRESHOLD,
  Intent,
  type ConversationContext,
  type Entity,
  type HandoffPayload,
  type IntentResult,
  type IntentScore,
  type SentimentResult,
} from './ninaTypes.js';
import {
  buildIntentKeywords,
  buildSentimentLexicon,
  normalizeMessage,
} from './ninaPatterns.js';

export * from './ninaTypes.js';

export const DEFAULT_NINA_IDENTITY: AgentIdentity = {
  id: 'SUP-04-1-01-1',
  name: 'Nina NLP Bot',
  department: 'DEPT-04',
  supervisorChain: {
    md: 'MD-01',
    coo: 'AI Zoe',
    director: 'DIR-04',
    manager: 'MGR-04-1',
    assistantManager: 'AMGR-04-1-01',
    supervisor: 'SUP-04-1-01-1',
  },
};

export class NinaBotAgent extends BaseAIAgent {
  private readonly intentKeywords: Map<Intent, string[]>;
  private readonly sentimentKeywords: Map<string, number>;
  private readonly learningData = new Map<
    string,
    { actualIntent: Intent; predictedIntent: Intent; timestamp: Date }
  >();

  constructor(
    identity: AgentIdentity = DEFAULT_NINA_IDENTITY,
    config: BaseAIAgentConfig = {},
  ) {
    super(identity, config);
    this.intentKeywords = buildIntentKeywords();
    this.sentimentKeywords = buildSentimentLexicon();
  }

  async executeTask<TInput, TOutput>(
    taskType: string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>> {
    return this.runTask<TOutput>(taskType, async () => {
      if (taskType === 'process_message') {
        const { message, context } = payload as unknown as {
          message: string;
          context: ConversationContext;
        };
        return this.processMessage(message, context) as unknown as TOutput;
      }
      throw new Error(`Unsupported NinaBotAgent task: ${taskType}`);
    });
  }

  public processMessage(message: string, context: ConversationContext): IntentResult {
    const normalized = normalizeMessage(message);
    const sentiment = this.analyzeSentiment(normalized);
    const primary = this.detectPrimaryIntent(normalized, context);
    const secondary = this.detectSecondaryIntents(normalized, primary.intent);
    const entities = this.extractEntities(normalized);
    const topics = this.extractTopics(normalized, entities);
    const requiresAgentHandoff = this.shouldHandoffToAgent(
      primary.intent,
      sentiment,
      context,
      primary.confidence,
    );
    const handoffPayload = requiresAgentHandoff
      ? this.buildHandoffPayload(primary, sentiment, entities, context)
      : undefined;
    const suggestedResponse = this.generateResponse(
      primary.intent,
      sentiment,
      context,
      requiresAgentHandoff,
    );

    return {
      primary,
      secondary,
      entities,
      sentiment,
      topics,
      requiresAgentHandoff,
      handoffPayload,
      suggestedResponse,
      timestamp: new Date(),
    };
  }

  public recordFeedback(messageId: string, actualIntent: Intent, predictedIntent: Intent): void {
    if (actualIntent !== predictedIntent) {
      this.learningData.set(messageId, {
        actualIntent,
        predictedIntent,
        timestamp: new Date(),
      });
    }
  }

  private detectPrimaryIntent(message: string, context: ConversationContext): IntentScore {
    const scores = new Map<Intent, number>();
    for (const [intent, keywords] of this.intentKeywords) {
      const score = this.scoreMatch(message, keywords);
      if (score > 0) scores.set(intent, score);
    }
    for (const recentIntent of context.recentIntents.slice(0, 3)) {
      const current = scores.get(recentIntent) || 0;
      scores.set(recentIntent, Math.max(current * 1.5, current + 0.2));
    }

    let topIntent = Intent.UNKNOWN;
    let topScore = 0;
    for (const [intent, score] of scores) {
      if (score > topScore) {
        topScore = score;
        topIntent = intent;
      }
    }

    const confidence = Math.min(100, Math.max(0, topScore * 100));
    return {
      intent: topIntent,
      confidence,
      reasoning: `Matched ${topIntent} with confidence ${confidence.toFixed(0)}%`,
    };
  }

  private detectSecondaryIntents(message: string, primaryIntent: Intent): IntentScore[] {
    const scores: Array<{ intent: Intent; score: number }> = [];
    for (const [intent, keywords] of this.intentKeywords) {
      if (intent === primaryIntent) continue;
      const score = this.scoreMatch(message, keywords);
      if (score > 0.05) scores.push({ intent, score });
    }
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => ({
        intent: s.intent,
        confidence: Math.min(100, s.score * 100),
        reasoning: `Secondary match for ${s.intent}`,
      }));
  }

  private scoreMatch(message: string, keywords: string[]): number {
    let matches = 0;
    for (const kw of keywords) {
      if (message.includes(kw)) matches += 1;
    }
    return Math.min(1, matches * 0.3);
  }

  private analyzeSentiment(message: string): SentimentResult {
    let total = 0;
    const keywords: string[] = [];
    for (const [word, weight] of this.sentimentKeywords) {
      if (message.includes(word)) {
        total += weight;
        keywords.push(word);
      }
    }
    const score = Math.max(-1, Math.min(1, total));
    const sentiment = score > 0.15 ? 'POSITIVE' : score < -0.15 ? 'NEGATIVE' : 'NEUTRAL';
    return { sentiment, score, keywords };
  }

  private extractEntities(message: string): Entity[] {
    const entities: Entity[] = [];
    const propTypes = ['apartment', 'villa', 'townhouse', 'penthouse', 'office', 'plot'];
    for (const pt of propTypes) {
      if (message.includes(pt)) entities.push({ type: 'PROPERTY_TYPE', value: pt, confidence: 0.9 });
    }
    const locations = ['marina', 'downtown', 'palm', 'jumeirah', 'jvc', 'business bay', 'creek'];
    for (const loc of locations) {
      if (message.includes(loc)) entities.push({ type: 'LOCATION', value: loc, confidence: 0.85 });
    }
    const brMatch = message.match(/(\d+)\s*(br|bed|bedroom|bedrooms)/i);
    if (brMatch) entities.push({ type: 'BEDROOMS', value: `${brMatch[1]}BR`, confidence: 0.9 });

    const priceMatch = message.match(/(\d+(?:\.\d+)?)\s*(m|k|million|aed|usd)/i);
    if (priceMatch) entities.push({ type: 'PRICE', value: priceMatch[0], confidence: 0.85 });

    const amenities = ['pool', 'gym', 'parking', 'balcony', 'garden', 'beach'];
    for (const am of amenities) {
      if (message.includes(am)) entities.push({ type: 'AMENITY', value: am, confidence: 0.8 });
    }
    return entities;
  }

  private extractTopics(message: string, entities: Entity[]): string[] {
    const topics = new Set<string>(entities.map(e => e.type));
    if (message.includes('rent') || message.includes('lease')) topics.add('LEASING');
    if (message.includes('buy') || message.includes('invest')) topics.add('SALES');
    return Array.from(topics);
  }

  private shouldHandoffToAgent(
    intent: Intent,
    sentiment: SentimentResult,
    context: ConversationContext,
    confidence: number,
  ): boolean {
    if (confidence < CONFIDENCE_GATE_THRESHOLD) return true;
    if (intent.startsWith('COMPLAINT')) return true;
    if (intent === Intent.ASSISTANCE_NEEDED || context.needsAssistance) return true;
    if (sentiment.sentiment === 'NEGATIVE' && sentiment.score <= -0.5) return true;
    return false;
  }

  private buildHandoffPayload(
    primary: IntentScore,
    sentiment: SentimentResult,
    entities: Entity[],
    context: ConversationContext,
  ): HandoffPayload {
    const reason: HandoffPayload['reason'] = primary.intent.startsWith('COMPLAINT')
      ? 'COMPLAINT'
      : primary.intent === Intent.ASSISTANCE_NEEDED || context.needsAssistance
        ? 'ASSISTANCE_NEEDED'
        : sentiment.sentiment === 'NEGATIVE' && sentiment.score <= -0.5
          ? 'NEGATIVE_SENTIMENT'
          : 'LOW_CONFIDENCE';

    const suggestedQueue: HandoffPayload['suggestedQueue'] =
      reason === 'COMPLAINT'
        ? 'COMPLAINTS'
        : primary.intent.startsWith('PURCHASE')
          ? 'SALES'
          : reason === 'ASSISTANCE_NEEDED'
            ? 'SUPPORT'
            : 'GENERAL';

    return {
      reason,
      confidence: primary.confidence,
      detectedIntent: primary.intent,
      entities,
      sentiment,
      conversationId: context.conversationId,
      customerName: context.customerName,
      customerPhone: context.customerPhone,
      suggestedQueue,
    };
  }

  private generateResponse(
    intent: Intent,
    sentiment: SentimentResult,
    context: ConversationContext,
    requiresHandoff: boolean,
  ): string {
    const name = context.customerName ? ` ${context.customerName}` : '';
    if (requiresHandoff) {
      return `Thank you${name}. I am connecting you with a dedicated White Caves specialist to assist you right away.`;
    }
    if (intent === Intent.GREETING) {
      return `Hello${name}! Welcome to White Caves Real Estate. How can I help you today?`;
    }
    if (intent === Intent.FAREWELL) {
      return `Thank you for contacting White Caves Real Estate${name}. Have a great day!`;
    }
    if (sentiment.sentiment === 'POSITIVE') {
      return `Glad to help${name}! Let me share the best matching options for you.`;
    }
    return `I have noted your request${name} and am preparing the details for you.`;
  }
}

export type NinaEngine = NinaBotAgent;
export const NinaEngine = NinaBotAgent;
export const ninaEngine = new NinaBotAgent();
