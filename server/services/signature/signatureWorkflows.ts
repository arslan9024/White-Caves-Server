// @ts-nocheck
import ContractSignature from '../../models/ContractSignature.js';
import SignatureToken from '../../models/SignatureToken.js';
import SignatureAudit from '../../models/SignatureAudit.js';
import Contract from '../../models/Contract.js';
import crypto from 'crypto';

export const signatureWorkflows = {
  async createSignatureRequest(signatureData) {
    try {
      const {
        contractId,
        signerEmail,
        signerRole,
        signerName,
        signerPhone,
        signatureType = 'digital',
      } = signatureData;

      // Check if signature already exists
      const existingSignature = await ContractSignature.findOne({
        contractId,
        'signedBy.email': signerEmail,
      });

      if (existingSignature && existingSignature.status === 'signed') {
        throw new Error('This contract has already been signed by this user');
      }

      // Generate token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create signature record
      const signature = new ContractSignature({
        contractId,
        signedBy: {
          email: signerEmail,
          name: signerName,
          phone: signerPhone,
          role: signerRole,
        },
        token,
        expiresAt,
        signatureType,
        status: 'pending',
      });

      await signature.save();

      // Create audit log
      await this.createAuditLog(contractId, signerEmail, 'request_created', {
        signatureId: signature._id,
        expiresAt,
      });

      return {
        signatureId: signature._id,
        token,
        signingLink: `/contracts/sign/${contractId}/${token}`,
        expiresAt,
      };
    } catch (error) {
      throw new Error(`Failed to create signature request: ${error.message}`);
    }
  }

  /**
   * Verify signature token is valid
   * @param {String} contractId - Contract ID
   * @param {String} token - Signature token
   * @returns {Promise<Object>} Token data if valid
   */
  async verifySignatureToken(contractId, token) {
    try {
      const signature = await ContractSignature.findOne({
        contractId,
        token,
      });

      if (!signature) {
        throw new Error('Invalid signature token');
      }

      if (signature.status === 'expired') {
        throw new Error('Signature request has expired');
      }

      if (signature.status === 'signed') {
        throw new Error('Contract has already been signed by this party');
      }

      if (new Date() > signature.expiresAt) {
        signature.status = 'expired';
        await signature.save();
        throw new Error('Signature request has expired');
      }

      // Check rate limiting (max 10 signature page views per hour)
      const recentViews = signature.pageViews || [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = recentViews.filter(view => new Date(view) > oneHourAgo).length;

      if (recentCount > 10) {
        throw new Error('Too many signature requests. Please try again later.');
      }

      // Update page views
      signature.pageViews = [...recentViews, new Date()];
      await signature.save();

      return {
        signatureId: signature._id,
        contractId,
        signerEmail: signature.signedBy.email,
        signerName: signature.signedBy.name,
        signerRole: signature.signedBy.role,
        expiresAt: signature.expiresAt,
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Save signature data
   * @param {String} signatureId - Signature ID
   * @param {Object} signatureData - Signature image and metadata
   * @returns {Promise<Object>} Saved signature
   */
  async saveSignature(signatureId, signatureData) {
    try {
      const signature = await ContractSignature.findById(signatureId);
      if (!signature) {
        throw new Error('Signature request not found');
      }

      if (signature.status !== 'pending') {
        throw new Error(`Cannot sign: status is ${signature.status}`);
      }

      if (new Date() > signature.expiresAt) {
        signature.status = 'expired';
        await signature.save();
        throw new Error('Signature request has expired');
      }

      // Calculate hash
      const hash = crypto.createHash('sha256').update(signatureData.imageData).digest('hex');

      // Extract device info
      const userAgent = signatureData.deviceInfo?.userAgent || 'Unknown';
      const platform = this.detectPlatform(userAgent);
      const browser = this.detectBrowser(userAgent);

      // Update signature
      signature.signatureData = {
        imageData: signatureData.imageData,
        mimeType: signatureData.mimeType || 'image/png',
        hash,
        coordinates: signatureData.coordinates || null,
      };
      signature.deviceInfo = {
        ipAddress: signatureData.deviceInfo?.ipAddress,
        userAgent,
        platform,
        browser,
        timestamp: new Date(),
      };
      signature.method = signatureData.method || 'canvas';
      signature.status = 'signed';
      signature.signedAt = new Date();

      await signature.save();

      // Create audit log
      await this.createAuditLog(signature.contractId, signature.signedBy.email, 'signed', {
        signatureId,
        method: signature.method,
        platform,
        browser,
      });

      // Check if all signatures collected
      await this.checkContractSignatureCompletion(signature.contractId);

      return signature;
    } catch (error) {
      throw new Error(`Failed to save signature: ${error.message}`);
    }
  }

  /**
   * Check if all required signatures are collected
   * @param {String} contractId - Contract ID
   * @returns {Promise<boolean>} True if all signatures collected
   */
  async checkContractSignatureCompletion(contractId) {
    try {
      const contract = await Contract.findById(contractId);
      if (!contract) throw new Error('Contract not found');

      const signatures = await ContractSignature.find({
        contractId,
        status: 'signed',
      });

      // Check if all required signers have signed
      const requiredRoles = contract.requiredSignatures || ['tenant', 'landlord'];
      const signedRoles = signatures.map(s => s.signedBy.role);

      const allSigned = requiredRoles.every(role => signedRoles.includes(role));

      if (allSigned) {
        contract.signatureStatus = 'complete';
        contract.fullySignedAt = new Date();
        contract.status = 'executed';
        await contract.save();

        // Create audit log
        await this.createAuditLog(contractId, 'system', 'all_signatures_complete', {
          signedAt: new Date(),
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking signature completion:', error);
      return false;
    }
  }

  /**
   * Create audit log entry
   * @param {String} contractId - Contract ID
   * @param {String} actor - Who performed the action
   * @param {String} action - Action performed
   * @param {Object} details - Additional details
   * @returns {Promise<Object>} Created audit log
   */
  async createAuditLog(contractId, actor, action, details = {}) {
    try {
      const auditLog = new SignatureAudit({
        contractId,
        actor,
        action,
        details,
        timestamp: new Date(),
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw to prevent blocking the main operation
    }
  }

  /**
   * Get contract audit trail
   * @param {String} contractId - Contract ID
   * @returns {Promise<Array>} Audit log entries
   */
  async getAuditTrail(contractId) {
    try {
      const auditLogs = await SignatureAudit.find({ contractId }).sort({ timestamp: -1 }).lean();

      return auditLogs;
    } catch (error) {
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }
  }

  /**
   * Send signing notification
   * @param {String} signatureId - Signature ID
   * @param {String} signingLink - Link to signing page
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendSigningNotification(signatureId, signingLink) {
    try {
      const signature = await ContractSignature.findById(signatureId).populate('contractId');
      if (!signature) {
        throw new Error('Signature not found');
      }

      const { sendEmailTracked, wrapInBrandedTemplate } = await import('./emailService.js');
      const contractLabel = signature.contractId.contractNumber || signature.contractId._id;
      const html = wrapInBrandedTemplate(
        `
          <h2>Signature Request Ready</h2>
          <p>Dear ${signature.signedBy.name || 'Valued Client'}, your signature is requested for contract <strong>${contractLabel}</strong>.</p>
          <p>Open the secure signing link below to review and sign the document.</p>
          <p><a class="cta" href="${signingLink}">Review & Sign Contract</a></p>
          <p>This link expires on: ${signature.expiresAt.toLocaleString()}</p>
        `,
        { preheader: 'Your White Caves contract signature request is ready' }
      );

      await sendEmailTracked({
        to: signature.signedBy.email,
        subject: `Signature Request: Contract ${contractLabel}`,
        html,
        text: `Dear ${signature.signedBy.name || 'Valued Client'}, please review and sign contract ${contractLabel}: ${signingLink}`,
        tags: [
          { name: 'type', value: 'contract_signature_request' },
          { name: 'contractId', value: String(signature.contractId._id) },
        ],
      });

      // Create audit log
      await this.createAuditLog(signature.contractId._id, 'system', 'notification_sent', {
        email: signature.signedBy.email,
      });

      return true;
    } catch (error) {
      console.error('Failed to send signing notification:', error);
      return false;
    }
  }

  /**
   * Resend signing request
   * @param {String} signatureId - Signature ID
   * @returns {Promise<Object>} Updated signature request
   */
};
