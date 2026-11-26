// @ts-nocheck
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import TenancyContract from '../models/TenancyContract.js';
import {
  validateTenancyContractData,
  createTenancyPdfFromScratch,
  fillEjariTemplate,
  uploadTenancyPdfToFirebase,
} from './tenancy/tenancyContractPdf.js';
import {
  getSignatureEmailTemplate,
  sendSignatureRequestNotifications,
  notifyFullySignedContract,
} from './tenancy/tenancyContractNotifications.js';

class TenancyContractService {
  async createDraft(agentId, formData) {
    try {
      const contract = new TenancyContract({
        agentId,
        status: 'Draft',
        propertyInfo: formData.propertyInfo,
        landlordInfo: formData.landlordInfo,
        tenantInfo: formData.tenantInfo,
        contactDetails: formData.contactDetails,
        tenancyTerms: formData.tenancyTerms,
        createdBy: agentId,
      });

      await contract.save();
      await this._addAuditEntry(
        contract._id,
        'Draft Created',
        agentId,
        'Contract draft created via form',
        ''
      );

      return {
        success: true,
        contractId: contract._id,
        referenceNumber: contract.referenceNumber,
        message: 'Draft contract created successfully',
      };
    } catch (error) {
      throw new Error(`Error creating draft: ${error.message}`);
    }
  }

  async updateDraft(contractId, updatedData) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (!contract) throw new Error('Contract not found');
      if (contract.status !== 'Draft') {
        throw new Error('Only draft contracts can be updated');
      }

      if (updatedData.propertyInfo) contract.propertyInfo = updatedData.propertyInfo;
      if (updatedData.landlordInfo) contract.landlordInfo = updatedData.landlordInfo;
      if (updatedData.tenantInfo) contract.tenantInfo = updatedData.tenantInfo;
      if (updatedData.contactDetails) contract.contactDetails = updatedData.contactDetails;
      if (updatedData.tenancyTerms) contract.tenancyTerms = updatedData.tenancyTerms;

