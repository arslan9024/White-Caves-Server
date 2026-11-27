// @ts-nocheck
import { createTaskRouterConfig } from './taskRouterConfig.js';

export class AITaskRouterService {
  constructor() {
    Object.assign(this, createTaskRouterConfig());
  }

  getOptimalAssistant(taskType, context = {}) {
    const probabilities = this.routingProbabilities[taskType];

    if (!probabilities) {
      return {
        success: false,
        error: `Unknown task type: ${taskType}`,
        recommendation: 'ZOE' // Default to executive assistant
      };
    }

    // Get learned probabilities if available
    const learnedProbs = this._getLearnedProbabilities(taskType);
    const mergedProbs = { ...probabilities, ...learnedProbs };

    // Find highest probability assistant
    let bestAssistant = null;
    let bestScore = 0;

    for (const [assistant, baseScore] of Object.entries(mergedProbs)) {
      let contextBonus = 0;

      // Apply context-specific bonuses
      if (context.customerTier === 'ULTRA_PREMIUM' || context.customerTier === 'CORPORATE') {
        if (assistant === 'ZOE' || assistant === 'KAIROS') contextBonus += 0.05; // Prefer luxury specialists
      }

      if (context.complexity === 'HIGH') {
        if (assistant === 'THEODORA' || assistant === 'HENRY') contextBonus += 0.03; // Prefer expertise
      }

      if (context.urgency === 'IMMEDIATE') {
        if (assistant === 'NINA' || assistant === 'LINDA') contextBonus += 0.04; // Prefer fast assistants
      }

      if (context.preferredLanguage === 'ARABIC') {
        // Some assistants better at Arabic
        if (['LAILA', 'KAIROS'].includes(assistant)) contextBonus += 0.05;
      }

      const finalScore = baseScore + contextBonus;

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestAssistant = assistant;
      }
    }

