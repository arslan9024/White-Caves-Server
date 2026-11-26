// @ts-nocheck
/**
 * complianceRoutes.ts — Thin Express aggregator for compliance sub-routers (< 350 lines, AEG-042)
 * Handles Compliance Policies, UAE FIU goAML, CDD/EDD/PEP, KYC Document OCR, and Approval Workflows.
 */
const express = require('express');
const router = express.Router();

const policyAndGoAmlRoutes = require('./compliance/policyAndGoAml.routes');
const cddRoutes = require('./compliance/cdd.routes');
const documentRoutes = require('./compliance/documents.routes');
const workflowRoutes = require('./compliance/workflow.routes');

router.use('/', policyAndGoAmlRoutes);
router.use('/', cddRoutes);
router.use('/', documentRoutes);
router.use('/', workflowRoutes);

module.exports = router;
