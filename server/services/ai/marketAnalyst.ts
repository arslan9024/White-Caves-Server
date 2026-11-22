/**
 * Market Analyst Service — Phase 4C / AEG-042
 *
 * Real-time market analytics engine decomposed into companion modules:
 *   - marketAnalystTypes: Interface definitions
 *   - marketAnalystPricing: Price trends and rental yield calculations
 *   - marketAnalystComparables: Comparable property similarity search
 *   - marketAnalystDemand: Demand heatmap, market overview snapshot, and offer-to-ask spread
 *
 * Maintained as a 100% backwards-compatible entry point.
 */

import { getPriceTrends, getRentalYields } from './marketAnalystPricing.js';
import { getComparables } from './marketAnalystComparables.js';
import { getDemandHeatmap, getMarketOverview, getOfferSpread } from './marketAnalystDemand.js';

export * from './marketAnalystTypes.js';
export {
  getPriceTrends,
  getRentalYields,
  getComparables,
  getDemandHeatmap,
  getMarketOverview,
  getOfferSpread,
};

export default {
  getPriceTrends,
  getRentalYields,
  getComparables,
  getDemandHeatmap,
  getMarketOverview,
  getOfferSpread,
};
