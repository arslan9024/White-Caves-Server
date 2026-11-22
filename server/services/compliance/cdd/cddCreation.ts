/**
 * cddCreation.ts
 * Record creation logic for Customer Due Diligence
 */

const logger = require('../../../config/logger');
const { assessRiskLevel, getRiskFactors } = require('./cddRiskAssessment');

/**
 * Create a new CDD record for a customer
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param cddData - Customer information for CDD
 * @returns Created CDD record
 */
export async function createCDDRecord(CustomerDueDiligence: any, cddData: any): Promise<any> {
  try {
    const {
      customerId,
      customerName,
      customerType, // 'individual' or 'entity'
      customerEmail,
      customerPhone,
      nationality,
      dateOfBirth, // for individuals
      businessType, // for entities
      registrationNumber, // for entities
      businessAddress, // for entities
      residentialAddress,
      sourceOfFunds,
      sourceOfFundsDocumentation,
      pepStatus,
      pepDetails,
      beneficialOwners, // for entities
      documentsUploaded,
      riskAssessmentOfficerId,
      riskAssessmentOfficerName,
    } = cddData;

    // Validate required fields
    if (!customerId || !customerName || !customerType) {
      throw new Error('Missing required customer information');
    }

    // Check if CDD already exists
    const existingCDD = await CustomerDueDiligence.findOne({ customerId });
    if (existingCDD) {
      throw new Error(`CDD record already exists for customer ${customerId}`);
    }

    // Assess risk level based on information
    const riskLevel = await assessRiskLevel(cddData);

    // Create CDD record
    const cddRecord = new CustomerDueDiligence({
      customerId,
      customerName,
      customerType,
      customerEmail,
      customerPhone,
      nationality,
      dateOfBirth: customerType === 'individual' ? dateOfBirth : null,
      businessType: customerType === 'entity' ? businessType : null,
      registrationNumber: customerType === 'entity' ? registrationNumber : null,
      businessAddress: customerType === 'entity' ? businessAddress : null,
      residentialAddress,
      sourceOfFunds,
      sourceOfFundsDocumentation: sourceOfFundsDocumentation || [],
      pepStatus,
      pepDetails: pepStatus === 'yes' ? pepDetails : null,
      beneficialOwners: customerType === 'entity' ? beneficialOwners || [] : [],
      documentsUploaded: documentsUploaded || [],
      riskLevel,
      riskAssessmentDetails: {
        assessedBy: riskAssessmentOfficerName,
        assessedById: riskAssessmentOfficerId,
        assessmentDate: new Date(),
        factors: getRiskFactors(cddData),
      },
      cddStatus: 'completed',
      approvalStatus: 'pending_approval',
      createdDate: new Date(),
      auditTrail: [
        {
          action: 'cdd_created',
          actor: riskAssessmentOfficerName,
          actorId: riskAssessmentOfficerId,
          details: `CDD record created for customer ${customerName} (Risk Level: ${riskLevel})`,
          timestamp: new Date(),
        },
      ],
    });

    await cddRecord.save();

    logger.info(`CDD record created for customer: ${customerName} (${customerId})`);

    return cddRecord;
  } catch (error: any) {
    logger.error(`Error creating CDD record: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createCDDRecord,
};
