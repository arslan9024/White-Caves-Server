// @ts-nocheck
const GoAMLRegistration = require('../../models/compliance/GoAMLRegistration');
const logger = require('../../../config/logger');

module.exports = {
  async uploadSupportingDocuments(registrationId, documents) {
    try {
      const registration = await GoAMLRegistration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Add documents
      if (!registration.documents) {
        registration.documents = [];
      }

      documents.forEach((doc) => {
        registration.documents.push({
          documentType: doc.documentType,
          documentName: doc.documentName,
          filePath: doc.filePath,
          uploadDate: new Date(),
          uploadedBy: doc.uploadedBy,
        });
      });

      registration.registrationHistory.push({
        status: 'documents_uploaded',
        action: 'Supporting documents uploaded',
        details: `Uploaded ${documents.length} document(s)`,
        timestamp: new Date(),
      });

      await registration.save();

      logger.info(`${documents.length} documents uploaded to registration ${registrationId}`);

      return registration;
    } catch (error) {
      logger.error(`Error uploading documents: ${error.message}`);
      throw error;
    }
  },

  /**
   * Helper function to validate email format
   * @param {string} email - Email address
   * @returns {boolean} Valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Get human-readable status description
   * @param {string} status - Status code
   * @returns {string} Status description
   */
  getStatusDescription(status) {
    const descriptions = {
      draft: 'Draft - Being prepared for submission',
      ready_for_submission: 'Ready for Submission - All required data validated',
      submitted: 'Submitted - Awaiting confirmation from goAML',
      approved: 'Approved - Registration confirmed on goAML',
      submission_failed: 'Submission Failed - Please review and resubmit',
      rejected: 'Rejected - Requires corrections and resubmission',
    };
    return descriptions[status] || 'Unknown Status';
  },

  /**
   * Get human-readable goAML status description
   * @param {string} status - Status code
   * @returns {string} Status description
   */
  getGoAMLStatusDescription(status) {
    const descriptions = {
      not_created: 'Not Created - Company has not been registered',
      created: 'Created - Company is registered and can file reports',
      inactive: 'Inactive - Account needs reactivation',
      suspended: 'Suspended - Contact FIU for details',
    };
    return descriptions[status] || 'Unknown Status';
  },
};
