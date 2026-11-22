/**
 * Price Trends & Rental Yield Analytics — Phase 4C / AEG-042
 */

import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import type { PriceTrend, RentalYield } from './marketAnalystTypes.js';

/**
 * Calculate price per sqft trends grouped by area and property type.
 *
 * @param options.area    Filter to a specific area
 * @param options.type    Filter to a property type (apartment, villa, etc.)
 * @param options.days    Look-back period in days (default 90)
 */
export async function getPriceTrends(options: {
  area?: string;
  type?: string;
  days?: number;
} = {}): Promise<PriceTrend[]> {
  const { area, type, days = 90 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    sqft: { gt: 0 },
    price: { gt: 0 },
    createdAt: { gte: since },
  };
  if (area) where.area = { contains: area, mode: 'insensitive' };
  if (type) where.type = type;

  const properties = await prisma.property.findMany({
    where,
    select: {
      price: true,
      sqft: true,
      area: true,
      type: true,
    },
  });

  // Group by area + type
  const groups = new Map<string, Array<{ pricePerSqft: number }>>();
  for (const p of properties) {
    const key = `${(p.area || 'Unknown').trim()}|${p.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ pricePerSqft: p.price / p.sqft });
  }

  const trends: PriceTrend[] = [];
  for (const [key, items] of groups) {
    const [areaName, propType] = key.split('|');
    const values = items.map(i => i.pricePerSqft).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    trends.push({
      area: areaName,
      propertyType: propType,
      avgPricePerSqft: Math.round(sum / values.length),
      medianPricePerSqft: Math.round(median),
      minPricePerSqft: Math.round(values[0]),
      maxPricePerSqft: Math.round(values[values.length - 1]),
      sampleSize: values.length,
      period: `${days}d`,
    });
  }

  // Sort by sample size descending for relevance
  trends.sort((a, b) => b.sampleSize - a.sampleSize);

  logger.info(`[MarketAnalyst] Price trends: ${trends.length} area/type combos from ${properties.length} properties`);
  return trends;
}

/**
 * Calculate rental yield = (annualRent / propertyValue) × 100
 * by area and property type using Lease + Property data.
 *
 * @param options.area  Filter to specific area
 * @param options.type  Filter to property type
 */
export async function getRentalYields(options: {
  area?: string;
  type?: string;
} = {}): Promise<RentalYield[]> {
  const propertyWhere: Record<string, unknown> = {
    price: { gt: 0 },
  };
  if (options.area) propertyWhere.area = { contains: options.area, mode: 'insensitive' };
  if (options.type) propertyWhere.type = options.type;

  // Active leases with their properties
  const leases = await prisma.lease.findMany({
    where: {
      status: { in: ['active', 'renewed'] },
      monthlyRent: { gt: 0 },
      property: propertyWhere,
    },
    include: {
      property: {
        select: { price: true, area: true, type: true },
      },
    },
  });

  // Group by area + type
  const groups = new Map<string, Array<{ annualRent: number; propertyValue: number }>>();
  for (const lease of leases) {
    if (!lease.property || lease.property.price <= 0) continue;
    const area = (lease.property.area || 'Unknown').trim();
    const key = `${area}|${lease.property.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      annualRent: lease.monthlyRent * 12,
      propertyValue: lease.property.price,
    });
  }

  const yields: RentalYield[] = [];
  for (const [key, items] of groups) {
    const [area, propType] = key.split('|');
    const avgRent = items.reduce((s, i) => s + i.annualRent, 0) / items.length;
    const avgValue = items.reduce((s, i) => s + i.propertyValue, 0) / items.length;
    const avgYield = (avgRent / avgValue) * 100;

    yields.push({
      area,
      propertyType: propType,
      avgYield: Math.round(avgYield * 100) / 100,
      avgAnnualRent: Math.round(avgRent),
      avgPropertyValue: Math.round(avgValue),
      sampleSize: items.length,
    });
  }

  yields.sort((a, b) => b.avgYield - a.avgYield);

  logger.info(`[MarketAnalyst] Rental yields: ${yields.length} combos from ${leases.length} leases`);
  return yields;
}
