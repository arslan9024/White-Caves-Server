// @ts-nocheck
import ContractSignature from '../../models/ContractSignature.js';
import SignatureToken from '../../models/SignatureToken.js';
import SignatureAudit from '../../models/SignatureAudit.js';
import Contract from '../../models/Contract.js';

export const signatureHelpers = {
  async resendSigningRequest(signatureId) {
    try {
      const signature = await ContractSignature.findById(signatureId);
      if (!signature) {
        throw new Error('Signature not found');
      }

      // Generate new token
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      signature.token = newToken;
      signature.expiresAt = newExpiresAt;
      signature.pageViews = [];
      await signature.save();

      // Create audit log
      await this.createAuditLog(signature.contractId, 'system', 'request_resent', {
        signatureId,
        expiresAt: newExpiresAt,
      });

      return {
        signatureId: signature._id,
        token: newToken,
        signingLink: `/contracts/sign/${signature.contractId}/${newToken}`,
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      throw new Error(`Failed to resend signing request: ${error.message}`);
    }
  },

  /**
   * Cancel signature request
   * @param {String} signatureId - Signature ID
   * @returns {Promise<Object>} Cancelled signature
   */
  async cancelSignatureRequest(signatureId) {
    try {
      const signature = await ContractSignature.findByIdAndUpdate(
        signatureId,
        { status: 'cancelled', cancelledAt: new Date() },
        { new: true }
      );

      if (!signature) {
        throw new Error('Signature not found');
      }

      // Create audit log
      await this.createAuditLog(signature.contractId, 'system', 'request_cancelled', {
        signatureId,
      });

      return signature;
    } catch (error) {
      throw new Error(`Failed to cancel signature request: ${error.message}`);
    }
  },

  /**
   * Get signature statistics for a contract
   * @param {String} contractId - Contract ID
   * @returns {Promise<Object>} Signature statistics
   */
  async getSignatureStats(contractId) {
    try {
      const signatures = await ContractSignature.find({ contractId });
      const auditLogs = await SignatureAudit.find({ contractId }).sort({
        timestamp: -1,
      });

      const stats = {
        contractId,
        totalSignatures: signatures.length,
        signed: signatures.filter(s => s.status === 'signed').length,
        pending: signatures.filter(s => s.status === 'pending').length,
        expired: signatures.filter(s => s.status === 'expired').length,
        cancelled: signatures.filter(s => s.status === 'cancelled').length,
        averageSigningTime: this.calculateAverageSigningTime(signatures),
        lastActivity: auditLogs[0]?.timestamp || null,
        auditLogCount: auditLogs.length,
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get signature stats: ${error.message}`);
    }
  },

  /**
   * Calculate average time to sign
   * @param {Array} signatures - Signature records
   * @returns {String} Human-readable average signing time
   */
  calculateAverageSigningTime(signatures) {
    const signedSignatures = signatures.filter(s => s.status === 'signed');
    if (signedSignatures.length === 0) return 'N/A';

    const totalTime = signedSignatures.reduce((sum, sig) => {
      const created = new Date(sig.createdAt);
      const signed = new Date(sig.signedAt);
      return sum + (signed - created);
    }, 0);

    const avgMs = totalTime / signedSignatures.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  /**
   * Batch create signature requests
   * @param {String} contractId - Contract ID
   * @param {Array} signerList - List of signers
   * @returns {Promise<Array>} Created signature requests
   */
  async createBatchSignatureRequests(contractId, signerList) {
    try {
      const requests = [];

      for (const signer of signerList) {
        const request = await this.createSignatureRequest({
          contractId,
          signerEmail: signer.email,
          signerRole: signer.role,
          signerName: signer.name,
          signerPhone: signer.phone,
        });
        requests.push(request);
      }

      // Create audit log
      await this.createAuditLog(contractId, 'system', 'batch_requests_created', {
        count: requests.length,
      });

      return requests;
    } catch (error) {
      throw new Error(`Failed to create batch signature requests: ${error.message}`);
    }
  },
};
