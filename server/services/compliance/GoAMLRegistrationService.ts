// @ts-nocheck
/**
 * GoAMLRegistrationService.js
 * Manages company registration and reporting on UAE FIU's goAML portal
 * Handles entity registration, suspicious transaction reports, and portal communications
 */

const GoAMLRegistration = require('../models/compliance/GoAMLRegistration');
const ComplianceOfficerDesignation = require('../models/compliance/ComplianceOfficerDesignation');
const logger = require('../../config/logger');
const axios = require('axios');

class GoAMLRegistrationService {
  /**
   * Initialize company registration data for goAML portal
   * @param {Object} companyData - Company information
   * @returns {Promise<Object>} GoAML registration record
   */
  async initializeCompanyRegistration(companyData) {
    try {
      const {
        companyName,
        tradeLicense,
        ded,
        companyAddress,
        companyPhone,
        companyEmail,
        complianceOfficerId,
        businessActivities,
        estimatedAnnualTransactionValue,
        estimatedNumberOfClients,
      } = companyData;

      // Validate required fields
      if (!companyName || !tradeLicense || !ded || !complianceOfficerId) {
        throw new Error('Missing required company data for goAML registration');
      }

      // Check if registration already exists
      const existingRegistration = await GoAMLRegistration.findOne({
        tradeLicense,
      });

      if (existingRegistration) {
        throw new Error(`Registration already exists for trade license ${tradeLicense}`);
      }

      // Get compliance officer details
      const complianceOfficer = await ComplianceOfficerDesignation.findById(complianceOfficerId);
      if (!complianceOfficer) {
        throw new Error('Compliance officer not found');
      }

      // Create registration record
      const registration = new GoAMLRegistration({
        companyName,
        tradeLicense,
        ded,
        companyAddress,
        companyPhone,
        companyEmail,
        complianceOfficerId,
        complianceOfficerName: complianceOfficer.firstName + ' ' + complianceOfficer.lastName,
        complianceOfficerEmail: complianceOfficer.email,
        businessActivities: businessActivities || ['Real Estate Services'],
        estimatedAnnualTransactionValue: estimatedAnnualTransactionValue || 0,
        estimatedNumberOfClients: estimatedNumberOfClients || 0,
        registrationStatus: 'draft',
        goAMLAccountStatus: 'not_created',
        createdBy: complianceOfficerId,
        registrationHistory: [
          {
            status: 'draft',
            action: 'Registration initialized',
            details: `Initial registration record created for ${companyName}`,
            timestamp: new Date(),
          },
        ],
      });

      await registration.save();

      logger.info(`GoAML registration initialized for company: ${companyName} (Trade License: ${tradeLicense})`);

      return registration;
    } catch (error) {
      logger.error(`Error initializing GoAML registration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare and validate company data for goAML portal submission
   * @param {string} registrationId - Registration ID
   * @returns {Promise<Object>} Validation result
   */
  async validateRegistrationData(registrationId) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      const validationErrors = [];
      const validationWarnings = [];

      // Validate company information
      if (!registration.companyName || registration.companyName.trim().length === 0) {
        validationErrors.push('Company name is required');
      }

      if (!registration.tradeLicense || registration.tradeLicense.trim().length === 0) {
        validationErrors.push('Trade license number is required');
      }

      if (!registration.ded || registration.ded.trim().length === 0) {
        validationErrors.push('DED registration number is required');
      }

      if (!registration.companyEmail || !this.isValidEmail(registration.companyEmail)) {
        validationErrors.push('Valid company email is required');
      }

      if (!registration.complianceOfficerId) {
        validationErrors.push('Compliance officer must be designated');
      }

      if (!registration.businessActivities || registration.businessActivities.length === 0) {
        validationErrors.push('At least one business activity must be selected');
      }

      // Validate documents
      if (!registration.documents || registration.documents.length === 0) {
        validationWarnings.push('Supporting documents should be uploaded');
      }

      // Validate registration fee payment
      if (!registration.registrationFeePayment || registration.registrationFeePayment.length === 0) {
        validationWarnings.push('Registration fee payment record not found');
      }

      const isValid = validationErrors.length === 0;

      // Update registration status
      if (isValid) {
        registration.registrationStatus = 'ready_for_submission';
        registration.registrationHistory.push({
          status: 'ready_for_submission',
          action: 'Data validation passed',
          details: `All required information validated successfully${validationWarnings.length > 0 ? '. Warnings: ' + validationWarnings.join(', ') : ''}`,
          timestamp: new Date(),
        });
        await registration.save();
      }

      return {
        isValid,
        validationErrors,
        validationWarnings,
        registrationId,
      };
    } catch (error) {
      logger.error(`Error validating registration data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit registration to goAML portal (API integration)
   * @param {string} registrationId - Registration ID
   * @param {Object} portalCredentials - goAML portal credentials
   * @returns {Promise<Object>} Submission result
   */
}

const goamlReporting = require('./goaml/goamlReporting');
const goamlDocuments = require('./goaml/goamlDocuments');
Object.assign(GoAMLRegistrationService.prototype, goamlReporting, goamlDocuments);

module.exports = new GoAMLRegistrationService();
