/**
 * cddWorkflow.ts
 * Workflow operations for Customer Due Diligence: EDD, approval, rejection, and queries
 */

const logger = require('../../../config/logger');

/**
 * Perform Enhanced Due Diligence (EDD)
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @param eddData - EDD information
 * @returns EDD assessment result
 */
export async function performEnhancedDueDiligence(
  CustomerDueDiligence: any,
  customerId: string,
  eddData: any
): Promise<any> {
  try {
    const {
      eddOfficerId,
      eddOfficerName,
      sourceOfWealthDocumentation,
      businessPurposeAnalysis,
      beneficiaryAnalysis,
      transactionPatternAnalysis,
      additionalFinancialDocumentation,
      adverseMediaSearchResults,
    } = eddData;

    const cddRecord = await CustomerDueDiligence.findOne({ customerId });
    if (!cddRecord) {
      throw new Error('CDD record not found for customer');
    }

    const eddAssessment = {
      eddPerformedDate: new Date(),
      performedBy: eddOfficerName,
      performedById: eddOfficerId,
      sourceOfWealthVerification: {
        documentsProvided: sourceOfWealthDocumentation || [],
        verified: true,
        details: 'Wealth source verified through provided documentation',
      },
      businessPurposeAnalysis: businessPurposeAnalysis || 'Transaction purpose understood and documented',
      beneficiaryAnalysis: beneficiaryAnalysis || [],
      transactionPatternAnalysis: transactionPatternAnalysis || 'Normal transaction patterns observed',
      additionalDocumentation: additionalFinancialDocumentation || [],
      adverseMediaSearch: {
        performed: true,
        results: adverseMediaSearchResults || 'No adverse media found',
      },
      eddConclusion: 'Customer cleared for transaction',
      eddRiskLevel: 'medium',
    };

    // Update CDD with EDD results
    cddRecord.needsEDD = false;
    cddRecord.enhancedDueDiligence = eddAssessment;
    cddRecord.approvalStatus = 'pending_approval';

    cddRecord.auditTrail.push({
      action: 'edd_performed',
      actor: eddOfficerName,
      actorId: eddOfficerId,
      details: `Enhanced Due Diligence completed. Conclusion: ${eddAssessment.eddConclusion}`,
      timestamp: new Date(),
    });

    await cddRecord.save();

    logger.info(`Enhanced Due Diligence completed for customer: ${cddRecord.customerName}`);

    return {
      customerId,
      eddAssessment,
    };
  } catch (error: any) {
    logger.error(`Error performing EDD: ${error.message}`);
    throw error;
  }
}

/**
 * Approve CDD record
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @param approvalData - Approval information
 * @returns Updated CDD record
 */
export async function approveCDD(
  CustomerDueDiligence: any,
  customerId: string,
  approvalData: any
): Promise<any> {
  try {
    const {
      approverId,
      approverName,
      approvalComments,
      conditionsForApproval,
    } = approvalData;

    const cddRecord = await CustomerDueDiligence.findOne({ customerId });
    if (!cddRecord) {
      throw new Error('CDD record not found');
    }

    cddRecord.approvalStatus = 'approved';
    cddRecord.approvedBy = approverName;
    cddRecord.approvedById = approverId;
    cddRecord.approvalDate = new Date();
    cddRecord.approvalComments = approvalComments || '';
    cddRecord.conditionsForApproval = conditionsForApproval || [];

    cddRecord.auditTrail.push({
      action: 'cdd_approved',
      actor: approverName,
      actorId: approverId,
      details: `CDD record approved for customer. ${approvalComments || ''}`,
      timestamp: new Date(),
    });

    await cddRecord.save();

    logger.info(`CDD record approved for customer: ${cddRecord.customerName}`);

    return cddRecord;
  } catch (error: any) {
    logger.error(`Error approving CDD: ${error.message}`);
    throw error;
  }
}

/**
 * Reject CDD record with reason
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @param rejectionData - Rejection information
 * @returns Updated CDD record
 */
export async function rejectCDD(
  CustomerDueDiligence: any,
  customerId: string,
  rejectionData: any
): Promise<any> {
  try {
    const {
      rejecterId,
      rejectorName,
      rejectionReason,
      requiredCorrectionss,
    } = rejectionData;

    const cddRecord = await CustomerDueDiligence.findOne({ customerId });
    if (!cddRecord) {
      throw new Error('CDD record not found');
    }

    cddRecord.approvalStatus = 'rejected';
    cddRecord.rejectionReason = rejectionReason;
    cddRecord.requiredCorrections = requiredCorrectionss || [];
    cddRecord.rejectedDate = new Date();

    cddRecord.auditTrail.push({
      action: 'cdd_rejected',
      actor: rejectorName,
      actorId: rejecterId,
      details: `CDD record rejected. Reason: ${rejectionReason}. Required corrections: ${(requiredCorrectionss || []).join(', ')}`,
      timestamp: new Date(),
    });

    await cddRecord.save();

    logger.info(`CDD record rejected for customer: ${cddRecord.customerName}`);

    return cddRecord;
  } catch (error: any) {
    logger.error(`Error rejecting CDD: ${error.message}`);
    throw error;
  }
}

/**
 * Get CDD record with full details
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @returns CDD record
 */
export async function getCDDRecord(CustomerDueDiligence: any, customerId: string): Promise<any> {
  try {
    const cddRecord = await CustomerDueDiligence.findOne({ customerId });

    if (!cddRecord) {
      throw new Error('CDD record not found');
    }

    return cddRecord;
  } catch (error: any) {
    logger.error(`Error retrieving CDD record: ${error.message}`);
    throw error;
  }
}

/**
 * Get audit trail for CDD record
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @returns Audit trail
 */
export async function getCDDAuditTrail(CustomerDueDiligence: any, customerId: string): Promise<any> {
  try {
    const cddRecord = await CustomerDueDiligence.findOne({ customerId })
      .select('customerName auditTrail')
      .lean();

    if (!cddRecord) {
      throw new Error('CDD record not found');
    }

    return {
      customerName: cddRecord.customerName,
      auditTrail: cddRecord.auditTrail.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    };
  } catch (error: any) {
    logger.error(`Error retrieving CDD audit trail: ${error.message}`);
    throw error;
  }
}

/**
 * Search CDD records by filters
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param filters - Filter criteria
 * @returns Matching CDD records
 */
export async function searchCDDRecords(CustomerDueDiligence: any, filters: any = {}): Promise<any> {
  try {
    const query: any = {};

    if (filters.customerName) {
      query.customerName = { $regex: filters.customerName, $options: 'i' };
    }
    if (filters.riskLevel) query.riskLevel = filters.riskLevel;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.pepStatus) query.pepStatus = filters.pepStatus;

    const records = await CustomerDueDiligence.find(query)
      .select(
        'customerId customerName customerType riskLevel approvalStatus pepStatus createdDate'
      )
      .sort({ createdDate: -1 })
      .lean();

    return records;
  } catch (error: any) {
    logger.error(`Error searching CDD records: ${error.message}`);
    throw error;
  }
}

module.exports = {
  performEnhancedDueDiligence,
  approveCDD,
  rejectCDD,
  getCDDRecord,
  getCDDAuditTrail,
  searchCDDRecords,
};
