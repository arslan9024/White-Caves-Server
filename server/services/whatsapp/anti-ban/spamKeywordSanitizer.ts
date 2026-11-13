/**
 * spamKeywordSanitizer.ts — Pre-flight scan for high-risk words that trigger
 * WhatsApp's automated spam filters.
 *
 * Returns a risk assessment and optionally suggests safer alternatives.
 */

export interface SpamScanResult {
  clean: boolean;
  riskScore: number;        // 0–100
  flaggedWords: string[];
  suggestions: string[];
}

/** High-risk keywords grouped by category. */
const SPAM_KEYWORDS: readonly string[] = [
  // Financial spam triggers
  'free money', 'guaranteed returns', 'double your income', 'get rich quick',
  'no risk', 'act now', 'limited time offer', 'click here', 'click below',
  // Phishing triggers
  'verify your account', 'confirm your identity', 'suspended account',
  'unusual activity', 'login immediately',
  // Aggressive sales
  'buy now', 'order now', 'special promotion', 'exclusive deal',
  'congratulations you won', 'you have been selected', 'claim your prize',
  // Crypto / scam
  'bitcoin investment', 'crypto opportunity', 'forex trading',
  'binary options', 'guaranteed profit',
  // Urgency manipulation
  'urgent action required', 'final warning', 'last chance',
  'expires today', 'immediate response needed',
] as const;

/** Medium-risk words (contextually suspicious). */
const MEDIUM_RISK: readonly string[] = [
  'discount', 'offer', 'promo', 'winner', 'selected',
  'investment opportunity', 'earn from home', 'passive income',
  'whatsapp', 'forward this',
] as const;

const HIGH_RISK_SCORE = 15;
const MEDIUM_RISK_SCORE = 5;
const RISK_THRESHOLD = 25;

/**
 * Scan text for spam keywords and compute a risk score.
 *
 * @param text  The outgoing message text to scan.
 * @returns Scan result with risk assessment.
 */
export function scanForSpamKeywords(text: string): SpamScanResult {
  const lower = text.toLowerCase();
  const flaggedWords: string[] = [];
  let riskScore = 0;

  // Check high-risk phrases
  for (const keyword of SPAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      flaggedWords.push(keyword);
      riskScore += HIGH_RISK_SCORE;
    }
  }

  // Check medium-risk words
  for (const keyword of MEDIUM_RISK) {
    if (lower.includes(keyword)) {
      flaggedWords.push(keyword);
      riskScore += MEDIUM_RISK_SCORE;
    }
  }

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  // Build suggestions
  const suggestions: string[] = [];
  if (flaggedWords.length > 0) {
    suggestions.push('Consider rephrasing to avoid spam-trigger keywords.');
  }
  if (riskScore >= 50) {
    suggestions.push('HIGH RISK: This message is very likely to trigger spam filters.');
    suggestions.push('Split into multiple shorter, conversational messages.');
  }
  if (lower.includes('click here') || lower.includes('click below')) {
    suggestions.push('Replace "click here" with a natural call to action.');
  }
  if (text.toUpperCase() === text && text.length > 20) {
    suggestions.push('Avoid ALL CAPS — it is a strong spam signal.');
    riskScore = Math.min(100, riskScore + 10);
  }

  return {
    clean: riskScore < RISK_THRESHOLD,
    riskScore,
    flaggedWords,
    suggestions,
  };
}
