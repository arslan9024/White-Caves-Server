// @ts-nocheck
export class LeadScoringHelpers {
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
  _scoreProfileFit(lead) {
    let points = 0;
    let factors = [];

    if (lead.budget && lead.budget.min && lead.budget.max) {
      // Has defined budget = good signal
      const budgetRange = lead.budget.max - lead.budget.min;
      const isReasonable = lead.budget.min >= 500000 && lead.budget.max <= 100000000; // AED 0.5M - 100M reasonable
      if (isReasonable) {
        points += 8;
        factors.push({ factor: 'Defined budget range (AED)', points: 8 });
      } else {
        points += 3;
        factors.push({ factor: 'Budget defined but unusual range', points: 3 });
      }
    } else if (lead.budget && lead.budget.min) {
      points += 5;
      factors.push({ factor: 'Minimum budget only', points: 5 });
    }

    if (lead.propertyType && Array.isArray(lead.propertyType) && lead.propertyType.length > 0) {
      if (lead.propertyType.length <= 3) {
        points += 7; // Specific property types = serious
        factors.push({ factor: `Specific property types (${lead.propertyType.length} selected)`, points: 7 });
      } else {
        points += 3; // Too many types = unfocused
        factors.push({ factor: 'Too many property types selected', points: 3 });
      }
    }

    if (lead.preferredLocations && Array.isArray(lead.preferredLocations) && lead.preferredLocations.length > 0) {
      if (lead.preferredLocations.length <= 3) {
        points += 5;
        factors.push({ factor: `Specific locations (${lead.preferredLocations.length})`, points: 5 });
      }
    }

    return { points: Math.min(20, points), factors, maxPoints: 20 };
  }

  /**
   * Score: Engagement Level (20 points)
   * How frequently and through what channel did they contact us?
   */
  _scoreEngagementLevel(lead) {
    let points = 0;
    let factors = [];

    // 1. Source quality
    const sourceQuality = {
      'DIRECT_CONTACT': 5, // Direct phone/email = very serious
      'AGENT_REFERRAL': 4, // Referred by agent
      'OWNER_REFERRAL': 4, // Referred by owner
      'WEBSITE': 3, // Came through website
      'PORTAL': 2, // Third-party portal (Property Finder, Bayut, Dubizzle)
      'SOCIAL_MEDIA': 1, // Social media
      'WALK_IN': 2, // Walk-in
      'OTHER': 1
    };
    const sourceScore = sourceQuality[lead.source] || 1;
    points += sourceScore;
    factors.push({ factor: `Source: ${lead.source}`, points: sourceScore });

    // 2. Response speed to first contact
    if (lead.interactions && lead.interactions.length > 0) {
      const firstInteraction = lead.interactions[0];
      const timeSinceFirst = Date.now() - new Date(firstInteraction.timestamp);
      const daysSince = timeSinceFirst / (1000 * 60 * 60 * 24);

      if (daysSince < 1) {
        points += 5; // Responded same day
        factors.push({ factor: 'Responded same day', points: 5 });
      } else if (daysSince < 3) {
        points += 3; // Responded within 3 days
        factors.push({ factor: 'Responded within 3 days', points: 3 });
      } else if (daysSince < 7) {
        points += 1; // Responded within 7 days
        factors.push({ factor: 'Responded within 7 days', points: 1 });
      }
    }

    // 3. Interaction frequency
    if (lead.interactions && lead.interactions.length > 0) {
      const last7Days = lead.interactions.filter(i => {
        const daysSince = (Date.now() - new Date(i.timestamp)) / (1000 * 60 * 60 * 24);
        return daysSince < 7;
      });

      if (last7Days.length >= 3) {
        points += 5; // Very engaged (3+ interactions in 7 days)
        factors.push({ factor: 'High engagement (3+ interactions/7 days)', points: 5 });
      } else if (last7Days.length === 2) {
        points += 3;
        factors.push({ factor: '2 interactions in last 7 days', points: 3 });
      } else if (last7Days.length === 1) {
        points += 1;
        factors.push({ factor: '1 interaction in last 7 days', points: 1 });
      }
    }

    // 4. Portal activity (saved searches, property views)
    if (lead.savedSearches) {
      points += Math.min(5, Math.ceil(lead.savedSearches.length));
      factors.push({ factor: `Saved searches (${lead.savedSearches.length})`, points: Math.min(5, lead.savedSearches.length) });
    }

    return { points: Math.min(20, points), factors, maxPoints: 20 };
  }

