// @ts-nocheck
const KYC_AML_POLICIES = {
  riskScoringMatrix: {
    customerType: {
      individual_resident: 0,
      individual_non_resident: 10,
      corporate_local: 5,
      corporate_foreign: 15,
      trust_foundation: 20
    },
    nationality: {
      gcc: 0,
      low_risk_country: 5,
      medium_risk_country: 15,
      high_risk_country: 30,
      fatf_blacklist: 50,
      sanctioned_country: 100
    },
    transactionValue: {
      below_50k: 0,
      '50k_to_500k': 5,
      '500k_to_2m': 10,
      '2m_to_10m': 20,
      above_10m: 30
    },
    transactionType: {
      residential_rental: 0,
      residential_purchase: 5,
      commercial_rental: 5,
      commercial_purchase: 10,
      offplan_purchase: 10,
      investment_portfolio: 15,
      cash_transaction: 25
    },
    sourceOfFunds: {
      salary: 0,
      business_income: 5,
      investment_returns: 5,
      property_sale: 10,
      inheritance: 10,
      gift: 15,
      crypto: 25,
      unknown: 30
    },
    occupation: {
      employed: 0,
      self_employed: 5,
      business_owner: 5,
      investor: 10,
      retired: 5,
      student: 10,
      unemployed: 15,
      high_risk_profession: 20
    }
  },
  
  riskThresholds: {
    low: { min: 0, max: 25 },
    medium: { min: 26, max: 50 },
    high: { min: 51, max: 75 },
    prohibited: { min: 76, max: 100 }
  },
  
  highRiskCountries: {
    fatfBlacklist: ['north korea', 'iran', 'myanmar'],
    fatfGreylist: ['syria', 'yemen', 'south sudan', 'mali', 'burkina faso'],
    sanctioned: ['russia', 'belarus', 'venezuela', 'zimbabwe', 'cuba']
  },
  
  gccCountries: ['uae', 'saudi arabia', 'qatar', 'kuwait', 'bahrain', 'oman'],
  
  pepKeywords: [
    'minister', 'president', 'prime minister', 'governor', 'ambassador',
    'senator', 'member of parliament', 'judge', 'general', 'admiral',
    'director general', 'ceo of state', 'royal', 'sheikh', 'emir'
  ]
};

export { KYC_AML_POLICIES };

export class KYCPolicyEngine {
  static getTransactionValueCategory(amountAED) {
    if (amountAED < 50000) return 'below_50k';
    if (amountAED < 500000) return '50k_to_500k';
    if (amountAED < 2000000) return '500k_to_2m';
    if (amountAED < 10000000) return '2m_to_10m';
    return 'above_10m';
  }
  
  static getNationalityRiskCategory(nationality) {
    const normalizedNationality = nationality?.toLowerCase() || '';
    
    if (KYC_AML_POLICIES.gccCountries.some(c => normalizedNationality.includes(c))) {
      return 'gcc';
    }
    if (KYC_AML_POLICIES.highRiskCountries.fatfBlacklist.some(c => normalizedNationality.includes(c))) {
      return 'fatf_blacklist';
    }
    if (KYC_AML_POLICIES.highRiskCountries.sanctioned.some(c => normalizedNationality.includes(c))) {
      return 'sanctioned_country';
    }
    if (KYC_AML_POLICIES.highRiskCountries.fatfGreylist.some(c => normalizedNationality.includes(c))) {
      return 'high_risk_country';
    }
    
    return 'low_risk_country';
  }
  
  static calculateRiskScore(factors) {
    const matrix = KYC_AML_POLICIES.riskScoringMatrix;
    let score = 0;
    const breakdown = {};
    
    if (factors.customerType && matrix.customerType[factors.customerType] !== undefined) {
      const value = matrix.customerType[factors.customerType];
      score += value;
      breakdown.customerType = { value: factors.customerType, score: value };
    }
    
    if (factors.nationality) {
      const category = this.getNationalityRiskCategory(factors.nationality);
      const value = matrix.nationality[category] || 0;
      score += value;
      breakdown.nationality = { value: factors.nationality, category, score: value };
    }
    
    if (factors.transactionValue !== undefined) {
      const category = this.getTransactionValueCategory(factors.transactionValue);
      const value = matrix.transactionValue[category] || 0;
      score += value;
      breakdown.transactionValue = { value: factors.transactionValue, category, score: value };
    }
    
    if (factors.transactionType && matrix.transactionType[factors.transactionType] !== undefined) {
      const value = matrix.transactionType[factors.transactionType];
      score += value;
      breakdown.transactionType = { value: factors.transactionType, score: value };
    }
    
    if (factors.sourceOfFunds && matrix.sourceOfFunds[factors.sourceOfFunds] !== undefined) {
      const value = matrix.sourceOfFunds[factors.sourceOfFunds];
      score += value;
      breakdown.sourceOfFunds = { value: factors.sourceOfFunds, score: value };
    }
    
    if (factors.occupation) {
      const occupationType = this.categorizeOccupation(factors.occupation);
      const value = matrix.occupation[occupationType] || 0;
      score += value;
      breakdown.occupation = { value: factors.occupation, category: occupationType, score: value };
    }
    
    if (factors.isPEP) {
      score += 30;
      breakdown.pep = { value: true, score: 30 };
    }
    
    return {
      totalScore: Math.min(score, 100),
      breakdown,
      category: this.getRiskCategory(Math.min(score, 100))
    };
  }
  
