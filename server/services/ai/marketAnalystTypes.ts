/**
 * Market Analyst Types — Phase 4C / AEG-042
 */

export interface PriceTrend {
  area: string;
  propertyType: string;
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  minPricePerSqft: number;
  maxPricePerSqft: number;
  sampleSize: number;
  period: string;
}

export interface RentalYield {
  area: string;
  propertyType: string;
  avgYield: number;
  avgAnnualRent: number;
  avgPropertyValue: number;
  sampleSize: number;
}

export interface ComparableProperty {
  id: string;
  title: string;
  location: string;
  type: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  status: string;
  similarity: number;  // 0-100 similarity score
}

export interface DemandIndex {
  area: string;
  leadCount: number;
  availableInventory: number;
  demandIndex: number;           // leads / inventory
  avgBudget: number;
  avgLeadScore: number;
  viewingCount: number;
  status: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';
}

export interface MarketOverview {
  totalProperties: number;
  totalAvailable: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgRentalYield: number;
  totalTransactions30d: number;
  totalTransactionValue30d: number;
  avgDaysOnMarket: number;
  topAreas: Array<{ area: string; count: number; avgPrice: number }>;
  priceDistribution: Array<{ range: string; count: number }>;
}

export interface OfferSpread {
  area: string;
  avgListPrice: number;
  avgOfferPrice: number;
  avgSpread: number;          // % below list price
  acceptanceRate: number;     // % of offers accepted
  avgCounterAmount: number;
  sampleSize: number;
}
