// @ts-nocheck
import KYCProfile from '../../../models/compliance/KYCProfile.js';
import AMLAlert from '../../../models/compliance/AMLAlert.js';
import ComplianceAudit from '../../../models/compliance/ComplianceAudit.js';

export const kycQueryMethods = {
  async approveKYCProfile(customerId, approvalData, actor) {
    const profile = await KYCProfile.findOne({ customerId });
    if (!profile) throw new Error('KYC profile not found');
    
    const reviewPeriods = { LOW: 365, MEDIUM: 180, HIGH: 90, PROHIBITED: 0 };
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (reviewPeriods[profile.riskAssessment?.category] || 365));
    
    profile.kycStatus = 'approved';
    profile.approvalInfo = {
      approvedBy: actor?.username || 'system',
      approvedAt: new Date(),
      approvalLevel: approvalData.approvalLevel || 'standard',
      approvalNotes: approvalData.notes,
      expiryDate
    };
    profile.nextReviewDate = expiryDate;
    profile.verificationWorkflow.currentStep = 'onboarding_complete';
    profile.verificationWorkflow.completedSteps.push('compliance_approval', 'onboarding_complete');
    profile.lastActivityAt = new Date();
    
    await profile.save();
    
    await ComplianceAudit.logAction({
      entityType: 'kyc_profile',
      entityId: customerId,
      action: 'approve',
      actor,
      details: {
        description: 'KYC profile approved',
        newValue: profile.approvalInfo
      },
      customerInfo: {
        customerId,
        customerName: profile.personalInfo?.fullNameEn,
        emiratesId: profile.personalInfo?.emiratesIdNumber,
        riskCategory: profile.riskAssessment?.category
      }
    });
    
    return profile;
  }
  
  async rejectKYCProfile(customerId, rejectionData, actor) {
    const profile = await KYCProfile.findOne({ customerId });
    if (!profile) throw new Error('KYC profile not found');
    
    profile.kycStatus = 'rejected';
    profile.rejectionInfo = {
      rejectedBy: actor?.username || 'system',
      rejectedAt: new Date(),
      rejectionReason: rejectionData.reason,
      rejectionDetails: rejectionData.details
    };
    profile.lastActivityAt = new Date();
    
    await profile.save();
    
    await ComplianceAudit.logAction({
      entityType: 'kyc_profile',
      entityId: customerId,
      action: 'reject',
      actor,
      details: {
        description: 'KYC profile rejected',
        newValue: profile.rejectionInfo
      },
      customerInfo: {
        customerId,
        customerName: profile.personalInfo?.fullNameEn,
        riskCategory: profile.riskAssessment?.category
      }
    });
    
    return profile;
  }
  
  async createAMLAlert(alertData, actor) {
    const alert = new AMLAlert({
      ...alertData,
      assignedTo: actor?.username || 'henry',
      priority: alertData.severity === 'CRITICAL' ? 5 : alertData.severity === 'HIGH' ? 4 : 3
    });
    
    await alert.save();
    
    await ComplianceAudit.logAction({
      entityType: 'aml_alert',
      entityId: alert.alertId,
      action: 'alert_create',
      actor: actor || { username: 'system', role: 'system' },
      details: {
        description: `AML alert created: ${alertData.title}`,
        newValue: { severity: alertData.severity, type: alertData.alertType }
      },
      customerInfo: alertData.customerSnapshot
    });
    
    return alert;
  }
  
  async getKYCStats() {
    const [statusStats, riskStats, pendingCount, alertStats] = await Promise.all([
      KYCProfile.getStatsByStatus(),
      KYCProfile.getStatsByRiskCategory(),
      KYCProfile.countDocuments({ kycStatus: { $in: ['pending', 'documents_required', 'under_review'] } }),
      AMLAlert.getAlertStats()
    ]);
    
    return {
      profiles: {
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byRisk: riskStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        pendingVerification: pendingCount
      },
      alerts: alertStats[0] || {}
    };
  }
  
  async getPendingVerifications(options = {}) {
    return KYCProfile.find({
      kycStatus: { $in: ['pending', 'documents_required', 'under_review', 'edd_required'] }
    })
    .sort({ priority: -1, createdAt: 1 })
    .limit(options.limit || 50)
    .select('-documents.fileUrl');
  }
  
  async getHighRiskProfiles(options = {}) {
    return KYCProfile.find({
      'riskAssessment.category': { $in: ['HIGH', 'PROHIBITED'] },
      kycStatus: 'approved'
    })
    .sort({ 'riskAssessment.score': -1 })
    .limit(options.limit || 50);
  }
  
  async getOpenAlerts(options = {}) {
    return AMLAlert.getOpenAlerts(options);
  }
  
  async getAuditTrail(entityType, entityId, options = {}) {
    return ComplianceAudit.getAuditTrail(entityType, entityId, options);
  }
}

};
