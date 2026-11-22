/**
 * Demand Heatmap & Overview Analytics — Phase 4C / AEG-042
 */

import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import type { DemandIndex, MarketOverview, OfferSpread } from './marketAnalystTypes.js';

/**
 * Calculate demand index per area:
 *   demandIndex = activeLead count / available inventory count
 *
 * Status mapping:
 *   > 3.0 = hot, > 2.0 = warm, > 1.0 = balanced, > 0.5 = cool, ≤ 0.5 = cold
 */
export async function getDemandHeatmap(options: {
  days?: number;
} = {}): Promise<DemandIndex[]> {
  const { days = 30 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get available properties grouped by area
  const properties = await prisma.property.findMany({
    where: { status: { in: ['available', 'reserved'] } },
    select: { area: true, price: true },
  });

  const propByArea = new Map<string, number>();
  for (const p of properties) {
    const area = (p.area || 'Unknown').trim();
    propByArea.set(area, (propByArea.get(area) || 0) + 1);
  }

  // Get active leads with budget, grouped by property area
  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['new', 'contacted', 'qualified', 'negotiating'] },
      createdAt: { gte: since },
    },
    select: {
      budget: true,
      score: true,
      property: { select: { area: true } },
    },
  });

  const leadByArea = new Map<string, Array<{ budget: number; score: number }>>();
  for (const lead of leads) {
    const area = (lead.property?.area || 'Unknown').trim();
    if (!leadByArea.has(area)) leadByArea.set(area, []);
    leadByArea.get(area)!.push({
      budget: lead.budget || 0,
      score: lead.score || 0,
    });
  }

  // Get viewing counts by area
  const viewings = await prisma.viewing.findMany({
    where: {
      scheduledAt: { gte: since },
    },
    select: {
      property: { select: { area: true } },
    },
  });

  const viewByArea = new Map<string, number>();
  for (const v of viewings) {
    const area = (v.property?.area || 'Unknown').trim();
    viewByArea.set(area, (viewByArea.get(area) || 0) + 1);
  }

  // Combine all areas
  const allAreas = new Set([...propByArea.keys(), ...leadByArea.keys()]);
  const heatmap: DemandIndex[] = [];

  for (const area of allAreas) {
    const inventory = propByArea.get(area) || 0;
    const areaLeads = leadByArea.get(area) || [];
    const leadCount = areaLeads.length;
    const viewCount = viewByArea.get(area) || 0;

    const demandIndex = inventory > 0 ? leadCount / inventory : leadCount > 0 ? 10 : 0;
    const avgBudget = areaLeads.length > 0
      ? areaLeads.reduce((s, l) => s + l.budget, 0) / areaLeads.length
      : 0;
    const avgScore = areaLeads.length > 0
      ? areaLeads.reduce((s, l) => s + l.score, 0) / areaLeads.length
      : 0;

    let status: DemandIndex['status'] = 'cold';
    if (demandIndex > 3) status = 'hot';
    else if (demandIndex > 2) status = 'warm';
    else if (demandIndex > 1) status = 'balanced';
    else if (demandIndex > 0.5) status = 'cool';

    heatmap.push({
      area,
      leadCount,
      availableInventory: inventory,
      demandIndex: Math.round(demandIndex * 100) / 100,
      avgBudget: Math.round(avgBudget),
      avgLeadScore: Math.round(avgScore),
      viewingCount: viewCount,
      status,
    });
  }

  heatmap.sort((a, b) => b.demandIndex - a.demandIndex);

  logger.info(`[MarketAnalyst] Demand heatmap: ${heatmap.length} areas, ${leads.length} leads, ${properties.length} properties`);
  return heatmap;
}

/**
 * Compute a full market overview snapshot:
 *   - Portfolio stats (total, available, avg price, avg price/sqft)
 *   - Transaction volume (30d)
 *   - Rental yield average
 *   - Days on market
 *   - Top areas and price distribution
 */
