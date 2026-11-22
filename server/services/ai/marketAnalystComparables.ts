/**
 * Comparable Property Analysis — Phase 4C / AEG-042
 */

import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import type { ComparableProperty } from './marketAnalystTypes.js';

/**
 * Find comparable properties for a given property based on:
 *   - Same area (or nearby)
 *   - Same type ±1 bedroom
 *   - Price within ±30% range
 *   - Size within ±40% range
 *
 * Each comparable gets a 0-100 similarity score.
 */
export async function getComparables(propertyId: string, options: {
  limit?: number;
  priceRange?: number; // percentage, default 0.3 (±30%)
  sizeRange?: number;  // percentage, default 0.4 (±40%)
} = {}): Promise<ComparableProperty[]> {
  const { limit = 10, priceRange = 0.3, sizeRange = 0.4 } = options;

  const target = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!target) throw new Error(`Property ${propertyId} not found`);

  const where: Record<string, unknown> = {
    id: { not: propertyId },
    type: target.type,
    price: {
      gte: target.price * (1 - priceRange),
      lte: target.price * (1 + priceRange),
    },
  };

  // Size filter only if target has sqft
  if (target.sqft > 0) {
    where.sqft = {
      gte: Math.floor(target.sqft * (1 - sizeRange)),
      lte: Math.ceil(target.sqft * (1 + sizeRange)),
    };
  }

  // Area match (same area preferred)
  if (target.area) {
    where.area = { contains: target.area, mode: 'insensitive' };
  }

  const candidates = await prisma.property.findMany({
    where,
    take: limit * 3, // Fetch extra, then rank by similarity
  });

  // Calculate similarity score
  const comparables: ComparableProperty[] = candidates.map(c => {
    let score = 0;
    const maxScore = 100;

    // Price similarity (40 points)
    const priceDiff = Math.abs(c.price - target.price) / target.price;
    score += Math.max(0, 40 * (1 - priceDiff / priceRange));

    // Size similarity (25 points)
    if (target.sqft > 0 && c.sqft > 0) {
      const sizeDiff = Math.abs(c.sqft - target.sqft) / target.sqft;
      score += Math.max(0, 25 * (1 - sizeDiff / sizeRange));
    }

    // Bedroom match (15 points)
    const bedDiff = Math.abs(c.bedrooms - target.bedrooms);
    score += bedDiff === 0 ? 15 : bedDiff === 1 ? 8 : 0;

    // Location match (20 points)
    if (c.area && target.area && c.area.toLowerCase() === target.area.toLowerCase()) {
      score += 20;
    } else if (c.location && target.location) {
      // Partial location match
      const cLoc = c.location.toLowerCase();
      const tLoc = target.location.toLowerCase();
      if (cLoc.includes(tLoc.split(',')[0]) || tLoc.includes(cLoc.split(',')[0])) {
        score += 10;
      }
    }

    return {
      id: c.id,
      title: c.title,
      location: c.location,
      type: c.type,
      price: c.price,
      sqft: c.sqft,
      pricePerSqft: c.sqft > 0 ? Math.round(c.price / c.sqft) : 0,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      status: c.status,
      similarity: Math.min(Math.round(score), maxScore),
    };
  });

  // Sort by similarity descending, take top N
  comparables.sort((a, b) => b.similarity - a.similarity);
  const result = comparables.slice(0, limit);

  logger.info(`[MarketAnalyst] Comparables for ${propertyId}: ${result.length} found from ${candidates.length} candidates`);
  return result;
}
