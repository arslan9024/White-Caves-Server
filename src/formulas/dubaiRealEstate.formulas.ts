/**
 * Pure Dubai RERA, PDC cheque, VAT, corporate tax, commission, and XP formulas.
 */

export const DUBAI_STATUTORY = {
  VAT_RATE: 0.05,
  CORPORATE_TAX_RATE: 0.09,
  COMMISSION_SPLIT_STANDARD: 0.6,
  COMMISSION_SPLIT_SENIOR: 0.7,
  STATUTORY_GATE_XP: 500,
} as const;

export interface CommissionSplitResult {
  agentShare: number;
  companyShare: number;
  splitRate: number;
}

function roundAed(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Splits annual rent across N post-dated cheques (PDCs), adjusting rounding
 * remainder on the final cheque so the sum equals annualRentAed.
 */
export function splitPdcCheques(annualRentAed: number, chequeCount: number): number[] {
  if (!Number.isInteger(chequeCount) || chequeCount < 1) {
    throw new Error('chequeCount must be a positive integer');
  }
  if (annualRentAed < 0) {
    throw new Error('annualRentAed must be non-negative');
  }

  const base = roundAed(annualRentAed / chequeCount);
  const cheques = Array.from({ length: chequeCount }, () => base);
  const allocated = roundAed(base * (chequeCount - 1));
  cheques[chequeCount - 1] = roundAed(annualRentAed - allocated);
  return cheques;
}

/**
 * Computes UAE 5% VAT on a taxable amount.
 */
export function computeVatAmount(amountAed: number, rate = DUBAI_STATUTORY.VAT_RATE): number {
  return roundAed(amountAed * rate);
}

/**
 * Computes UAE 9% corporate tax reserve on net profit (0 if netProfitAed <= 0).
 */
export function computeCorporateTaxReserve(
  netProfitAed: number,
  rate = DUBAI_STATUTORY.CORPORATE_TAX_RATE
): number {
  if (netProfitAed <= 0) {
    return 0;
  }
  return roundAed(netProfitAed * rate);
}

/**
 * Computes agent vs company commission split (60% standard, 70% senior).
 */
export function computeCommissionSplit(
  grossCommissionAed: number,
  tier: 'standard' | 'senior' = 'standard'
): CommissionSplitResult {
  const splitRate =
    tier === 'senior'
      ? DUBAI_STATUTORY.COMMISSION_SPLIT_SENIOR
      : DUBAI_STATUTORY.COMMISSION_SPLIT_STANDARD;
  const agentShare = roundAed(grossCommissionAed * splitRate);
  const companyShare = roundAed(grossCommissionAed - agentShare);

  return { agentShare, companyShare, splitRate };
}

/**
 * Computes +500 XP per passed statutory gate.
 */
export function computeStatutoryGateXp(passedGates: number): number {
  if (passedGates <= 0) {
    return 0;
  }
  return Math.floor(passedGates) * DUBAI_STATUTORY.STATUTORY_GATE_XP;
}
