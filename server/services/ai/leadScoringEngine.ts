/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-object-injection */
import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import { getTier, TIER_RANK, type ScoreBreakdown, type ScoreFactor, type ScoreResult, type BatchScoreResult } from './leadScoring/types.js';
import { scoreEngagement, scoreDemographic, scoreBehavioral, scoreSource } from './leadScoring/categories.js';
export { getTier, type ScoreBreakdown, type ScoreFactor, type ScoreResult, type BatchScoreResult } from './leadScoring/types.js';
export { getScoreHistory, getScoreTrending, applyWhatsAppSignal } from './leadScoring/history.js';

export async function scoreLead(leadId: string): Promise<ScoreResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, score: true, scoreTier: true, source: true, createdAt: true },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Run all 4 category scorers in parallel
  const [engagement, demographic, behavioral] = await Promise.all([
    scoreEngagement(leadId),
    scoreDemographic(leadId),
    scoreBehavioral(leadId),
  ]);
  const source = scoreSource(lead.source, lead.createdAt);

  const totalScore = engagement.score + demographic.score + behavioral.score + source.score;
  const tier = getTier(totalScore);
  const now = new Date();

  const breakdown: ScoreBreakdown = {
    engagement: engagement.score,
    demographic: demographic.score,
    behavioral: behavioral.score,
    source: source.score,
    total: totalScore,
    tier,
    factors: [
      ...engagement.factors,
      ...demographic.factors,
      ...behavioral.factors,
      ...source.factors,
    ],
    lastScoredAt: now.toISOString(),
  };

  // Persist to DB
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: totalScore,
      scoreTier: tier,
      scoreBreakdown: breakdown as any,
      lastScoredAt: now,
    },
  });

  const previousTier = lead.scoreTier || 'cold';
  const changed = lead.score !== totalScore;

  // Record score history for trending (Phase 4A)
  await prisma.leadScoreHistory
    .create({
      data: {
        leadId,
        score: totalScore,
        tier,
        previousScore: lead.score,
        previousTier,
        breakdown: {
          engagement: engagement.score,
          demographic: demographic.score,
          behavioral: behavioral.score,
          source: source.score,
        },
        trigger: 'middleware',
      },
    })
    .catch((err: unknown) => {
      logger.warn('Failed to record score history', { leadId, error: err });
    });

  // Log significant score changes as activities
  if (changed && Math.abs(totalScore - lead.score) >= 10) {
    await prisma.activity
      .create({
        data: {
          type: 'lead',
          action: 'score_changed',
          description: `Lead score ${lead.score} → ${totalScore} (${previousTier} → ${tier})`,
          leadId,
          metadata: {
            previousScore: lead.score,
            newScore: totalScore,
            previousTier,
            newTier: tier,
          },
        },
      })
      .catch((err: unknown) => {
        logger.warn('Failed to log score change activity', { leadId, error: err });
      });
  }

  return {
    leadId,
    previousScore: lead.score,
    newScore: totalScore,
    previousTier,
    newTier: tier,
    breakdown,
    changed,
  };
}

/**
 * Manual score override — sets score + logs justification.
 * Agents can adjust scoring when they have contextual knowledge.
 */
export async function overrideScore(
  leadId: string,
  newScore: number,
  reason: string,
  userId?: string
): Promise<ScoreResult> {
  const clamped = Math.max(0, Math.min(100, Math.round(newScore)));
  const tier = getTier(clamped);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, score: true, scoreTier: true, scoreBreakdown: true },
  });
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const now = new Date();
  const previousBreakdown = (lead.scoreBreakdown as Record<string, unknown>) || {};

  const breakdown: ScoreBreakdown = {
    engagement: (previousBreakdown.engagement as number) || 0,
    demographic: (previousBreakdown.demographic as number) || 0,
    behavioral: (previousBreakdown.behavioral as number) || 0,
    source: (previousBreakdown.source as number) || 0,
    total: clamped,
    tier,
    factors: (previousBreakdown.factors as ScoreFactor[]) || [],
    lastScoredAt: now.toISOString(),
  };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: clamped,
      scoreTier: tier,
      scoreBreakdown: {
        ...breakdown,
        override: { score: clamped, reason, userId, at: now.toISOString() },
      } as any,
      lastScoredAt: now,
    },
  });

  // Log override as activity
  await prisma.activity
    .create({
      data: {
        type: 'lead',
        action: 'score_override',
        description: `Score manually set to ${clamped} (${tier}): ${reason}`,
        leadId,
        userId: userId || null,
        metadata: { previousScore: lead.score, newScore: clamped, reason },
      },
    })
    .catch((err: unknown) => {
      logger.warn('Failed to log score override activity', { leadId, error: err });
    });

  return {
    leadId,
    previousScore: lead.score,
    newScore: clamped,
    previousTier: lead.scoreTier || 'cold',
    newTier: tier,
    breakdown,
    changed: lead.score !== clamped,
  };
}

/**
 * Batch re-score all active leads (excludes won/lost).
 * Called by cron job every 6 hours.
 */
export async function batchRescoreLeads(): Promise<BatchScoreResult> {
  const startTime = Date.now();
  let scored = 0;
  let errors = 0;
  let upgraded = 0;
  let downgraded = 0;
  let unchanged = 0;

  // Fetch all active leads (not won/lost)
  const leads = await prisma.lead.findMany({
    where: { status: { notIn: ['won', 'lost'] } },
    select: { id: true, scoreTier: true },
    orderBy: { createdAt: 'desc' },
  });

  const total = leads.length;
  logger.info(`[LeadScoring] Batch re-score started — ${total} active leads`);

  // Process in batches of 20 to avoid overwhelming the DB
  const BATCH_SIZE = 20;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((lead: (typeof leads)[number]) => scoreLead(lead.id))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        scored++;
        const previousRank = TIER_RANK[batch[j].scoreTier || 'cold'] ?? 1;
        const newRank = TIER_RANK[result.value.newTier] ?? 1;
        if (newRank > previousRank) upgraded++;
        else if (newRank < previousRank) downgraded++;
        else unchanged++;
      } else {
        errors++;
        logger.warn('[LeadScoring] Failed to score lead', {
          leadId: batch[j].id,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    `[LeadScoring] Batch complete — ${scored}/${total} scored, ${upgraded} upgraded, ${downgraded} downgraded, ${errors} errors (${duration}ms)`
  );

  return { total, scored, errors, upgraded, downgraded, unchanged, duration };
}

export default {
  scoreLead,
  overrideScore,
  batchRescoreLeads,
  getTier,
  getScoreHistory,
  getScoreTrending,
  applyWhatsAppSignal,
};

// ─── Score History & Trending (Phase 4A) ────────────────────────────────

/**
 * Get score history for a lead — used for trending charts.
