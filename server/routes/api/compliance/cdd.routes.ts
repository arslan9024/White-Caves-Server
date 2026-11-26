// @ts-nocheck
/**
 * cdd.routes.ts — Customer Due Diligence (CDD / EDD / PEP) Sub-Router (< 350 lines, AEG-042)
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const CustomerDueDiligenceService = require('../../../services/compliance/CustomerDueDiligenceService');
const logger = require('../../../config/logger');

router.post('/cdd', verifyToken, requireRole(['admin', 'compliance_officer', 'sales']), async (req, res) => {
  try {
    const cddRecord = await CustomerDueDiligenceService.createCDDRecord(req.body);
    res.status(201).json({ success: true, message: 'CDD record created', data: cddRecord });
  } catch (error) {
    logger.error(`Error creating CDD record: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/cdd/:customerId', verifyToken, async (req, res) => {
  try {
    const cddRecord = await CustomerDueDiligenceService.getCDDRecord(req.params.customerId);
    res.json({ success: true, data: cddRecord });
  } catch (error) {
    logger.error(`Error fetching CDD record: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/cdd/:customerId/pep-screening',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await CustomerDueDiligenceService.performPEPScreening(
        req.params.customerId,
        req.body.customerName,
        req.body.nationality
      );
      res.json({ success: true, message: 'PEP screening completed', data: result });
    } catch (error) {
      logger.error(`Error performing PEP screening: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/cdd/:customerId/edd',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await CustomerDueDiligenceService.performEnhancedDueDiligence(
        req.params.customerId,
        req.body
      );
      res.json({ success: true, message: 'Enhanced Due Diligence completed', data: result });
    } catch (error) {
      logger.error(`Error performing EDD: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/cdd/:customerId/approve',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await CustomerDueDiligenceService.approveCDD(req.params.customerId, {
        approverId: req.user.id,
        approverName: req.user.name,
        approvalComments: req.body.comments,
        conditionsForApproval: req.body.conditions,
      });
      res.json({ success: true, message: 'CDD record approved', data: result });
    } catch (error) {
      logger.error(`Error approving CDD: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/cdd/:customerId/reject',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await CustomerDueDiligenceService.rejectCDD(req.params.customerId, {
        rejecterId: req.user.id,
        rejectorName: req.user.name,
        rejectionReason: req.body.reason,
        requiredCorrectionss: req.body.corrections,
      });
      res.json({ success: true, message: 'CDD record rejected', data: result });
    } catch (error) {
      logger.error(`Error rejecting CDD: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
