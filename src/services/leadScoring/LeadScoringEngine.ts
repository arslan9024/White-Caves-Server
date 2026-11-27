// @ts-nocheck
import { createScoringConfig } from './scoringConfig.js';
import { LeadScoringHelpers } from './scoringHelpers.js';

export class LeadScoringEngine extends LeadScoringHelpers {
  constructor() {
    Object.assign(this, createScoringConfig());
  }

  /**
   * Calculate comprehensive lead score (0-100)
   * 
   * @param {Object} lead - Lead data
   * @returns {Object} Score breakdown with components
   */
  scoreLeadQuality(lead) {
    if (!lead) {
      return { score: 0, reason: 'No lead data provided', breakdown: {} };
    }

    let scoreComponents = {};
    let totalScore = 0;

    // 1. Profile Fit (20 points max)
    scoreComponents.profileFit = this._scoreProfileFit(lead);
    totalScore += scoreComponents.profileFit.points * (this.scoringWeights.profileFit / 100);

    // 2. Engagement Level (20 points max)
    scoreComponents.engagementLevel = this._scoreEngagementLevel(lead);
    totalScore += scoreComponents.engagementLevel.points * (this.scoringWeights.engagementLevel / 100);

    // 3. Urgency (15 points max)
    scoreComponents.urgency = this._scoreUrgency(lead);
    totalScore += scoreComponents.urgency.points * (this.scoringWeights.urgency / 100);

    // 4. Seriousness (20 points max)
    scoreComponents.seriousness = this._scoreSeriousness(lead);
    totalScore += scoreComponents.seriousness.points * (this.scoringWeights.seriousness / 100);

    // 5. Property Specificity (15 points max)
    scoreComponents.propertySpecificity = this._scorePropertySpecificity(lead);
    totalScore += scoreComponents.propertySpecificity.points * (this.scoringWeights.propertySpecificity / 100);

    // 6. Financial Capacity (10 points max)
    scoreComponents.financialCapacity = this._scoreFinancialCapacity(lead);
    totalScore += scoreComponents.financialCapacity.points * (this.scoringWeights.financialCapacity / 100);

    // Round to 0-100 scale
    const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    return {
      overallScore: finalScore,
      scoreGrade: this._getScoreGrade(finalScore),
      scoreRange: this._getScoreRange(finalScore),
      conversionProbability: this._estimateConversionProbability(finalScore),
      recommendedAction: this._getRecommendedAction(finalScore),
      components: scoreComponents,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Score valid 7 days
    };
  }

  /**
   * Score: Profile Fit (20 points)
   * Does their budget and property preferences match available inventory?
   */

  updateScoreWithInteraction(lead, interactionType) {
    const currentScore = lead.score || 0;
    const timeBoost = this.timeDecayFactor; // Refresh the score

    const interactionBoost = {
      'CALL': 3, // Phone calls boost score more than email
      'WHATSAPP': 2,
      'EMAIL': 1,
      'MEETING': 5, // In-person meeting = big boost
      'VIEWING': 7, // Actually viewed property = major boost
      'OFFER_SUBMITTED': 10 // Submitted offer = critical signal
    };

    const boost = interactionBoost[interactionType] || 1;
    const newScore = Math.min(100, (currentScore * timeBoost + boost));

    return {
      oldScore: currentScore,
      newScore: Math.round(newScore),
      boost: boost,
      reason: `Updated after ${interactionType}`
    };
  }
}