      await contract.save();
      return { success: true, message: 'Contract updated successfully' };
    } catch (error) {
      throw new Error(`Error updating draft: ${error.message}`);
    }
  }

  validateFormData(contract) {
    return validateTenancyContractData(contract);
  }

  async generatePDF(contractId, agentId) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (!contract) throw new Error('Contract not found');

      const validation = this.validateFormData(contract);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const templatePath = path.join(__dirname, '../templates/ejari-template.pdf');
      const pdfBuffer = !fs.existsSync(templatePath)
        ? await this._createPDFFromScratch(contract)
        : await this._fillEJARITemplate(templatePath, contract);

      const fileName = `tenancy-contracts/${contract.referenceNumber}-${Date.now()}.pdf`;
      const pdfUrl = await this._uploadPdfToFirebase(pdfBuffer, fileName);
      const documentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      contract.pdfDocument = {
        generatedAt: new Date(),
        pdfUrl,
        fileName,
        fileSize: pdfBuffer.length,
        documentHash,
      };
      contract.status = 'Generated';
      await contract.save();

      await this._addAuditEntry(
        contractId,
        'PDF Generated',
        agentId,
        'Contract PDF generated successfully',
        ''
      );

      return {
        success: true,
        pdfUrl,
        fileName,
        contractId: contract._id,
        referenceNumber: contract.referenceNumber,
      };
    } catch (error) {
      throw new Error(`Error generating PDF: ${error.message}`);
    }
  }

  async _createPDFFromScratch(contract) {
    return createTenancyPdfFromScratch(contract);
  }

  async _fillEJARITemplate(templatePath, contract) {
    return fillEjariTemplate(templatePath, contract);
  }

  async _uploadPdfToFirebase(pdfBuffer, fileName) {
    return uploadTenancyPdfToFirebase(pdfBuffer, fileName);
  }

  async requestSignatures(contractId, agentId) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (!contract) throw new Error('Contract not found');
      if (!contract.pdfDocument?.pdfUrl) {
        throw new Error('PDF must be generated before requesting signatures');
      }

      const landlordToken = crypto.randomBytes(32).toString('hex');
      const tenantToken = crypto.randomBytes(32).toString('hex');
      contract.signatures.landlordSignature.signatureToken = landlordToken;
      contract.signatures.tenantSignature.signatureToken = tenantToken;
      contract.status = 'AwaitingSignatures';
      await contract.save();

      const signatureBaseUrl = process.env.BASE_URL || 'http://localhost:5173';
      const landlordSignUrl = `${signatureBaseUrl}/tenancy-sign/${landlordToken}`;
      const tenantSignUrl = `${signatureBaseUrl}/tenancy-sign/${tenantToken}`;

      await sendSignatureRequestNotifications(contract, landlordSignUrl, tenantSignUrl);
      await this._addAuditEntry(
        contractId,
        'Signature Requests Sent',
        agentId,
        'Signature links sent to both parties',
        ''
      );

      return {
        success: true,
        message: 'Signature requests sent successfully',
        landlordSignUrl,
        tenantSignUrl,
      };
    } catch (error) {
      throw new Error(`Error requesting signatures: ${error.message}`);
    }
  }

  _getSignatureEmailTemplate(party, contract, signUrl) {
    return getSignatureEmailTemplate(party, contract, signUrl);
  }

  async recordSignature(token, signatureData, ipAddress, userAgent) {
    try {
      const contract = await TenancyContract.findOne({
        $or: [
          { 'signatures.landlordSignature.signatureToken': token },
          { 'signatures.tenantSignature.signatureToken': token },
        ],
      });
      if (!contract) throw new Error('Invalid signature token');

      const isLandlord = contract.signatures.landlordSignature.signatureToken === token;
      const targetSig = isLandlord
        ? contract.signatures.landlordSignature
        : contract.signatures.tenantSignature;

      if (targetSig.signed) {
        throw new Error(`${isLandlord ? 'Landlord' : 'Tenant'} has already signed this contract`);
      }

      targetSig.signed = true;
      targetSig.signedAt = new Date();
      targetSig.signatureData = signatureData;
      targetSig.ipAddress = ipAddress;
      targetSig.userAgent = userAgent;

      contract.status = contract.isFullySigned() ? 'FullySigned' : 'PartiallySignedSignatures';
      await contract.save();

      targetSig.signatureToken = null;
      await contract.save();

      if (contract.isFullySigned()) {
        await this._notifyFullySignedContract(contract);
      }

      return {
        success: true,
        message: `${isLandlord ? 'Landlord' : 'Tenant'} signature recorded successfully`,
        fullySignedStatus: contract.isFullySigned(),
      };
    } catch (error) {
      throw new Error(`Error recording signature: ${error.message}`);
    }
  }

  async getContractForSigning(token) {
    try {
      const contract = await TenancyContract.findOne({
        $or: [
          { 'signatures.landlordSignature.signatureToken': token },
          { 'signatures.tenantSignature.signatureToken': token },
        ],
      });
      if (!contract) throw new Error('Invalid or expired signature link');

      const isLandlord = contract.signatures.landlordSignature.signatureToken === token;
      return {
        contractId: contract._id,
        referenceNumber: contract.referenceNumber,
        pdfUrl: contract.pdfDocument?.pdfUrl,
        propertyDescription: contract.propertyInfo?.description,
        partyType: isLandlord ? 'Landlord' : 'Tenant',
        partyName: isLandlord ? contract.landlordInfo?.name : contract.tenantInfo?.name,
        leaseStart: contract.tenancyTerms?.leaseStartDate,
        leaseEnd: contract.tenancyTerms?.leaseEndDate,
        rentAmount: contract.tenancyTerms?.rentAmount,
      };
    } catch (error) {
      throw new Error(`Error retrieving contract: ${error.message}`);
    }
  }

  async getContractStatus(contractId) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (!contract) throw new Error('Contract not found');

      return {
        contractId: contract._id,
        referenceNumber: contract.referenceNumber,
        status: contract.status,
        signatureStatus: contract.getSignatureStatus(),
        pdfUrl: contract.pdfDocument?.pdfUrl,
        createdAt: contract.createdAt,
        generatedAt: contract.pdfDocument?.generatedAt,
        auditTrail: contract.auditTrail,
      };
    } catch (error) {
      throw new Error(`Error getting contract status: ${error.message}`);
    }
  }

  async _notifyFullySignedContract(contract) {
    return notifyFullySignedContract(contract);
  }

  async _addAuditEntry(contractId, action, performedBy, details, ipAddress) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (contract) {
        contract.addAuditEntry(action, performedBy, details, ipAddress);
        await contract.save();
      }
    } catch (error) {
      console.error('Error adding audit entry:', error);
    }
  }

  async downloadContract(contractId) {
    try {
      const contract = await TenancyContract.findById(contractId);
      if (!contract) throw new Error('Contract not found');
      return {
        pdfUrl: contract.pdfDocument?.pdfUrl,
        fileName: contract.pdfDocument?.fileName,
        referenceNumber: contract.referenceNumber,
      };
    } catch (error) {
      throw new Error(`Error downloading contract: ${error.message}`);
    }
  }

  async listContractsByAgent(agentId, filters = {}) {
    try {
      const query = { agentId };
      if (filters.status) query.status = filters.status;
      if (filters.propertyId) query['propertyInfo.propertyId'] = filters.propertyId;

      const contracts = await TenancyContract.find(query)
        .select(
          'referenceNumber status propertyInfo landlordInfo tenantInfo tenancyTerms createdAt updatedAt'
        )
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await TenancyContract.countDocuments(query);
      return {
        contracts,
        total,
        page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
      };
    } catch (error) {
      throw new Error(`Error listing contracts: ${error.message}`);
    }
  }
}

export default new TenancyContractService();
