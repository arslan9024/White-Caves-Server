// @ts-nocheck
/**
 * policyAndGoAml.routes.ts — Compliance Policy & UAE FIU goAML Sub-Router (< 350 lines, AEG-042)
 */
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const CompliancePolicyService = require('../../../services/compliance/CompliancePolicyService');
const GoAMLRegistrationService = require('../../../services/compliance/GoAMLRegistrationService');
const logger = require('../../../config/logger');

// ─── Compliance Policy Routes ────────────────────────────────────────────────
router.get('/policies', verifyToken, async (req, res) => {
  try {
    const policies = await CompliancePolicyService.getPolicies(req.query);
    res.json({ success: true, data: policies });
  } catch (error) {
    logger.error(`Error fetching policies: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/policies/:policyId', verifyToken, async (req, res) => {
  try {
    const policy = await CompliancePolicyService.getPolicyById(req.params.policyId);
    res.json({ success: true, data: policy });
  } catch (error) {
    logger.error(`Error fetching policy: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/policies', verifyToken, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const policy = await CompliancePolicyService.createPolicy(req.body, req.user.id, req.user.name);
    res.status(201).json({
      success: true,
      message: 'Compliance policy created successfully',
      data: policy,
    });
  } catch (error) {
    logger.error(`Error creating policy: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post(
  '/policies/:policyId/approve',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await CompliancePolicyService.approvePolicy(
        req.params.policyId,
        req.user.id,
        req.user.name,
        req.body.comments || ''
      );
      res.json({ success: true, message: 'Policy approved successfully', data: result });
    } catch (error) {
      logger.error(`Error approving policy: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ─── goAML Registration & STR Routes ─────────────────────────────────────────
router.post('/goaml/register', verifyToken, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const registration = await GoAMLRegistrationService.initializeCompanyRegistration(req.body);
    res.status(201).json({
      success: true,
      message: 'GoAML registration initialized',
      data: registration,
    });
  } catch (error) {
    logger.error(`Error initializing goAML registration: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/goaml/registrations', verifyToken, async (req, res) => {
  try {
    const registrations = await GoAMLRegistrationService.getRegistrations(req.query);
    res.json({ success: true, data: registrations });
  } catch (error) {
    logger.error(`Error fetching registrations: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/goaml/registrations/:registrationId', verifyToken, async (req, res) => {
  try {
    const details = await GoAMLRegistrationService.getRegistrationDetails(req.params.registrationId);
    res.json({ success: true, data: details });
  } catch (error) {
    logger.error(`Error fetching registration details: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/goaml/registrations/:registrationId/submit',
  verifyToken,
  requireRole(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const result = await GoAMLRegistrationService.submitToGoAMLPortal(
        req.params.registrationId,
        req.body.portalCredentials
      );
      res.json({
        success: true,
        message: 'Registration submitted to goAML portal',
        data: result,
      });
    } catch (error) {
      logger.error(`Error submitting to goAML: ${error.message}`);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

router.post('/goaml/str', verifyToken, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const result = await GoAMLRegistrationService.fileSuspiciousTransactionReport(req.body);
    res.json({ success: true, message: 'STR filed successfully', data: result });
  } catch (error) {
    logger.error(`Error filing STR: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/goaml/registrations/:registrationId/str-history', verifyToken, async (req, res) => {
  try {
    const history = await GoAMLRegistrationService.getSTRFilingHistory(req.params.registrationId);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error(`Error fetching STR history: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