  /**
   * Score: Urgency (15 points)
   * Do they mention a specific timeline?
   */
  _scoreUrgency(lead) {
    let points = 0;
    let factors = [];

    if (lead.timeline) {
      if (lead.timeline === 'IMMEDIATE' || lead.timeline === 'THIS_WEEK') {
        points += 15; // Maximum urgency
        factors.push({ factor: 'Timeline: Immediate/This week', points: 15 });
      } else if (lead.timeline === 'THIS_MONTH') {
        points += 10;
        factors.push({ factor: 'Timeline: This month', points: 10 });
      } else if (lead.timeline === 'NEXT_QUARTER') {
        points += 5;
        factors.push({ factor: 'Timeline: Next quarter', points: 5 });
      } else if (lead.timeline === 'FLEXIBLE') {
        points += 2;
        factors.push({ factor: 'Timeline: Flexible', points: 2 });
      }
    }

    // Check notes for urgency keywords
    if (lead.notes && typeof lead.notes === 'string') {
      const urgencyKeywords = [
        'asap', 'urgent', 'immediately', 'this week', 'this month',
        'closing date', 'deadline', 'must sell', 'must buy', 'quick'
      ];
      const hasUrgency = urgencyKeywords.some(kw => lead.notes.toLowerCase().includes(kw));
      if (hasUrgency && points === 0) {
        points += 5; // Urgency mentioned in notes
        factors.push({ factor: 'Urgency keywords found in notes', points: 5 });
      }
    }

    return { points: Math.min(15, points), factors, maxPoints: 15 };
  }

  /**
   * Score: Seriousness (20 points)
   * Is this person actually going to buy or just browsing?
   */
  _scoreSeriousness(lead) {
    let points = 0;
    let factors = [];

    // Pre-approved financing
    if (lead.financingApproved) {
      points += 8;
      factors.push({ factor: 'Pre-approved financing', points: 8 });
    } else if (lead.financingInProgress) {
      points += 5;
      factors.push({ factor: 'Financing in progress', points: 5 });
    }

    // Previous transaction history
    if (lead.previousTransactions && lead.previousTransactions > 0) {
      const historyScore = Math.min(6, lead.previousTransactions * 2); // 1-3 previous deals = 2-6 points
      points += historyScore;
      factors.push({ factor: `Previous transactions: ${lead.previousTransactions}`, points: historyScore });
    }

    // Business registered (corporate buyer)
    if (lead.isCorporate || lead.companyName) {
      points += 3;
      factors.push({ factor: 'Corporate/Business buyer', points: 3 });
    }

    // Identity verified
    if (lead.idVerified || lead.uaePassVerified) {
      points += 3;
      factors.push({ factor: 'Identity verified', points: 3 });
    }

    return { points: Math.min(20, points), factors, maxPoints: 20 };
  }

  /**
   * Score: Property Specificity (15 points)
   * Do they want a specific property or just browsing?
   */
  _scorePropertySpecificity(lead) {
    let points = 0;
    let factors = [];

    if (lead.interestedPropertyIds && lead.interestedPropertyIds.length > 0) {
      if (lead.interestedPropertyIds.length === 1) {
        points += 10; // Very specific, wants this one property
        factors.push({ factor: 'Interested in specific property', points: 10 });
      } else if (lead.interestedPropertyIds.length <= 5) {
        points += 7; // Multiple specific properties
        factors.push({ factor: `Multiple specific properties (${lead.interestedPropertyIds.length})`, points: 7 });
      }
    } else if (lead.communityPreference) {
      // Specific community = more focused than general location
      points += 5;
      factors.push({ factor: `Specific community: ${lead.communityPreference}`, points: 5 });
    }

    return { points: Math.min(15, points), factors, maxPoints: 15 };
  }