export async function getMarketOverview(): Promise<MarketOverview> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Property stats
  const allProperties = await prisma.property.findMany({
    select: { price: true, sqft: true, area: true, status: true, createdAt: true },
  });

  const available = allProperties.filter(p => p.status === 'available');
  const withSqft = allProperties.filter(p => p.sqft > 0 && p.price > 0);
  const avgPrice = allProperties.length > 0
    ? allProperties.reduce((s, p) => s + p.price, 0) / allProperties.length
    : 0;
  const avgPricePerSqft = withSqft.length > 0
    ? withSqft.reduce((s, p) => s + p.price / p.sqft, 0) / withSqft.length
    : 0;

  // Days on market (for available properties)
  const now = Date.now();
  const daysOnMarket = available.length > 0
    ? available.reduce((s, p) => s + (now - p.createdAt.getTime()) / 86400000, 0) / available.length
    : 0;

  // Transactions last 30 days
  const recentTx = await prisma.transaction.findMany({
    where: {
      status: { in: ['completed', 'in_progress'] },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { amount: true },
  });
  const txValue = recentTx.reduce((s, t) => s + t.amount, 0);

  // Rental yield average (from active leases)
  const activeLeases = await prisma.lease.findMany({
    where: {
      status: { in: ['active', 'renewed'] },
      monthlyRent: { gt: 0 },
    },
    include: { property: { select: { price: true } } },
  });
  const yieldsArr = activeLeases
    .filter(l => l.property && l.property.price > 0)
    .map(l => ((l.monthlyRent * 12) / l.property.price) * 100);
  const avgYield = yieldsArr.length > 0
    ? yieldsArr.reduce((a, b) => a + b, 0) / yieldsArr.length
    : 0;

  // Top areas
  const areaMap = new Map<string, { count: number; totalPrice: number }>();
  for (const p of allProperties) {
    const area = (p.area || 'Unknown').trim();
    const entry = areaMap.get(area) || { count: 0, totalPrice: 0 };
    entry.count++;
    entry.totalPrice += p.price;
    areaMap.set(area, entry);
  }
  const topAreas = [...areaMap.entries()]
    .map(([area, data]) => ({ area, count: data.count, avgPrice: Math.round(data.totalPrice / data.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Price distribution
  const ranges = [
    { range: '< 500K', min: 0, max: 500000 },
    { range: '500K–1M', min: 500000, max: 1000000 },
    { range: '1M–2M', min: 1000000, max: 2000000 },
    { range: '2M–5M', min: 2000000, max: 5000000 },
    { range: '5M–10M', min: 5000000, max: 10000000 },
    { range: '> 10M', min: 10000000, max: Infinity },
  ];
  const priceDistribution = ranges.map(r => ({
    range: r.range,
    count: allProperties.filter(p => p.price >= r.min && p.price < r.max).length,
  }));

  logger.info(`[MarketAnalyst] Market overview: ${allProperties.length} properties, ${recentTx.length} recent transactions`);

  return {
    totalProperties: allProperties.length,
    totalAvailable: available.length,
    avgPrice: Math.round(avgPrice),
    avgPricePerSqft: Math.round(avgPricePerSqft),
    avgRentalYield: Math.round(avgYield * 100) / 100,
    totalTransactions30d: recentTx.length,
    totalTransactionValue30d: Math.round(txValue),
    avgDaysOnMarket: Math.round(daysOnMarket),
    topAreas,
    priceDistribution,
  };
}

/**
 * Analyze the gap between listing prices and offer amounts by area.
 * Shows negotiation dynamics: how much below asking price buyers offer.
 */
export async function getOfferSpread(options: {
  area?: string;
  days?: number;
} = {}): Promise<OfferSpread[]> {
  const { area, days = 90 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    createdAt: { gte: since },
    amount: { gt: 0 },
  };

  const offers = await prisma.offer.findMany({
    where,
    include: {
      property: { select: { price: true, area: true } },
    },
  });

  // Group by area
  const groups = new Map<string, Array<{
    listPrice: number;
    offerPrice: number;
    counter: number | null;
    accepted: boolean;
  }>>();

  for (const o of offers) {
    if (!o.property || o.property.price <= 0) continue;
    const propArea = (o.property.area || 'Unknown').trim();
    if (area && !propArea.toLowerCase().includes(area.toLowerCase())) continue;

    if (!groups.has(propArea)) groups.set(propArea, []);
    groups.get(propArea)!.push({
      listPrice: o.property.price,
      offerPrice: o.amount,
      counter: o.counterAmount,
      accepted: o.status === 'accepted',
    });
  }

  const spreads: OfferSpread[] = [];
  for (const [areaName, items] of groups) {
    const avgList = items.reduce((s, i) => s + i.listPrice, 0) / items.length;
    const avgOffer = items.reduce((s, i) => s + i.offerPrice, 0) / items.length;
    const avgSpread = ((avgList - avgOffer) / avgList) * 100;
    const accepted = items.filter(i => i.accepted).length;
    const counters = items.filter(i => i.counter != null);
    const avgCounter = counters.length > 0
      ? counters.reduce((s, i) => s + (i.counter || 0), 0) / counters.length
      : 0;

    spreads.push({
      area: areaName,
      avgListPrice: Math.round(avgList),
      avgOfferPrice: Math.round(avgOffer),
      avgSpread: Math.round(avgSpread * 100) / 100,
      acceptanceRate: items.length > 0 ? Math.round((accepted / items.length) * 100) : 0,
      avgCounterAmount: Math.round(avgCounter),
      sampleSize: items.length,
    });
  }

  spreads.sort((a, b) => b.sampleSize - a.sampleSize);

  logger.info(`[MarketAnalyst] Offer spreads: ${spreads.length} areas from ${offers.length} offers`);
  return spreads;
}
