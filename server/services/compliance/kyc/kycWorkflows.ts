// @ts-nocheck
import KYCProfile from '../../../models/compliance/KYCProfile.js';
import AMLAlert from '../../../models/compliance/AMLAlert.js';
import ComplianceAudit from '../../../models/compliance/ComplianceAudit.js';
import encryptionService from '../../security/encryptionService.js';
import { KYCPolicyEngine } from './kycPolicies.js';

const KYCService = {
  ...Object.getOwnPropertyNames(KYCPolicyEngine).reduce((acc, k) => { if (typeof KYCPolicyEngine[k] === 'function') acc[k] = KYCPolicyEngine[k]; return acc; }, {})
};

export const kycWorkflowMethods = {
  async createKYCProfile(data, actor) {
    const customerId = `KYC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const factors = {
      customerType: data.customerType,
      nationality: data.personalInfo?.nationality,
      transactionValue: data.transactionProfile?.expectedTransactionValue || 0,
      transactionType: data.transactionProfile?.primaryPurpose,
      sourceOfFunds: data.employmentInfo?.incomeSource,
      occupation: data.employmentInfo?.occupation
    };
    
    const riskResult = this.calculateRiskScore(factors);
    
    const pepResult = await this.screenForPEP(
      data.personalInfo?.fullNameEn,
      data.personalInfo?.nationality,
      data.employmentInfo?.occupation
    );
    
    const sanctionsResult = await this.checkSanctions(
      data.personalInfo?.fullNameEn,
      data.personalInfo?.nationality,
      data.personalInfo?.emiratesIdNumber
    );
    
    if (pepResult.isPEP) {
      riskResult.totalScore = Math.min(riskResult.totalScore + 30, 100);
      riskResult.category = this.getRiskCategory(riskResult.totalScore);
      riskResult.breakdown.pep = { value: true, score: 30 };
    }
    
    const reviewDate = new Date();
    const reviewPeriods = { LOW: 365, MEDIUM: 180, HIGH: 90, PROHIBITED: 0 };
    reviewDate.setDate(reviewDate.getDate() + (reviewPeriods[riskResult.category] || 365));
    
    const profile = new KYCProfile({
      customerId,
      ...data,
      riskAssessment: {
        assessedAt: new Date(),
        assessedBy: actor?.username || 'system',
        score: riskResult.totalScore,
        category: riskResult.category,
        factors: riskResult.breakdown,
        nextReviewDate: reviewDate
      },
      pepScreening: pepResult,
      sanctionsCheck: sanctionsResult,
      kycStatus: sanctionsResult.hasMatch ? 'under_review' : (riskResult.category === 'PROHIBITED' ? 'edd_required' : 'pending'),
      dueDiligenceLevel: riskResult.category === 'HIGH' || riskResult.category === 'PROHIBITED' ? 'EDD' : 'CDD',
      nextReviewDate: reviewDate,
      verificationWorkflow: {
        currentStep: 'document_collection',
        completedSteps: [],
        stepHistory: [{
          step: 'profile_creation',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          processedBy: actor?.username || 'system',
          notes: 'KYC profile created with initial risk assessment'
        }]
      }
    });
    
    await profile.save();
    
    await ComplianceAudit.logAction({
      entityType: 'kyc_profile',
      entityId: customerId,
      action: 'create',
      actor,
      details: {
        description: 'New KYC profile created',
        riskCategory: riskResult.category,
        riskScore: riskResult.totalScore
      },
      customerInfo: {
        customerId,
        customerName: data.personalInfo?.fullNameEn,
        emiratesId: data.personalInfo?.emiratesIdNumber,
        riskCategory: riskResult.category
      }
    });
    
    if (sanctionsResult.hasMatch) {
      await this.createAMLAlert({
        kycProfileId: profile._id,
        customerId,
        alertType: 'sanctions_match',
        alertCategory: 'sanctions_hit',
        severity: 'CRITICAL',
        title: `Sanctions Match Detected - ${data.personalInfo?.fullNameEn}`,
        description: `Customer nationality (${data.personalInfo?.nationality}) matches FATF blacklist country. Immediate review required.`,
        triggerDetails: {
          triggerSource: 'sanctions_screening',
          triggerData: sanctionsResult
        },
        customerSnapshot: {
          name: data.personalInfo?.fullNameEn,
          emiratesId: data.personalInfo?.emiratesIdNumber,
          nationality: data.personalInfo?.nationality,
          riskCategory: riskResult.category
        }
      }, actor);
    }
    
    return profile;
  },
  
  async updateKYCProfile(customerId, updates, actor) {
    const profile = await KYCProfile.findOne({ customerId });
    if (!profile) throw new Error('KYC profile not found');
    
    const previousValues = {};
    const changedFields = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (JSON.stringify(profile[key]) !== JSON.stringify(value)) {
        previousValues[key] = profile[key];
        changedFields.push(key);
        profile[key] = value;
      }
    }
    
    if (changedFields.some(f => ['customerType', 'personalInfo', 'employmentInfo', 'transactionProfile'].includes(f))) {
      const factors = {
        customerType: profile.customerType,
        nationality: profile.personalInfo?.nationality,
        transactionValue: profile.transactionProfile?.expectedTransactionValue || 0,
        transactionType: profile.transactionProfile?.primaryPurpose,
        sourceOfFunds: profile.employmentInfo?.incomeSource,
        occupation: profile.employmentInfo?.occupation,
        isPEP: profile.pepScreening?.isPEP
      };
      
      const riskResult = this.calculateRiskScore(factors);
      
      if (profile.riskAssessment) {
        profile.riskHistory.push({ ...profile.riskAssessment.toObject() });
      }
      
      profile.riskAssessment = {
        assessedAt: new Date(),
        assessedBy: actor?.username || 'system',
        score: riskResult.totalScore,
        category: riskResult.category,
        factors: riskResult.breakdown,
        notes: 'Risk reassessed due to profile update'
      };
      
      profile.dueDiligenceLevel = riskResult.category === 'HIGH' || riskResult.category === 'PROHIBITED' ? 'EDD' : 'CDD';
    }
    
    profile.lastActivityAt = new Date();
    await profile.save();
    
    await ComplianceAudit.logAction({
      entityType: 'kyc_profile',
      entityId: customerId,
      action: 'update',
      actor,
      details: {
        description: 'KYC profile updated',
        previousValue: previousValues,
        newValue: updates,
        changedFields
      },
      customerInfo: {
        customerId,
        customerName: profile.personalInfo?.fullNameEn,
        emiratesId: profile.personalInfo?.emiratesIdNumber,
        riskCategory: profile.riskAssessment?.category
      }
    });
    
    return profile;
  },
  
  async verifyDocument(customerId, documentType, verificationData, actor) {
    const profile = await KYCProfile.findOne({ customerId });
    if (!profile) throw new Error('KYC profile not found');
    
    const docIndex = profile.documents.findIndex(d => d.type === documentType);
    if (docIndex === -1) throw new Error('Document not found');
    
    profile.documents[docIndex].status = verificationData.approved ? 'verified' : 'rejected';
    profile.documents[docIndex].verifiedAt = new Date();
    profile.documents[docIndex].verifiedBy = actor?.username || 'system';
    profile.documents[docIndex].ocrData = verificationData.ocrData;
    profile.documents[docIndex].ocrConfidence = verificationData.confidence;
    
    if (!verificationData.approved) {
      profile.documents[docIndex].rejectionReason = verificationData.rejectionReason;
    }
    
    const allVerified = profile.documents.every(d => d.status === 'verified');
    if (allVerified) {
      profile.verificationWorkflow.currentStep = 'identity_verification';
      profile.verificationWorkflow.completedSteps.push('document_verification');
    }
    
    profile.lastActivityAt = new Date();
    await profile.save();
    
    await ComplianceAudit.logAction({
      entityType: 'document',
      entityId: `${customerId}/${documentType}`,
      action: 'document_verify',
      actor,
      details: {
        description: `Document ${verificationData.approved ? 'verified' : 'rejected'}: ${documentType}`,
        newValue: verificationData
      },
      customerInfo: {
        customerId,
        customerName: profile.personalInfo?.fullNameEn,
        riskCategory: profile.riskAssessment?.category
      }
    });
    
    return profile;
  }
  
};
