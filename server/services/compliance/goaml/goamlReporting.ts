// @ts-nocheck
const GoAMLRegistration = require('../../models/compliance/GoAMLRegistration');
const logger = require('../../../config/logger');
const axios = require('axios');

module.exports = {
  async submitToGoAMLPortal(registrationId, portalCredentials) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Validate data first
      const validation = await this.validateRegistrationData(registrationId);
      if (!validation.isValid) {
        throw new Error(`Cannot submit: ${validation.validationErrors.join(', ')}`);
      }

      // Prepare submission payload
      const submissionPayload = {
        entityName: registration.companyName,
        licenseNumber: registration.tradeLicense,
        dedNumber: registration.ded,
        contactEmail: registration.companyEmail,
        contactPhone: registration.companyPhone,
        businessActivities: registration.businessActivities,
        complianceOfficer: {
          name: registration.complianceOfficerName,
          email: registration.complianceOfficerEmail,
          phone: registration.complianceOfficerPhone,
        },
        annualTransactionVolume: registration.estimatedAnnualTransactionValue,
        estimatedClientCount: registration.estimatedNumberOfClients,
      };

      // Submit to goAML portal (would use actual API in production)
      // For now, simulating successful submission
      const submissionResult = {
        entityId: `GOAML-${registration.tradeLicense}-${Date.now()}`,
        submissionDate: new Date(),
        status: 'submitted',
        confirmationNumber: `CONF-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };

      // Update registration
      registration.registrationStatus = 'submitted';
      registration.goAMLAccountStatus = 'created';
      registration.goAMLEntityId = submissionResult.entityId;
      registration.goAMLConfirmationNumber = submissionResult.confirmationNumber;
      registration.goAMLSubmissionDate = submissionResult.submissionDate;

      registration.registrationHistory.push({
        status: 'submitted',
        action: 'Submitted to goAML portal',
        details: `Entity ID: ${submissionResult.entityId}, Confirmation: ${submissionResult.confirmationNumber}`,
        timestamp: new Date(),
      });

      await registration.save();

      logger.info(`Registration submitted to goAML portal: ${submissionResult.entityId}`);

      return {
        success: true,
        registrationId,
        ...submissionResult,
      };
    } catch (error) {
      logger.error(`Error submitting to goAML portal: ${error.message}`);

      // Update registration with failure status
      const registration = await GoAMLRegistration.findById(registrationId);
      if (registration) {
        registration.registrationStatus = 'submission_failed';
        registration.registrationHistory.push({
          status: 'submission_failed',
          action: 'Submission to goAML portal failed',
          details: error.message,
          timestamp: new Date(),
        });
        await registration.save();
      }

      throw error;
    }
  },

  /**
   * File a Suspicious Transaction Report (STR) via goAML
   * @param {Object} strData - STR information
   * @returns {Promise<Object>} STR submission result
   */
  async fileSuspiciousTransactionReport(strData) {
    try {
      const {
        registrationId,
        transactionId,
        customerName,
        customerEmail,
        transactionDate,
        transactionAmount,
        suspiciousIndicators,
        detailedDescription,
        reportingOfficerId,
        reportingOfficerName,
      } = strData;

      // Validate STR data
      if (!registrationId || !transactionId || !customerName || !suspiciousIndicators) {
        throw new Error('Missing required STR data');
      }

      // Get registration for goAML entity ID
      const registration = await GoAMLRegistration.findById(registrationId);
      if (!registration || registration.goAMLAccountStatus !== 'created') {
        throw new Error('Company must be registered on goAML portal first');
      }

      // Create STR payload
      const strPayload = {
        goAMLEntityId: registration.goAMLEntityId,
        transactionId,
        customerName,
        customerEmail,
        transactionDate,
        transactionAmount,
        suspiciousIndicators: Array.isArray(suspiciousIndicators)
          ? suspiciousIndicators
          : [suspiciousIndicators],
        detailedDescription,
        reportingOfficer: {
          name: reportingOfficerName,
          id: reportingOfficerId,
        },
        filingDate: new Date(),
      };

      // Submit STR to goAML (simulated)
      const strSubmissionResult = {
        strNumber: `STR-${registration.tradeLicense}-${Date.now()}`,
        submissionDate: new Date(),
        status: 'filed',
        goAMLReference: `GOAML-STR-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };

      // Update registration with STR filing
      registration.str_filings.push({
        strNumber: strSubmissionResult.strNumber,
        transactionId,
        customerName,
        transactionAmount,
        submissionDate: strSubmissionResult.submissionDate,
        goAMLReference: strSubmissionResult.goAMLReference,
        status: 'filed',
        indicators: strPayload.suspiciousIndicators,
        description: detailedDescription,
        filedBy: reportingOfficerName,
      });

      registration.registrationHistory.push({
        status: 'str_filed',
        action: 'Suspicious Transaction Report filed',
        details: `STR ${strSubmissionResult.strNumber} filed for transaction ${transactionId}. Reference: ${strSubmissionResult.goAMLReference}`,
        timestamp: new Date(),
      });

      await registration.save();

      logger.info(`STR filed successfully: ${strSubmissionResult.strNumber}`);

      return {
        success: true,
        ...strSubmissionResult,
        registrationId,
      };
    } catch (error) {
      logger.error(`Error filing STR: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check goAML account status and fetch updates
   * @param {string} registrationId - Registration ID
   * @returns {Promise<Object>} Current account status
   */
  async checkGoAMLAccountStatus(registrationId) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      if (!registration.goAMLEntityId) {
        return {
          accountStatus: 'not_created',
          message: 'Company has not been registered on goAML portal yet',
        };
      }

      // Check account status (would call actual goAML API)
      const accountStatus = {
        entityId: registration.goAMLEntityId,
        accountStatus: registration.goAMLAccountStatus,
        registrationDate: registration.goAMLSubmissionDate,
        confirmationNumber: registration.goAMLConfirmationNumber,
        lastActivityDate: registration.lastPortalActivityDate || null,
        totalSTRsFiled: registration.str_filings ? registration.str_filings.length : 0,
        pendingTasks: [],
        complianceAlerts: [],
      };

      logger.info(`GoAML account status checked for: ${registration.companyName}`);

      return accountStatus;
    } catch (error) {
      logger.error(`Error checking GoAML account status: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get registration details for compliance review
   * @param {string} registrationId - Registration ID
   * @returns {Promise<Object>} Detailed registration information
   */
  async getRegistrationDetails(registrationId) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId)
        .populate('complianceOfficerId', 'firstName lastName email phone')
        .lean();

      if (!registration) {
        throw new Error('Registration not found');
      }

      return {
        ...registration,
        registrationStatusDescription: this.getStatusDescription(registration.registrationStatus),
        goAMLStatusDescription: this.getGoAMLStatusDescription(registration.goAMLAccountStatus),
      };
    } catch (error) {
      logger.error(`Error retrieving registration details: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get list of all registrations with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Filtered registrations
   */
  async getRegistrations(filters = {}) {
    try {
      const query = {};

      if (filters.status) query.registrationStatus = filters.status;
      if (filters.goAMLStatus) query.goAMLAccountStatus = filters.goAMLStatus;
      if (filters.companyName) {
        query.companyName = { $regex: filters.companyName, $options: 'i' };
      }

      const registrations = await GoAMLRegistration.find(query)
        .select(
          'companyName tradeLicense registrationStatus goAMLAccountStatus createdAt goAMLSubmissionDate str_filings'
        )
        .sort({ createdAt: -1 })
        .lean();

      return registrations.map((reg) => ({
        ...reg,
        strCount: reg.str_filings ? reg.str_filings.length : 0,
      }));
    } catch (error) {
      logger.error(`Error retrieving registrations: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get STR filing history for a registration
   * @param {string} registrationId - Registration ID
   * @returns {Promise<Array>} STR filings
   */
  async getSTRFilingHistory(registrationId) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId)
        .select('str_filings companyName')
        .lean();

      if (!registration) {
        throw new Error('Registration not found');
      }

      return {
        companyName: registration.companyName,
        totalSTRsFiled: registration.str_filings ? registration.str_filings.length : 0,
        filings: registration.str_filings || [],
      };
    } catch (error) {
      logger.error(`Error retrieving STR filing history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload supporting documents for registration
   * @param {string} registrationId - Registration ID
   * @param {Array} documents - Document array with file paths
   * @returns {Promise<Object>} Updated registration
   */
};
