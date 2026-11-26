/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-object-injection */
import { prisma } from '../../../database.js';
import { convertToAED, isSupportedCurrency, type SupportedCurrency } from '../../currencyService.js';
import type { ScoreFactor } from './types.js';

// ─── Scoring functions by category ──────────────────────────────────────

/**
 * ENGAGEMENT (40% weight) — How actively is the lead interacting?
 * Factors: activity count, recency of contact, viewing count, offer count, communication frequency
 */
export async function scoreEngagement(leadId: string): Promise<{ score: number; factors: ScoreFactor[] }> {
  const factors: ScoreFactor[] = [];
  let score = 0;

  // 1. Activity count (max 12 points) — exclude system-generated scoring & SLA alert activities
  const activityCount = await prisma.activity.count({
    where: {
      leadId,
      action: { notIn: ['score_changed', 'score_override', 'sla_nudge_sent', 'sla_escalated'] },
    },
  });
  let activityPoints = 0;
  if (activityCount >= 20) activityPoints = 12;
  else if (activityCount >= 10) activityPoints = 9;
  else if (activityCount >= 5) activityPoints = 6;
  else if (activityCount >= 2) activityPoints = 3;
  else if (activityCount >= 1) activityPoints = 1;
  score += activityPoints;
  factors.push({
    category: 'engagement',
    factor: 'activity_count',
    points: activityPoints,
    maxPoints: 12,
    description: `${activityCount} activities logged`,
  });

  // 2. Viewing count (max 10 points)
  const viewingCount = await prisma.viewing.count({ where: { leadId } });
  let viewingPoints = 0;
  if (viewingCount >= 5) viewingPoints = 10;
  else if (viewingCount >= 3) viewingPoints = 8;
  else if (viewingCount >= 2) viewingPoints = 5;
  else if (viewingCount >= 1) viewingPoints = 3;
  score += viewingPoints;
  factors.push({
    category: 'engagement',
    factor: 'viewing_count',
    points: viewingPoints,
    maxPoints: 10,
    description: `${viewingCount} property viewings`,
  });

  // 3. Offer count (max 10 points)
  const offerCount = await prisma.offer.count({ where: { leadId } });
  let offerPoints = 0;
  if (offerCount >= 3) offerPoints = 10;
  else if (offerCount >= 2) offerPoints = 8;
  else if (offerCount >= 1) offerPoints = 5;
  score += offerPoints;
  factors.push({
    category: 'engagement',
    factor: 'offer_count',
    points: offerPoints,
    maxPoints: 10,
    description: `${offerCount} offers submitted`,
  });

  // 4. Last contact recency (max 8 points)
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { lastContact: true, createdAt: true },
  });
  const lastContactDate = lead?.lastContact || lead?.createdAt;
  let recencyPoints = 0;
  if (lastContactDate) {
    const daysSinceContact = (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact <= 1) recencyPoints = 8;
    else if (daysSinceContact <= 3) recencyPoints = 6;
    else if (daysSinceContact <= 7) recencyPoints = 4;
    else if (daysSinceContact <= 14) recencyPoints = 2;
    else if (daysSinceContact <= 30) recencyPoints = 1;
  }
  score += recencyPoints;
  factors.push({
    category: 'engagement',
    factor: 'contact_recency',
    points: recencyPoints,
    maxPoints: 8,
    description: lastContactDate
      ? `Last contact ${Math.round((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
      : 'No contact recorded',
  });

  return { score: Math.min(40, score), factors };
}

/**
 * DEMOGRAPHIC (30% weight) — How qualified is this lead?
 * Factors: budget, email, phone, company, property interest
 */
export async function scoreDemographic(
  leadId: string
): Promise<{ score: number; factors: ScoreFactor[] }> {
  const factors: ScoreFactor[] = [];
  let score = 0;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      budget: true,
      budgetCurrency: true,
      email: true,
      phone: true,
      company: true,
      propertyId: true,
      tags: true,
    },
  });
  if (!lead) return { score: 0, factors };

  // 1. Budget specified (max 10 points — higher budget = more qualified, converted to AED)
  let budgetPoints = 0;
  let budgetInAED = 0;
  const currencyCode =
    lead.budgetCurrency && isSupportedCurrency(lead.budgetCurrency)
      ? (lead.budgetCurrency as SupportedCurrency)
      : 'AED';

  if (lead.budget) {
    budgetInAED = convertToAED(lead.budget, currencyCode);

    if (budgetInAED >= 5_000_000)
      budgetPoints = 10; // AED 5M+ luxury
    else if (budgetInAED >= 2_000_000)
      budgetPoints = 8; // AED 2M+ premium
    else if (budgetInAED >= 1_000_000)
      budgetPoints = 6; // AED 1M+ standard
    else if (budgetInAED >= 500_000)
      budgetPoints = 4; // AED 500K+
    else if (budgetInAED > 0) budgetPoints = 2; // Has budget
  }
  score += budgetPoints;
  factors.push({
    category: 'demographic',
    factor: 'budget',
    points: budgetPoints,
    maxPoints: 10,
    description: lead.budget
      ? currencyCode === 'AED'
        ? `Budget: AED ${lead.budget.toLocaleString()}`
        : `Budget: ${currencyCode} ${lead.budget.toLocaleString()} (≈ AED ${Math.round(budgetInAED).toLocaleString()})`
      : 'No budget specified',
  });

  // 2. Contact completeness (max 8 points)
  let contactPoints = 0;
  if (lead.email && lead.phone) contactPoints = 8;
  else if (lead.phone) contactPoints = 5;
  else if (lead.email) contactPoints = 3;
  score += contactPoints;
  factors.push({
    category: 'demographic',
    factor: 'contact_info',
    points: contactPoints,
    maxPoints: 8,
    description: `${lead.email ? '✓ Email' : '✗ Email'} ${lead.phone ? '✓ Phone' : '✗ Phone'}`,
  });

  // 3. Company affiliation (max 4 points)
  const companyPoints = lead.company ? 4 : 0;
  score += companyPoints;
  factors.push({
    category: 'demographic',
    factor: 'company',
    points: companyPoints,
    maxPoints: 4,
    description: lead.company ? `Company: ${lead.company}` : 'No company',
  });

  // 4. Property interest (max 5 points)
  const propertyPoints = lead.propertyId ? 5 : 0;
  score += propertyPoints;
  factors.push({
    category: 'demographic',
    factor: 'property_interest',
    points: propertyPoints,
    maxPoints: 5,
    description: lead.propertyId ? 'Linked to specific property' : 'No property linked',
  });

  // 5. Tags richness (max 3 points)
  const tagCount = lead.tags?.length || 0;
  let tagPoints = 0;
  if (tagCount >= 3) tagPoints = 3;
  else if (tagCount >= 1) tagPoints = 1;
  score += tagPoints;
  factors.push({
    category: 'demographic',
    factor: 'tags',
    points: tagPoints,
    maxPoints: 3,
    description: `${tagCount} tags assigned`,
  });

  return { score: Math.min(30, score), factors };
}

/**
 * BEHAVIORAL (20% weight) — What actions indicate buying intent?
 * Factors: status progression, transaction stage, commission existence
 */
export async function scoreBehavioral(leadId: string): Promise<{ score: number; factors: ScoreFactor[] }> {
  const factors: ScoreFactor[] = [];
  let score = 0;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  });
  if (!lead) return { score: 0, factors };

  // 1. Lead status (max 10 points — further along pipeline = higher score)
  const statusScores: Record<string, number> = {
    new: 1,
    contacted: 2,
    qualified: 4,
    viewing: 5,
    offered: 7,
    negotiating: 9,
    won: 10,
    lost: 0,
    hot: 8,
    warm: 5,
    cold: 2,
  };
  const statusPoints = statusScores[lead.status] ?? 1;
  score += statusPoints;
  factors.push({
    category: 'behavioral',
    factor: 'status',
    points: statusPoints,
    maxPoints: 10,
    description: `Lead status: ${lead.status}`,
  });

  // 2. Active transactions (max 6 points)
  const transactionCount = await prisma.transaction.count({
    where: { leadId, status: { in: ['draft', 'pending', 'active'] } },
  });
  let txPoints = 0;
  if (transactionCount >= 2) txPoints = 6;
  else if (transactionCount >= 1) txPoints = 4;
  score += txPoints;
  factors.push({
    category: 'behavioral',
    factor: 'active_transactions',
    points: txPoints,
    maxPoints: 6,
    description: `${transactionCount} active transactions`,
  });

  // 3. Commission linked (max 4 points — means deal is progressing)
  const commissionCount = await prisma.commission.count({ where: { leadId } });
  const commPoints = commissionCount > 0 ? 4 : 0;
  score += commPoints;
  factors.push({
    category: 'behavioral',
    factor: 'commissions',
    points: commPoints,
    maxPoints: 4,
    description: commissionCount > 0 ? `${commissionCount} commissions linked` : 'No commissions',
  });

  return { score: Math.min(20, score), factors };
}

/**
 * SOURCE (10% weight) — How high-quality is the lead source?
 * Factors: source channel quality, lead age relative to source
 */
function scoreSource(source: string, createdAt: Date): { score: number; factors: ScoreFactor[] } {
  const factors: ScoreFactor[] = [];
  let score = 0;

  // 1. Source quality (max 7 points)
  const sourceScores: Record<string, number> = {
    referral: 7, // Highest quality — personal recommendation
    whatsapp: 6, // Direct engagement channel
    phone: 5, // Proactive caller
    website: 4, // Browsed and submitted form
    marketing: 3, // Campaign-driven
    direct: 2, // Walk-in or unknown
    social: 2, // Social media
    portal: 4, // Property portal (Bayut, PF, Dubizzle)
  };
  const sourcePoints = sourceScores[source] ?? 2;
  score += sourcePoints;
  factors.push({
    category: 'source',
    factor: 'channel',
    points: sourcePoints,
    maxPoints: 7,
    description: `Source: ${source}`,
  });

  // 2. Lead freshness (max 3 points — newer leads from good sources)
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  let freshnessPoints = 0;
  if (daysSinceCreation <= 3) freshnessPoints = 3;
  else if (daysSinceCreation <= 7) freshnessPoints = 2;
  else if (daysSinceCreation <= 30) freshnessPoints = 1;
  score += freshnessPoints;
  factors.push({
    category: 'source',
    factor: 'freshness',
    points: freshnessPoints,
    maxPoints: 3,
    description: `Lead age: ${Math.round(daysSinceCreation)} days`,
  });

  return { score: Math.min(10, score), factors };
}

// ─── Main scoring orchestrator ──────────────────────────────────────────

/**
 * Score a single lead — runs all 4 category scorers and persists result.
 * Returns full breakdown with previous vs new score comparison.
 */
