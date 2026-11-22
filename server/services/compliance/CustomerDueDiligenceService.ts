/**
 * CustomerDueDiligenceService.ts
 * Manages Customer Due Diligence (CDD) and Enhanced Due Diligence (EDD) procedures
 * Handles customer risk assessment, PEP screening, and CDD documentation
 *
 * AEGIS V5.1 Decomposed Modular Service
 */

const CustomerDueDiligence = require('../../models/compliance/CustomerDueDiligence');
const {
  isHighRiskJurisdiction,
  getRiskFactors,
  assessRiskLevel,
  HIGH_RISK_JURISDICTIONS,
} = require('./cdd/cddRiskAssessment');
const {
  checkOFACList,
  checkUNSanctionsList,
  checkUAEFIUPEPList,
  checkDFSAList,
  checkEUList,
  performPEPScreening,
} = require('./cdd/cddScreening');
const {
  performEnhancedDueDiligence,
  approveCDD,
  rejectCDD,
  getCDDRecord,
  getCDDAuditTrail,
  searchCDDRecords,
} = require('./cdd/cddWorkflow');
const { createCDDRecord } = require('./cdd/cddCreation');

class CustomerDueDiligenceService {
  /**
   * Create a new CDD record for a customer
   * @param {Object} cddData - Customer information for CDD
   * @returns {Promise<Object>} Created CDD record
   */
  async createCDDRecord(cddData: any) {
    return createCDDRecord(CustomerDueDiligence, cddData);
  }

  /**
   * Perform PEP screening for a customer
   * @param {string} customerId - Customer ID
   * @param {string} customerName - Customer name
   * @param {string} nationality - Customer nationality
   * @returns {Promise<Object>} PEP screening result
   */
  async performPEPScreening(customerId: string, customerName: string, nationality: string) {
    return performPEPScreening(CustomerDueDiligence, customerId, customerName, nationality);
  }

  /**
   * Perform Enhanced Due Diligence (EDD)
   * @param {string} customerId - Customer ID
   * @param {Object} eddData - EDD information
   * @returns {Promise<Object>} EDD assessment result
   */
  async performEnhancedDueDiligence(customerId: string, eddData: any) {
    return performEnhancedDueDiligence(CustomerDueDiligence, customerId, eddData);
  }

  /**
   * Approve CDD record
   * @param {string} customerId - Customer ID
   * @param {Object} approvalData - Approval information
   * @returns {Promise<Object>} Updated CDD record
   */
  async approveCDD(customerId: string, approvalData: any) {
    return approveCDD(CustomerDueDiligence, customerId, approvalData);
  }

  /**
   * Reject CDD record with reason
   * @param {string} customerId - Customer ID
   * @param {Object} rejectionData - Rejection information
   * @returns {Promise<Object>} Updated CDD record
   */
  async rejectCDD(customerId: string, rejectionData: any) {
    return rejectCDD(CustomerDueDiligence, customerId, rejectionData);
  }

  /**
   * Get CDD record with full details
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} CDD record
   */
  async getCDDRecord(customerId: string) {
    return getCDDRecord(CustomerDueDiligence, customerId);
  }

  /**
   * Get audit trail for CDD record
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Audit trail
   */
  async getCDDAuditTrail(customerId: string) {
    return getCDDAuditTrail(CustomerDueDiligence, customerId);
  }

  /**
   * Search CDD records by filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Matching CDD records
   */
  async searchCDDRecords(filters: any = {}) {
    return searchCDDRecords(CustomerDueDiligence, filters);
  }

  /**
   * Assess customer risk level based on provided data
   * @param {Object} cddData - Customer data
   * @returns {Promise<string>} Risk level (low, medium, high)
   */
  async assessRiskLevel(cddData: any) {
    return assessRiskLevel(cddData);
  }

  /**
   * Get risk factors for a customer
   * @param {Object} cddData - Customer data
   * @returns {Array} List of risk factors
   */
  getRiskFactors(cddData: any) {
    return getRiskFactors(cddData);
  }

  /**
   * Check if jurisdiction is high-risk
   * @param {string} nationality - Jurisdiction name
   * @returns {boolean} Whether jurisdiction is high-risk
   */
  isHighRiskJurisdiction(nationality: string) {
    return isHighRiskJurisdiction(nationality);
  }

  /**
   * Check OFAC SDN list (simulated)
   * @param {string} customerName - Customer name
   * @returns {Promise<Object>} OFAC screening result
   */
  async checkOFACList(customerName: string) {
    return checkOFACList(customerName);
  }

  /**
   * Check UN Sanctions list (simulated)
   * @param {string} customerName - Customer name
   * @returns {Promise<Object>} UN Sanctions screening result
   */
  async checkUNSanctionsList(customerName: string) {
    return checkUNSanctionsList(customerName);
  }

  /**
   * Check UAE FIU PEP list (simulated)
   * @param {string} customerName - Customer name
   * @param {string} nationality - Customer nationality
   * @returns {Promise<Object>} UAE FIU PEP screening result
   */
  async checkUAEFIUPEPList(customerName: string, nationality: string) {
    return checkUAEFIUPEPList(customerName, nationality);
  }

  /**
   * Check DFSA enforcement list (simulated)
   * @param {string} customerName - Customer name
   * @returns {Promise<Object>} DFSA screening result
   */
  async checkDFSAList(customerName: string) {
    return checkDFSAList(customerName);
  }

  /**
   * Check EU consolidated sanctions list (simulated)
   * @param {string} customerName - Customer name
   * @returns {Promise<Object>} EU screening result
   */
  async checkEUList(customerName: string) {
    return checkEUList(customerName);
  }
}

const customerDueDiligenceService = new CustomerDueDiligenceService();

module.exports = customerDueDiligenceService;
module.exports.CustomerDueDiligenceService = CustomerDueDiligenceService;
module.exports.default = customerDueDiligenceService;
module.exports.HIGH_RISK_JURISDICTIONS = HIGH_RISK_JURISDICTIONS;
module.exports.isHighRiskJurisdiction = isHighRiskJurisdiction;
module.exports.getRiskFactors = getRiskFactors;
module.exports.assessRiskLevel = assessRiskLevel;
module.exports.checkOFACList = checkOFACList;
module.exports.checkUNSanctionsList = checkUNSanctionsList;
module.exports.checkUAEFIUPEPList = checkUAEFIUPEPList;
module.exports.checkDFSAList = checkDFSAList;
module.exports.checkEUList = checkEUList;
module.exports.performPEPScreening = performPEPScreening;
module.exports.performEnhancedDueDiligence = performEnhancedDueDiligence;
module.exports.approveCDD = approveCDD;
module.exports.rejectCDD = rejectCDD;
module.exports.getCDDRecord = getCDDRecord;
module.exports.getCDDAuditTrail = getCDDAuditTrail;
module.exports.searchCDDRecords = searchCDDRecords;
module.exports.createCDDRecord = createCDDRecord;
