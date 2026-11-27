// @ts-nocheck
export function createRecommendationConfig() {
  const config: any = {};
    // Service recommendations by customer lifecycle stage
    config.lifecycleRecommendations = {
      PROSPECT: {
        // Never purchased before
        services: [
          {
            serviceId: 'PROPERTY_SEARCH',
            name: 'Guided Property Search',
            description: 'AI-powered search matching your budget, preferences, and goals',
            priority: 'HIGH',
            recommendationReason: 'First-time buyer - need guidance to find right property',
            expectedValue: 0, // No immediate revenue
            upsellChain: 1 // Leads to next service
          },
          {
            serviceId: 'CONSULTATION_BUYER',
            name: 'Buyer Consultation',
            description: '1-hour consultation on Dubai real estate market, neighborhoods, investment strategy',
            priority: 'MEDIUM',
            recommendationReason: 'New to Dubai market',
            expectedValue: 2000, // AED 2,000 fixed fee
            upsellChain: 2
          }
        ]
      },
      FIRST_TIME_BUYER: {
        // Just closed first transaction
        services: [
          {
            serviceId: 'DOCUMENTATION',
            name: 'Documentation & Compliance',
            description: 'Complete property paperwork, RERA registration, DLD transfer',
            priority: 'CRITICAL',
            recommendationReason: 'Legally required after purchase',
            expectedValue: 3000, // AED 3,000 fixed fee
            upsellChain: 1
          },
          {
            serviceId: 'PROPERTY_MANAGEMENT',
            name: 'Property Management Service',
            description: 'Tenant screening, rent collection, maintenance - earn 8% monthly',
            priority: 'HIGH',
            recommendationReason: 'Just purchased property - prevent tenant problems',
            expectedValue: 80000, // AED 80K/month recurring (8% of AED 1M annually)
            expectedRecurring: true,
            recurringValue: 80000, // Monthly
            conversionProbability: 0.35, // 35% chance they\'ll accept
            upsellChain: 2
          },
          {
            serviceId: 'EJARI_REGISTRATION',
            name: 'Ejari Registration',
            description: 'Mandatory rental contract registration with DEWA',
            priority: 'CRITICAL',
            recommendationReason: 'Required for rental properties',
            expectedValue: 1500,
            upsellChain: 1
          }
        ]
      },
      PROPERTY_OWNER: {
        // Owns 1-2 properties
        services: [
          {
            serviceId: 'PROPERTY_MANAGEMENT_PREMIUM',
            name: 'Premium Property Management',
            description: 'Full service management including tenant disputes, maintenance coordination, tax optimization',
            priority: 'HIGH',
            recommendationReason: 'Protect investment with professional management',
            expectedValue: 120000, // Higher rate for premium
            expectedRecurring: true,
            recurringValue: 120000,
            conversionProbability: 0.40,
            upsellChain: 2
          },
          {
            serviceId: 'PROPERTY_VALUATION',
            name: 'Annual Property Valuation',
            description: 'Professional valuation for tax, insurance, refinancing purposes',
            priority: 'MEDIUM',
            recommendationReason: 'Track property appreciation, tax planning',
            expectedValue: 2500,
            upsellChain: 2
          },
          {
            serviceId: 'RENT_OPTIMIZATION',
            name: 'Rental Optimization Service',
            description: 'Market analysis to maximize rent - typically increase 10-15% annually',
            priority: 'HIGH',
            recommendationReason: 'Increase revenue from existing property',
            expectedValue: 1000, // AED 1,000 fixed consultation fee
            expectedRecurring: true,
            recurringValue: 0, // Revenue share on increases
            conversionProbability: 0.50,
            upsellChain: 1
          }
        ]
      },
      MULTI_PROPERTY_OWNER: {
        // Owns 3-5 properties
        services: [
          {
            serviceId: 'PORTFOLIO_MANAGEMENT',
            name: 'Portfolio Management Service',
            description: 'Centralized management of multiple properties, tax optimization, strategic planning',
            priority: 'CRITICAL',
            recommendationReason: 'Simplified management of multiple investments',
            expectedValue: 300000, // AED 300K/month
            expectedRecurring: true,
            recurringValue: 300000,
            conversionProbability: 0.60,
            upsellChain: 2
          },
          {
            serviceId: 'INVESTMENT_ADVISORY',
            name: 'Investment Advisory Service',
            description: 'Strategic advice on next acquisitions, sell/hold decisions, portfolio diversification',
            priority: 'HIGH',
            recommendationReason: 'Scale portfolio to next level',
            expectedValue: 50000, // AED 50K fixed per engagement
            expectedRecurring: true,
            recurringValue: 15000, // Ongoing advisory
            conversionProbability: 0.55,
            upsellChain: 1
          },
          {
            serviceId: 'TAX_OPTIMIZATION',
            name: 'Tax Optimization for Investors',
            description: 'Minimize tax liability across multiple properties through legal structures',
            priority: 'MEDIUM',
            recommendationReason: 'Optimize returns from portfolio',
            expectedValue: 10000, // AED 10K fixed
            expectedRecurring: true,
            recurringValue: 5000,
            conversionProbability: 0.40,
            upsellChain: 1
          }
        ]
      },
      INSTITUTIONAL_INVESTOR: {
        // Owns 6+ properties or 500M+ portfolio
        services: [
          {
            serviceId: 'CORPORATE_PORTFOLIO_MANAGEMENT',
            name: 'Corporate Portfolio Management',
            description: 'Enterprise-level management with dedicated team, monthly reporting, strategic planning',
            priority: 'CRITICAL',
            recommendationReason: 'Enterprise-grade service for major investor',
            expectedValue: 1000000, // AED 1M+/month
            expectedRecurring: true,
            recurringValue: 1000000,
            conversionProbability: 0.85,
            upsellChain: 2
          },
          {
            serviceId: 'DEVELOPMENT_PARTNERSHIP',
            name: 'Development Partnership & Joint Ventures',
            description: 'Co-develop properties together, revenue sharing arrangements',
            priority: 'HIGH',
            recommendationReason: 'Leverage combined resources for larger projects',
            expectedValue: 5000000, // AED 5M+ per project
            expectedRecurring: false,
            conversionProbability: 0.30,
            upsellChain: 1
          },
          {
            serviceId: 'CONCIERGE_SERVICES',
            name: 'Concierge & Lifestyle Services',
            description: 'Personal assistant for all real estate and lifestyle needs',
            priority: 'MEDIUM',
            recommendationReason: 'White-glove service for UHNWI client',
            expectedValue: 500000, // AED 500K/year
            expectedRecurring: true,
            recurringValue: 500000,
            conversionProbability: 0.70,
            upsellChain: 2
          }
        ]
      }
    };

    // Trigger-based recommendations
    config.triggerRecommendations = {
      PROPERTY_SOLD: [
        // When customer sells a property
        {
          serviceId: 'TAX_OPTIMIZATION',
          name: 'Capital Gains Tax Planning',
          description: 'Minimize tax on sale proceeds',
          priority: 'HIGH',
          recommendationWindow: '7 days'
        },
        {
          serviceId: 'INVESTMENT_OPPORTUNITY',
          name: '1031 Exchange Alternative',
          description: 'Reinvest proceeds in new property to defer taxes',
          priority: 'MEDIUM',
          recommendationWindow: '30 days'
        }
      ],
      FIRST_TENANT_ISSUE: [
        // When property has tenant problem
        {
          serviceId: 'PROPERTY_MANAGEMENT',
          name: 'Full Property Management',
          description: 'Avoid future issues with professional management',
          priority: 'HIGH',
          recommendationWindow: 'Immediate'
        },
        {
          serviceId: 'TENANT_SCREENING_SERVICE',
          name: 'Enhanced Tenant Screening',
          description: 'Background check, salary verification, guarantor requirement',
          priority: 'MEDIUM',
          recommendationWindow: '3 days'
        }
      ],
      MAINTENANCE_ISSUE: [
        {
          serviceId: 'PROPERTY_MAINTENANCE_PLAN',
          name: 'Annual Maintenance Plan',
          description: 'Preventive maintenance to avoid future emergencies',
          priority: 'HIGH',
          recommendationWindow: '3 days'
        }
      ],
      MARKET_OPPORTUNITY: [
        // When market is hot (seller\'s market)
        {
          serviceId: 'SALE_CONSULTATION',
          name: 'Strategic Sale Consultation',
          description: 'Time to sell your property at peak price',
          priority: 'MEDIUM',
          recommendationWindow: '14 days'
        }
      ],
      LOW_RENTAL_YIELD: [
        {
          serviceId: 'RENT_OPTIMIZATION',
          name: 'Rental Optimization',
          description: 'Increase rent by 10-15% through market analysis',
          priority: 'HIGH',
          recommendationWindow: '7 days'
        }
      ]
    };

    // Seasonal recommendations
    config.seasonalRecommendations = {
      'Q1': {
        // Tax season, new year planning
        recommendations: ['TAX_OPTIMIZATION', 'INVESTMENT_ADVISORY', 'PORTFOLIO_REVIEW'],
        focus: 'Tax planning and year-ahead strategy'
      },
      'Q2': {
        // Spring market peak
        recommendations: ['SALE_CONSULTATION', 'MARKET_ANALYSIS', 'REFINANCING'],
        focus: 'Market-based strategies'
      },
      'Q3': {
        // Peak buying season
        recommendations: ['PROPERTY_SEARCH', 'INVESTMENT_ADVISORY', 'FINANCING_ASSISTANCE'],
        focus: 'Acquisition strategies'
      },
      'Q4': {
        // Year-end, tax planning
        recommendations: ['TAX_OPTIMIZATION', 'PORTFOLIO_REVIEW', 'YEAR_END_ANALYSIS'],
        focus: 'Tax and portfolio optimization'
      }
    };
  return config;
}
