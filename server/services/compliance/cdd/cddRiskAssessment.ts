/**
 * cddRiskAssessment.ts
 * Risk assessment and jurisdictional risk scoring for Customer Due Diligence
 */

const logger = require('../../../config/logger');

export const HIGH_RISK_JURISDICTIONS = [
  'North Korea',
  'Iran',
  'Syria',
  'Sudan',
  'Yemen',
  'South Sudan',
];

/**
 * Check if jurisdiction is high-risk
 * @param nationality - Jurisdiction name
 * @returns Whether jurisdiction is high-risk
 */
export function isHighRiskJurisdiction(nationality?: string): boolean {
  if (!nationality) return false;
  return HIGH_RISK_JURISDICTIONS.includes(nationality);
}

/**
 * Get risk factors for a customer
 * @param cddData - Customer data
 * @returns List of risk factors
 */
export function getRiskFactors(cddData: any = {}): string[] {
  const factors: string[] = [];

  if (cddData.customerType === 'entity') factors.push('Corporate entity');
  if (cddData.pepStatus === 'yes') factors.push('PEP identified');
  if (cddData.nationality && isHighRiskJurisdiction(cddData.nationality)) {
    factors.push(`High-risk jurisdiction: ${cddData.nationality}`);
  }
  if (!cddData.sourceOfFundsDocumentation || cddData.sourceOfFundsDocumentation.length === 0) {
    factors.push('Insufficient source of funds documentation');
  }
  if (cddData.beneficialOwners && cddData.beneficialOwners.length > 0) {
    factors.push(`Complex beneficial ownership (${cddData.beneficialOwners.length} owners)`);
  }

  return factors.length > 0 ? factors : ['No significant risk factors'];
}

/**
 * Assess customer risk level based on provided data
 * @param cddData - Customer data
 * @returns Risk level (low, medium, high)
 */
export async function assessRiskLevel(cddData: any = {}): Promise<string> {
  try {
    let riskScore = 0;

    // Risk factors
    if (cddData.customerType === 'entity') riskScore += 10;
    if (cddData.pepStatus === 'yes') riskScore += 50;
    if (cddData.nationality && isHighRiskJurisdiction(cddData.nationality)) riskScore += 20;
    if (!cddData.sourceOfFundsDocumentation || cddData.sourceOfFundsDocumentation.length === 0) riskScore += 15;
    if (cddData.beneficialOwners && cddData.beneficialOwners.length > 0) {
      cddData.beneficialOwners.forEach(() => {
        riskScore += 5;
      });
    }

    // Determine risk level
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  } catch (error: any) {
    logger.error(`Error assessing risk level: ${error.message}`);
    return 'medium'; // Default to medium if assessment fails
  }
}

module.exports = {
  HIGH_RISK_JURISDICTIONS,
  isHighRiskJurisdiction,
  getRiskFactors,
  assessRiskLevel,
};
