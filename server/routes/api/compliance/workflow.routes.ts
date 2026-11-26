// @ts-nocheck
/**
 * workflow.routes.ts — Compliance Approval Workflow & Audit Trail Sub-Router (< 350 lines, AEG-042)
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const ApprovalWorkflowService = require('../../../services/compliance/ApprovalWorkflowService');
const logger = require('../../../config/logger');

router.post('/workflow', verifyToken, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const workflow = await ApprovalWorkflowService.createWorkflow(req.body);
    res.status(201).json({ success: true, message: 'Approval workflow created', data: workflow });
  } catch (error) {
    logger.error(`Error creating workflow: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/workflow/:workflowId', verifyToken, async (req, res) => {
  try {
    const status = await ApprovalWorkflowService.getWorkflowStatus(req.params.workflowId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error(`Error fetching workflow status: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/workflow/:workflowId/approve', verifyToken, async (req, res) => {
  try {
    const result = await ApprovalWorkflowService.approveDocument(req.params.workflowId, {
      approverId: req.user.id,
      approverName: req.user.name,
      approverTitle: req.user.title || 'Staff',
      approverEmail: req.user.email,
      comments: req.body.comments,
      signatureMethod: req.body.signatureMethod || 'digital',
      signatureData: req.body.signatureData,
    });
    res.json({ success: true, message: 'Document approved successfully', data: result });
  } catch (error) {
    logger.error(`Error approving document: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/workflow/:workflowId/reject', verifyToken, async (req, res) => {
  try {
    const result = await ApprovalWorkflowService.rejectDocument(req.params.workflowId, {
      approverId: req.user.id,
      approverName: req.user.name,
      rejectionReason: req.body.reason,
      requirementsForResubmission: req.body.requirements,
    });
    res.json({ success: true, message: 'Document rejected', data: result });
  } catch (error) {
    logger.error(`Error rejecting document: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/workflow/:workflowId/audit-trail', verifyToken, async (req, res) => {
  try {
    const auditTrail = await ApprovalWorkflowService.getAuditTrail(req.params.workflowId);
    res.json({ success: true, data: auditTrail });
  } catch (error) {
    logger.error(`Error fetching audit trail: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pending-approvals', verifyToken, async (req, res) => {
  try {
    const pending = await ApprovalWorkflowService.getPendingApprovalsForUser(
      req.user.id,
      req.user.email
    );
    res.json({ success: true, data: pending });
  } catch (error) {
    logger.error(`Error fetching pending approvals: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