  /**
   * Score: Financial Capacity (10 points)
   * Can they actually afford what they're looking at?
   */
  _scoreFinancialCapacity(lead) {
    let points = 0;
    let factors = [];

    if (lead.downPaymentReady || lead.downPaymentAmount) {
      points += 5;
      factors.push({ factor: 'Down payment ready/specified', points: 5 });
    }

    if (lead.incomeVerified || lead.jobTitle || lead.employer) {
      points += 5;
      factors.push({ factor: 'Employment/income information provided', points: 5 });
    }

    return { points: Math.min(10, points), factors, maxPoints: 10 };
  }

  /**
   * Get score grade (A+, A, B+, B, C, etc.)
   */
  _getScoreGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Get score range interpretation
   */
  _getScoreRange(score) {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'MODERATE';
    if (score >= 30) return 'POOR';
    return 'VERY_POOR';
  }

  /**
   * Estimate conversion probability based on score
   */
  _estimateConversionProbability(score) {
    // Based on industry benchmarks for real estate
    // Raw conversion = 8%, high-score conversion = 40%+
    const conversionRates = {
      90: 0.45, // Score 90+ = 45% conversion
      80: 0.35, // Score 80-89 = 35% conversion
      70: 0.25, // Score 70-79 = 25% conversion
      50: 0.12, // Score 50-69 = 12% conversion
      30: 0.05, // Score 30-49 = 5% conversion
      0: 0.02 // Score <30 = 2% conversion
    };

    for (const [threshold, rate] of Object.entries(conversionRates).sort((a, b) => b[0] - a[0])) {
      if (score >= parseInt(threshold)) {
        return (rate * 100).toFixed(1) + '%';
      }
    }
    return '2%';
  }

  /**
   * Recommend action based on score
   */
  _getRecommendedAction(score) {
    if (score >= 85) {
      return {
        action: 'IMMEDIATE_FOLLOW_UP',
        description: 'HOT LEAD - Assign senior agent, prioritize for viewings',
        priority: 'CRITICAL',
        assignmentRecommendation: 'Best available agent',
        followUpTimeline: 'Within 2 hours'
      };
    } else if (score >= 70) {
      return {
        action: 'PRIORITY_FOLLOW_UP',
        description: 'Strong lead - Schedule viewing within 24 hours',
        priority: 'HIGH',
        assignmentRecommendation: 'Experienced agent',
        followUpTimeline: 'Within 24 hours'
      };
    } else if (score >= 50) {
      return {
        action: 'STANDARD_FOLLOW_UP',
        description: 'Moderate lead - Normal sales process',
        priority: 'MEDIUM',
        assignmentRecommendation: 'Regular agent',
        followUpTimeline: 'Within 3 days'
      };
    } else if (score >= 30) {
      return {
        action: 'LOW_PRIORITY_FOLLOW_UP',
        description: 'Weak lead - Follow up but don\'t invest heavily',
        priority: 'LOW',
        assignmentRecommendation: 'Junior agent or automated follow-up',
        followUpTimeline: 'Within 7 days'
      };
    } else {
      return {
        action: 'NURTURE_ONLY',
        description: 'Very weak - Add to nurture list, email campaigns only',
        priority: 'VERY_LOW',
        assignmentRecommendation: 'Automated nurture/no assignment',
        followUpTimeline: 'Marketing only'
      };
    }
  }

  /**
   * Rescale lead score based on new interaction
   * Keep scores fresh by accounting for recent activity
   */
}
