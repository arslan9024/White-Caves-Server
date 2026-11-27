/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-object-injection */
/**
 * Lead Scoring Engine — Phase 2A
 *
 * Multi-factor scoring algorithm with 4 weighted categories:
 *   Engagement (40%) + Demographic (30%) + Behavioral (20%) + Source (10%)
 *
 * Score range: 0–100
 * Tiers: hot (80+), warm (60-79), cold (30-59), inactive (<30)
 *
 * Usage:
 *   import { scoreLead, batchRescoreLeads } from './leadScoringEngine.js';
 *   const result = await scoreLead(leadId);
 *   const batch  = await batchRescoreLeads();
 */

import { prisma } from '../../../database.js';
import logger from '../../../utils/logger.js';
import { convertToAED, isSupportedCurrency, type SupportedCurrency } from '../../currencyService.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  engagement: number; // 0-40 (40% weight)
  demographic: number; // 0-30 (30% weight)
  behavioral: number; // 0-20 (20% weight)
  source: number; // 0-10 (10% weight)
  total: number; // 0-100
  tier: 'hot' | 'warm' | 'cold' | 'inactive';
  factors: ScoreFactor[];
  lastScoredAt: string;
}

export interface ScoreFactor {
  category: 'engagement' | 'demographic' | 'behavioral' | 'source';
  factor: string;
  points: number;
  maxPoints: number;
  description: string;
}

export interface ScoreResult {
  leadId: string;
  previousScore: number;
  newScore: number;
  previousTier: string;
  newTier: string;
  breakdown: ScoreBreakdown;
  changed: boolean;
}

export interface BatchScoreResult {
  total: number;
  scored: number;
  errors: number;
  upgraded: number; // Tier went up (cold → warm, warm → hot)
  downgraded: number; // Tier went down
  unchanged: number;
  duration: number; // ms
}

// ─── Tier logic ─────────────────────────────────────────────────────────

export function getTier(score: number): 'hot' | 'warm' | 'cold' | 'inactive' {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 30) return 'cold';
  return 'inactive';
}

export const TIER_RANK: Record<string, number> = { inactive: 0, cold: 1, warm: 2, hot: 3 };

