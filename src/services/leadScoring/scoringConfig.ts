// @ts-nocheck
export function createScoringConfig() {
  const config: any = {};
    // Scoring weights (total = 100%)
    config.scoringWeights = {
      profileFit: 20, // Does their budget/needs match available properties?
      engagementLevel: 20, // How frequently do they interact?
      urgency: 15, // Timeline pressure ("this week", "must close by X")
      seriousness: 20, // Pre-approved financing, previous buyer, business registered
      propertySpecificity: 15, // Named specific properties vs generic search
      financialCapacity: 10 // Verified net worth, income, purchasing power
    };

    config.scoringCriteria = {
      profileFit: {
        weight: 20,
        factors: [
          { criterion: 'Budget vs Market Availability', maxPoints: 8 },
          { criterion: 'Property Type Preference Match', maxPoints: 7 },
          { criterion: 'Location Fit', maxPoints: 5 }
        ]
      },
      engagementLevel: {
        weight: 20,
        factors: [
          { criterion: 'Inquiry Source Quality', maxPoints: 5 }, // Direct contact > referral > portal > walk-in
          { criterion: 'Response Time to Contact', maxPoints: 5 }, // Fast responder = serious buyer
          { criterion: 'Interaction Frequency', maxPoints: 5 }, // Multiple contacts within 7 days
          { criterion: 'Portal Activity', maxPoints: 5 } // Saved searches, property views
        ]
      },
      urgency: {
        weight: 15,
        factors: [
          { criterion: 'Decision Timeline Mentioned', maxPoints: 8 }, // "This week", "month", "quarter"
          { criterion: 'Timeline Specificity', maxPoints: 7 } // Exact date vs vague timeframe
        ]
      },
      seriousness: {
        weight: 20,
        factors: [
          { criterion: 'Pre-Approved Financing', maxPoints: 8 }, // Bank pre-approval letter
          { criterion: 'Previous Transaction History', maxPoints: 6 }, // Repeat buyer/investor
          { criterion: 'Business Registration', maxPoints: 3 }, // Company buying (corporate client)
          { criterion: 'Verified Identity', maxPoints: 3 } // Passport, RERA, UAE Pass verified
        ]
      },
      propertySpecificity: {
        weight: 15,
        factors: [
          { criterion: 'Named Property Interest', maxPoints: 10 }, // "I want the villa on X street"
          { criterion: 'Specific Building/Community', maxPoints: 5 } // "DAMAC Hills 2" vs "Dubai area"
        ]
      },
      financialCapacity: {
        weight: 10,
        factors: [
          { criterion: 'Income Verification', maxPoints: 5 },
          { criterion: 'Down Payment Available', maxPoints: 5 }
        ]
      }
    };

    // Time decay: older interactions worth less
    config.timeDecayFactor = 0.95; // 5% decay per day (older = lower value)
  return config;
}