    return {
      success: true,
      recommendedAssistant: bestAssistant,
      confidence: (bestScore * 100).toFixed(1) + '%',
      alternativeAssistants: this._getAlternatives(mergedProbs, bestAssistant, 2),
      estimatedSuccessRate: (bestScore * 100).toFixed(1) + '%',
      estimatedProcessingTime: this._estimateTime(taskType, bestAssistant),
      context: context
    };
  }

  /**
   * Get top N assistant combinations for a task
   */
  getTopAssistantCombos(taskType, topN = 3, context = {}) {
    const probabilities = this.routingProbabilities[taskType];

    if (!probabilities) {
      return { error: `Unknown task type: ${taskType}`, combos: [] };
    }

    // Get all assistants sorted by probability
    const sorted = Object.entries(probabilities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    // Create combo recommendations
    const combos = [];

    for (let i = 0; i < sorted.length; i++) {
      const [assistant, score] = sorted[i];

      // For multi-assistant combos
      let combo = [assistant];
      let comboScore = score;

      if (i < sorted.length - 1 && this._shouldCombine(taskType, assistant, sorted[i + 1][0])) {
        combo.push(sorted[i + 1][0]);
        comboScore = (score * 0.6 + sorted[i + 1][1] * 0.4); // Weighted combo score
      }

      combos.push({
        rank: combos.length + 1,
        assistants: combo,
        estimatedSuccessRate: (comboScore * 100).toFixed(1) + '%',
        executionTime: this._estimateTime(taskType, combo[0]),
        parallelizable: combo.length > 1,
        reasoning: this._getReasoningForRoute(taskType, combo)
      });
    }

    return { taskType, combos };
  }

  /**
   * Record routing decision and outcome
   */
  recordRoutingOutcome(taskType, assistant, success, processingTime, context = {}) {
    this.routingHistory.push({
      taskType,
      assistant,
      success,
      processingTime,
      context,
      timestamp: new Date()
    });

    // Update learned probabilities
    this._updateLearning(taskType, assistant, success);

    return {
      recorded: true,
      learningPoints: this.routingHistory.filter(r => r.taskType === taskType).length
    };
  }

  /**
   * Get learned probabilities from history
   */
  _getLearnedProbabilities(taskType) {
    const relevant = this.routingHistory.filter(r => r.taskType === taskType);

    if (relevant.length === 0) return {};

    const learned = {};

    // Calculate success rate for each assistant
    for (const record of relevant) {
      if (!learned[record.assistant]) {
        learned[record.assistant] = { successes: 0, total: 0 };
      }
      learned[record.assistant].total++;
      if (record.success) learned[record.assistant].successes++;
    }

    // Convert to probability scores
    const probabilities = {};
    for (const [assistant, stats] of Object.entries(learned)) {
      probabilities[assistant] = stats.successes / stats.total;
    }

    return probabilities;
  }

  /**
   * Update learning based on outcome
   */
  _updateLearning(taskType, assistant, success) {
    // In real implementation, would store to database
    // and update routing probabilities over time
    return true;
  }

  /**
   * Get alternative assistants
   */
  _getAlternatives(probabilities, selected, count) {
    return Object.entries(probabilities)
      .filter(([asst]) => asst !== selected)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([assistant, score]) => ({
        assistant,
        confidence: (score * 100).toFixed(1) + '%'
      }));
  }

  /**
   * Estimate processing time
   */
  _estimateTime(taskType, assistant) {
    const baseTimes = {
      'FIND_PROPERTY': 180, // 3 min
      'SCHEDULE_VIEWING': 180,
      'CALCULATE_FINANCE': 300, // 5 min
      'LEAD_QUALIFICATION': 240, // 4 min
      'PROCESS_DOCUMENTS': 600, // 10 min
      'MARKET_ANALYSIS': 300,
      'SEND_PROPOSAL': 120, // 2 min
      'EJARI_REGISTRATION': 900, // 15 min
      'TENANT_SCREENING': 1800, // 30 min
      'PROPERTY_VALUATION': 300
    };

    const assistantSpeedBonus = {
      'NINA': 0.7, // Fastest (automation)
      'LINDA': 0.8, // WhatsApp fast
      'MARY': 0.85,
      'THEODORA': 1.0, // Standard
      'CIPHER': 1.1, // Slower (analysis)
      'MAX': 1.2 // Slowest (detailed work)
    };

    const baseTime = baseTimes[taskType] || 300;
    const speedMultiplier = assistantSpeedBonus[assistant] || 1.0;

    return Math.round(baseTime * speedMultiplier) + ' seconds';
  }

  /**
   * Determine if two assistants should work together
   */
  _shouldCombine(taskType, assistant1, assistant2) {
    const synergies = {
      'FIND_PROPERTY': ['MARY', 'CIPHER'], // Property + Market analysis
      'SCHEDULE_VIEWING': ['LINDA', 'CLARA'], // WhatsApp + CRM
      'CALCULATE_FINANCE': ['THEODORA', 'CIPHER'], // Finance + Market
      'PROCESS_DOCUMENTS': ['MAX', 'HENRY'], // Docs + Compliance
      'MARKET_ANALYSIS': ['CIPHER', 'SAGE'], // Market analysis combo
    };

    const synergy = synergies[taskType];
    if (!synergy) return false;

    return (synergy.includes(assistant1) && synergy.includes(assistant2)) ||
           (synergy.includes(assistant2) && synergy.includes(assistant1));
  }

  /**
   * Get explanation for routing decision
   */
  _getReasoningForRoute(taskType, assistants) {
    const reasons = {
      'FIND_PROPERTY': 'Mary specializes in property inventory matching. Cipher adds market analysis for better recommendations.',
      'SCHEDULE_VIEWING': 'Linda handles WhatsApp communication. Clara integrates with CRM for seamless scheduling.',
      'CALCULATE_FINANCE': 'Theodora is finance expert. Combined with Cipher for market-aware pricing.',
      'LEAD_QUALIFICATION': 'Clara manages CRM relationships. Hunter brings lead prospecting expertise.',
      'PROCESS_DOCUMENTS': 'Max processes documents efficiently. Henry ensures compliance verification.',
      'MARKET_ANALYSIS': 'Cipher provides detailed analysis. Sage detects emerging trends.',
      'SEND_PROPOSAL': 'Linda communicates clearly. Zoe ensures executive-level quality.',
      'EJARI_REGISTRATION': 'Ivy specializes in EJARI leasing workflows.',
      'TENANT_SCREENING': 'Hunter has prospecting skills applicable to tenant evaluation.',
      'PROPERTY_VALUATION': 'Cipher analyzes markets. Sage provides trend insights.'
    };

    return reasons[taskType] || 'Optimal assistant selected based on task requirements and success history.';
  }

  /**
   * Get routing analytics
   */
  getRoutingAnalytics(taskType = null) {
    let relevant = this.routingHistory;

    if (taskType) {
      relevant = relevant.filter(r => r.taskType === taskType);
    }

    if (relevant.length === 0) {
      return { message: 'No routing history available' };
    }

    const analytics = {
      totalRoutings: relevant.length,
      successCount: relevant.filter(r => r.success).length,
      successRate: (relevant.filter(r => r.success).length / relevant.length * 100).toFixed(1) + '%',
      averageProcessingTime: Math.round(
        relevant.reduce((sum, r) => sum + r.processingTime, 0) / relevant.length
      ) + ' ms',
      byAssistant: {}
    };

    // Breakdown by assistant
    for (const record of relevant) {
      if (!analytics.byAssistant[record.assistant]) {
        analytics.byAssistant[record.assistant] = {
          routed: 0,
          successful: 0,
          avgTime: 0,
          times: []
        };
      }
      analytics.byAssistant[record.assistant].routed++;
      if (record.success) analytics.byAssistant[record.assistant].successful++;
      analytics.byAssistant[record.assistant].times.push(record.processingTime);
    }

    // Calculate averages
    for (const [assistant, stats] of Object.entries(analytics.byAssistant)) {
      stats.successRate = (stats.successful / stats.routed * 100).toFixed(1) + '%';
      stats.avgTime = Math.round(stats.times.reduce((a, b) => a + b) / stats.times.length) + ' ms';
      delete stats.times; // Remove raw times from output
    }

    return analytics;
  }
}

// Export both engine classes
