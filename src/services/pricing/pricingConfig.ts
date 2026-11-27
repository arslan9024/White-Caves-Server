// @ts-nocheck
export function createPricingConfig() {
  const config: any = {};
    config.pricingFactors = {
      propertyRarity: {
        STANDARD: 1.0, // Base rate 100%
        PREMIUM: 1.25, // 25% premium
        ULTRA_PREMIUM: 1.5, // 50% premium
        ULTRA_RARE: 2.0, // 100% premium (ultra-rare properties command premium rate)
      },
      clientTierDiscount: {
        BASIC: 0, // No discount
        ESSENTIAL: 0.05, // 5% loyalty discount
        PREMIUM: 0.1, // 10% loyalty discount
        ULTRA_PREMIUM: 0.15, // 15% loyalty discount
        CORPORATE: 0.2, // 20% loyalty discount
      },
      transactionComplexity: {
        SIMPLE: 1.0, // Standard property, straightforward
        MODERATE: 1.15, // Off-plan, developer coordination, multiple stakeholders
        COMPLEX: 1.3, // International buyer, corporate entity, financing issues
        HIGHLY_COMPLEX: 1.5, // All of above combined
      },
      seasonalityMultiplier: {
        Q1: 0.9, // January-March: Low season, offer incentive (10% discount)
        Q2: 0.95, // April-June: Moderate season, 5% discount
        Q3: 1.15, // July-September: Peak season, 15% premium
        Q4: 1.2, // October-December: Peak holiday season, 20% premium
      },
      volumeBonus: {
        // Cumulative bonus for clients doing multiple transactions
        SINGLE: 0, // No bonus
        '2-3': 0.05, // 5% bonus for 2-3 deals in last 12 months
        '4-6': 0.1, // 10% bonus
        '7-9': 0.15, // 15% bonus
        '10+': 0.2, // 20% bonus for high-volume clients
      },
      marketCondition: {
        // Adjustment based on real-time market conditions
        BUYER_MARKET: 0.95, // Many properties, fewer buyers - offer incentive
        BALANCED: 1.0, // Normal market conditions
        SELLER_MARKET: 1.15, // Few properties, many buyers - charge premium
      },
    };

    // Base rates (replacement for hardcoded 2-3%, 5%, 8%)
    config.baseRates = {
      PROPERTY_SALE: {
        baseline: 0.025, // 2.5% instead of flat 2-3%
        min: 0.015, // Minimum 1.5% even with max discounts
        max: 0.05, // Maximum 5% even with all premiums
      },
      LEASING: {
        baseline: 0.05, // 5% of annual rent
        min: 0.03, // Minimum 3%
        max: 0.08, // Maximum 8%
      },
      PROPERTY_MANAGEMENT: {
        baseline: 0.08, // 8% of monthly rent
        min: 0.05, // Minimum 5%
        max: 0.12, // Maximum 12%
      },
      CONSULTATION: {
        baseline: 5000, // AED 5,000 base fee
        min: 3000, // Minimum AED 3,000
        max: 15000, // Maximum AED 15,000
      },
      DOCUMENTATION: {
        baseline: 2000, // AED 2,000 base fee
        min: 1500, // Minimum AED 1,500
        max: 5000, // Maximum AED 5,000
      },
    };
  }

  /**
   * Calculate dynamic price for a service
   *
   * @param {Object} serviceConfig - Service configuration
   * @param {String} serviceConfig.serviceType - Type: PROPERTY_SALE, LEASING, etc.
   * @param {Object} clientData - Client information
   * @param {String} [clientData.tier] - Client tier (BASIC, ESSENTIAL, etc.)
   * @param {Number} [clientData.transactionCount] - Number of previous transactions
   * @param {Number} [clientData.totalValue] - Total value of transactions (AED)
   * @param {Object} propertyData - Property information
   * @param {Number} [propertyData.value] - Property value (AED)
   * @param {String} [propertyData.rarity] - Property rarity level
   * @param {String} [propertyData.type] - Property type
   * @param {Object} contextData - Additional context
   * @param {String} [contextData.complexity] - Transaction complexity level
   * @param {String} [contextData.marketCondition] - Current market condition
   *
   * @returns {Object} Pricing calculation with breakdown
   */
  return config;
}