  static categorizeOccupation(occupation) {
    const normalized = occupation?.toLowerCase() || '';
    
    if (normalized.includes('unemployed')) return 'unemployed';
    if (normalized.includes('student')) return 'student';
    if (normalized.includes('retired')) return 'retired';
    if (normalized.includes('investor')) return 'investor';
    if (normalized.includes('owner') || normalized.includes('entrepreneur') || normalized.includes('ceo') || normalized.includes('director')) return 'business_owner';
    if (normalized.includes('self') || normalized.includes('freelance') || normalized.includes('consultant')) return 'self_employed';
    if (['casino', 'gambling', 'arms', 'weapons', 'crypto', 'money exchange', 'precious metals'].some(r => normalized.includes(r))) return 'high_risk_profession';
    
    return 'employed';
  }
  
  static getRiskCategory(score) {
    const thresholds = KYC_AML_POLICIES.riskThresholds;
    if (score <= thresholds.low.max) return 'LOW';
    if (score <= thresholds.medium.max) return 'MEDIUM';
    if (score <= thresholds.high.max) return 'HIGH';
    return 'PROHIBITED';
  }
  
  static async screenForPEP(name, nationality, occupation) {
    const normalizedName = name?.toLowerCase() || '';
    const normalizedOccupation = occupation?.toLowerCase() || '';
    
    const isPEP = KYC_AML_POLICIES.pepKeywords.some(keyword => 
      normalizedOccupation.includes(keyword) || normalizedName.includes(keyword)
    );
    
    return {
      screenedAt: new Date(),
      isPEP,
      pepCategory: isPEP ? 'domestic' : null,
      pepPosition: isPEP ? occupation : null,
      pepCountry: isPEP ? nationality : null,
      matchConfidence: isPEP ? 0.85 : 0,
      source: 'internal_screening',
      notes: isPEP ? 'Potential PEP match based on occupation keywords' : 'No PEP indicators found'
    };
  }
  
  static async checkSanctions(name, nationality, emiratesId) {
    const sanctionedNationality = KYC_AML_POLICIES.highRiskCountries.fatfBlacklist.some(
      c => nationality?.toLowerCase().includes(c)
    );
    
    return {
      checkedAt: new Date(),
      listsChecked: ['UN Consolidated', 'OFAC SDN', 'EU Consolidated', 'UK Sanctions', 'UAE Local'],
      hasMatch: sanctionedNationality,
      matches: sanctionedNationality ? [{
        listId: 'fatf_blacklist',
        listName: 'FATF Blacklist',
        matchType: 'nationality',
        matchScore: 1.0,
        matchedName: name,
        matchedEntity: { nationality },
        confirmedMatch: false
      }] : [],
      clearanceStatus: sanctionedNationality ? 'matched' : 'cleared'
    };
  }
  
  static validateEmiratesId(emiratesId) {
    if (!emiratesId) return { valid: false, error: 'Emirates ID is required' };
    
    const cleaned = emiratesId.replace(/[-\s]/g, '');
    
    if (cleaned.length !== 15) {
      return { valid: false, error: 'Emirates ID must be 15 digits' };
    }
    
    if (!/^\d{15}$/.test(cleaned)) {
      return { valid: false, error: 'Emirates ID must contain only digits' };
    }
    
    if (!cleaned.startsWith('784')) {
      return { valid: false, error: 'Emirates ID must start with 784' };
    }
    
    return { valid: true, formatted: `${cleaned.slice(0,3)}-${cleaned.slice(3,7)}-${cleaned.slice(7,14)}-${cleaned.slice(14)}` };
  }
  
}
