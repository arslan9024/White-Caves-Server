/**
 * Deterministic Lead Scoring Engine (Point 22).
 */
export function scoreRealEstateLead(input: {
  budgetAed: number;
  cashBuyer: boolean;
  verifiedPhone: boolean;
}): number {
  let score = input.verifiedPhone ? 20 : 0;
  if (input.budgetAed >= 5_000_000) score += 45;
  else if (input.budgetAed >= 1_500_000) score += 25;
  else if (input.budgetAed > 0) score += 10;
  if (input.cashBuyer) score += 35;
  return Math.min(100, score);
}
