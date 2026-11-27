// @ts-nocheck
import { EventEmitter } from 'events';

export class AILeadScorer extends EventEmitter {
  constructor() {
    super();
    this.weights = {
      responseSpeed: { points: 15, description: 'Quick response time' },
      messageCount: { points: 10, description: 'Active engagement' },
      questionAsked: { points: 20, description: 'Asking questions' },
      budgetMentioned: { points: 25, description: 'Budget discussion' },
      timeframeMentioned: { points: 15, description: 'Timeline interest' },
      propertySpecific: { points: 20, description: 'Specific property interest' },
      viewingRequested: { points: 30, description: 'Viewing requested' },
      documentRequested: { points: 25, description: 'Document inquiry' },
      negotiationInitiated: { points: 20, description: 'Negotiation started' },
      repeatContact: { points: 15, description: 'Repeat customer' },
      premiumArea: { points: 10, description: 'Premium area interest' },
      readyBuyer: { points: 25, description: 'Ready to purchase' }
    };

    this.premiumAreas = ['palm', 'downtown', 'marina', 'emirates hills', 'jumeirah', 'bluewaters'];
    this.readySignals = ['mortgage approved', 'cash buyer', 'ready to move', 'looking to close', 'immediate'];
  }

  async scoreLeadFromConversation(conversation) {
    let score = 0;
    const factors = [];
    const text = (conversation.messages || []).join(' ').toLowerCase();

    if (conversation.responseTimeMinutes && conversation.responseTimeMinutes < 30) {
      const points = this.weights.responseSpeed.points;
      score += points;
      factors.push({ factor: this.weights.responseSpeed.description, points });
    }

    if (conversation.messageCount > 3) {
      const points = Math.min(this.weights.messageCount.points, conversation.messageCount * 2);
      score += points;
      factors.push({ factor: this.weights.messageCount.description, points });
    }

    if (text.includes('price') || text.includes('cost') || text.includes('budget') || text.includes('aed') || /\d{3,}/.test(text)) {
      const points = this.weights.budgetMentioned.points;
      score += points;
      factors.push({ factor: this.weights.budgetMentioned.description, points });
    }

    if (text.includes('when') || text.includes('move') || text.includes('ready') || text.includes('handover') || text.includes('timeline')) {
      const points = this.weights.timeframeMentioned.points;
      score += points;
      factors.push({ factor: this.weights.timeframeMentioned.description, points });
    }

    if (text.includes('viewing') || text.includes('visit') || text.includes('see the') || text.includes('tour')) {
      const points = this.weights.viewingRequested.points;
      score += points;
      factors.push({ factor: this.weights.viewingRequested.description, points });
    }

    if (text.includes('bedroom') || text.includes('villa') || text.includes('apartment') || text.includes('townhouse') || text.includes('penthouse')) {
      const points = this.weights.propertySpecific.points;
      score += points;
      factors.push({ factor: this.weights.propertySpecific.description, points });
    }

    if (text.includes('contract') || text.includes('document') || text.includes('ejari') || text.includes('title deed')) {
      const points = this.weights.documentRequested.points;
      score += points;
      factors.push({ factor: this.weights.documentRequested.description, points });
    }

    if (text.includes('offer') || text.includes('negotiate') || text.includes('discount') || text.includes('best price')) {
      const points = this.weights.negotiationInitiated.points;
      score += points;
      factors.push({ factor: this.weights.negotiationInitiated.description, points });
    }

    for (const area of this.premiumAreas) {
      if (text.includes(area)) {
        const points = this.weights.premiumArea.points;
        score += points;
        factors.push({ factor: `Premium area: ${area}`, points });
        break;
      }
    }

    for (const signal of this.readySignals) {
      if (text.includes(signal)) {
        const points = this.weights.readyBuyer.points;
        score += points;
        factors.push({ factor: this.weights.readyBuyer.description, points });
        break;
      }
    }

    const normalizedScore = Math.min(100, Math.round(score));
    this.emit('scored', { score: normalizedScore, factors });

    return {
      score: normalizedScore,
      grade: this.getGrade(normalizedScore),
      priority: this.getPriority(normalizedScore),
      factors,
      recommendation: this.getRecommendation(normalizedScore),
      nextAction: this.getNextAction(normalizedScore),
      timestamp: new Date().toISOString()
    };
  }

  getGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  getPriority(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  getRecommendation(score) {
    if (score >= 80) return 'Hot lead - Immediate follow-up required by senior agent';
    if (score >= 60) return 'Warm lead - Schedule viewing within 24 hours';
    if (score >= 40) return 'Interested - Continue engagement and nurturing';
    if (score >= 20) return 'Early stage - Add to automated drip campaign';
    return 'Cold lead - Monitor for future activity';
  }

  getNextAction(score) {
    if (score >= 80) return 'Call within 1 hour';
    if (score >= 60) return 'Send property shortlist';
    if (score >= 40) return 'Schedule follow-up call';
    if (score >= 20) return 'Add to nurture sequence';
    return 'Archive for future reference';
  }

  updateWeight(factor, points) {
    if (this.weights[factor]) {
      this.weights[factor].points = points;
      return true;
    }
    return false;
  }
}
