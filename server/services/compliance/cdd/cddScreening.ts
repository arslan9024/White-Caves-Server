/**
 * cddScreening.ts
 * PEP and sanctions list screening utilities for Customer Due Diligence
 */

const logger = require('../../../config/logger');

/**
 * Check OFAC SDN list (simulated)
 * @param customerName - Customer name
 * @returns OFAC screening result
 */
export async function checkOFACList(customerName: string): Promise<any> {
  try {
    return {
      list: 'OFAC SDN',
      isPEP: false,
      checked: true,
    };
  } catch (error: any) {
    logger.error(`Error checking OFAC list: ${error.message}`);
    throw error;
  }
}

/**
 * Check UN Sanctions list (simulated)
 * @param customerName - Customer name
 * @returns UN Sanctions screening result
 */
export async function checkUNSanctionsList(customerName: string): Promise<any> {
  try {
    return {
      list: 'UN Sanctions',
      isHit: false,
      checked: true,
    };
  } catch (error: any) {
    logger.error(`Error checking UN Sanctions list: ${error.message}`);
    throw error;
  }
}

/**
 * Check UAE FIU PEP list (simulated)
 * @param customerName - Customer name
 * @param nationality - Customer nationality
 * @returns UAE FIU PEP screening result
 */
export async function checkUAEFIUPEPList(customerName: string, nationality?: string): Promise<any> {
  try {
    return {
      list: 'UAE FIU PEP',
      isPEP: false,
      checked: true,
    };
  } catch (error: any) {
    logger.error(`Error checking UAE FIU PEP list: ${error.message}`);
    throw error;
  }
}

/**
 * Check DFSA enforcement list (simulated)
 * @param customerName - Customer name
 * @returns DFSA screening result
 */
export async function checkDFSAList(customerName: string): Promise<any> {
  try {
    return {
      list: 'DFSA Enforcement',
      isHit: false,
      checked: true,
    };
  } catch (error: any) {
    logger.error(`Error checking DFSA list: ${error.message}`);
    throw error;
  }
}

/**
 * Check EU consolidated sanctions list (simulated)
 * @param customerName - Customer name
 * @returns EU screening result
 */
export async function checkEUList(customerName: string): Promise<any> {
  try {
    return {
      list: 'EU Consolidated Sanctions',
      isHit: false,
      checked: true,
    };
  } catch (error: any) {
    logger.error(`Error checking EU list: ${error.message}`);
    throw error;
  }
}

/**
 * Perform PEP screening for a customer against multiple lists and update record
 * @param CustomerDueDiligence - CustomerDueDiligence mongoose model
 * @param customerId - Customer ID
 * @param customerName - Customer name
 * @param nationality - Customer nationality
 * @returns PEP screening result
 */
export async function performPEPScreening(
  CustomerDueDiligence: any,
  customerId: string,
  customerName: string,
  nationality?: string
): Promise<any> {
  try {
    const pepScreeningResult: any = {
      customerId,
      customerName,
      screeningDate: new Date(),
      lists: {
        ofac: await checkOFACList(customerName),
        unSanctions: await checkUNSanctionsList(customerName),
        uaeFIUPEP: await checkUAEFIUPEPList(customerName, nationality),
        dfsa: await checkDFSAList(customerName),
        eu: await checkEUList(customerName),
      },
      overallResult: 'clear',
      details: [],
    };

    // Aggregate results
    Object.entries(pepScreeningResult.lists).forEach(([list, result]: [string, any]) => {
      if (result.isPEP || result.isHit) {
        pepScreeningResult.overallResult = 'hit';
        pepScreeningResult.details.push({
          list,
          match: result.matchedName || result.name,
          details: result.details || '',
        });
      }
    });

    // Update CDD with screening result
    const cddRecord = await CustomerDueDiligence.findOne({ customerId });
    if (cddRecord) {
      cddRecord.pepStatus = pepScreeningResult.overallResult === 'hit' ? 'yes' : 'no';
      cddRecord.pepScreeningResult = pepScreeningResult;
      cddRecord.pepScreeningDate = pepScreeningResult.screeningDate;

      if (pepScreeningResult.overallResult === 'hit') {
        cddRecord.riskLevel = 'high';
        cddRecord.needsEDD = true;
      }

      cddRecord.auditTrail.push({
        action: 'pep_screening',
        actor: 'System',
        actorId: 'system',
        details: `PEP screening completed. Result: ${pepScreeningResult.overallResult}`,
        timestamp: new Date(),
      });

      await cddRecord.save();
    }

    logger.info(`PEP screening completed for customer: ${customerName}. Result: ${pepScreeningResult.overallResult}`);

    return pepScreeningResult;
  } catch (error: any) {
    logger.error(`Error performing PEP screening: ${error.message}`);
    throw error;
  }
}

module.exports = {
  checkOFACList,
  checkUNSanctionsList,
  checkUAEFIUPEPList,
  checkDFSAList,
  checkEUList,
  performPEPScreening,
};
