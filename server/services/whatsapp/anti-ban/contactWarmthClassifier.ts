/**
 * contactWarmthClassifier.ts — Classify contacts as Cold / Warm / Hot / VIP.
 *
 * Uses recency and frequency of interaction, plus manual VIP tagging,
 * to determine how aggressively a contact should be messaged.
 */

export type WarmthLevel = 'COLD' | 'WARM' | 'HOT' | 'VIP';

export interface ContactProfile {
  phoneNumber: string;
  lastInboundAt?: Date | null;
  lastOutboundAt?: Date | null;
  totalInbound?: number;
  totalOutbound?: number;
  isVip?: boolean;
  tags?: string[];
}

export interface WarmthResult {
  phoneNumber: string;
  level: WarmthLevel;
  score: number;          // 0–100 internal score
  reason: string;
}

const DAY_MS = 86_400_000;

/** Scoring weights. */
const RECENCY_WEIGHT = 40;
const FREQUENCY_WEIGHT = 30;
const BIDIRECTIONAL_WEIGHT = 30;

/**
 * Compute a recency score (0–1) based on how recently the contact interacted.
 */
function recencyScore(lastDate: Date | null | undefined): number {
  if (!lastDate) return 0;
  const daysAgo = (Date.now() - lastDate.getTime()) / DAY_MS;

  if (daysAgo <= 1) return 1.0;
  if (daysAgo <= 7) return 0.8;
  if (daysAgo <= 30) return 0.5;
  if (daysAgo <= 90) return 0.2;
  return 0;
}

/**
 * Compute a frequency score (0–1) based on total message count.
 */
function frequencyScore(inbound: number, outbound: number): number {
  const total = inbound + outbound;
  if (total >= 50) return 1.0;
  if (total >= 20) return 0.7;
  if (total >= 5) return 0.4;
  if (total >= 1) return 0.1;
  return 0;
}

/**
 * Score for bidirectional engagement (inbound responses indicate interest).
 */
function bidirectionalScore(inbound: number, outbound: number): number {
  if (outbound === 0) return 0;
  const ratio = inbound / outbound;
  if (ratio >= 0.8) return 1.0;
  if (ratio >= 0.5) return 0.7;
  if (ratio >= 0.2) return 0.4;
  if (ratio > 0) return 0.1;
  return 0;
}

/**
 * Map a numeric score to a warmth level.
 */
function scoreToLevel(score: number, isVip: boolean): WarmthLevel {
  if (isVip) return 'VIP';
  if (score >= 70) return 'HOT';
  if (score >= 35) return 'WARM';
  return 'COLD';
}

/**
 * Classify a contact's warmth level based on interaction history.
 *
 * @param contact  Profile data for the contact.
 * @returns Classification result with level, score, and reasoning.
 */
export function classifyContactWarmth(contact: ContactProfile): WarmthResult {
  if (contact.isVip) {
    return {
      phoneNumber: contact.phoneNumber,
      level: 'VIP',
      score: 100,
      reason: 'Manually tagged as VIP',
    };
  }

  const inbound = contact.totalInbound ?? 0;
  const outbound = contact.totalOutbound ?? 0;

  const recency = recencyScore(contact.lastInboundAt ?? contact.lastOutboundAt);
  const frequency = frequencyScore(inbound, outbound);
  const bidir = bidirectionalScore(inbound, outbound);

  const score = Math.round(
    recency * RECENCY_WEIGHT +
    frequency * FREQUENCY_WEIGHT +
    bidir * BIDIRECTIONAL_WEIGHT,
  );

  const level = scoreToLevel(score, false);

  const reasons: string[] = [];
  if (recency >= 0.8) reasons.push('recent interaction');
  if (frequency >= 0.7) reasons.push('frequent contact');
  if (bidir >= 0.7) reasons.push('strong two-way engagement');
  if (reasons.length === 0) reasons.push('limited interaction history');

  return {
    phoneNumber: contact.phoneNumber,
    level,
    score,
    reason: reasons.join(', '),
  };
}
