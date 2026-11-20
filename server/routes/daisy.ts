import { Router } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { requireMinRole } from '../middleware/rbac.js';
import { generatePerfectListing } from '../services/daisy/listingWebCrawlerService.js';
import {
  generateEjariTenancyDraft,
  generatePaymentReceipt,
  scan90DayRenewalReminders,
} from '../services/daisy/dh2LeasingOpsService.js';

const router = Router();

/**
 * POST /api/daisy/crawler/generate-listing
 * Crawl a public listing URL or parse pasted listing text + attach verified Drive photos
 * via Henry's Area/Project/Unit formula + synthesize SEO-ready White Caves listing.
 */
router.post('/crawler/generate-listing', requireMinRole('agent'), asyncHandler(async (req, res) => {
  const { url, rawText, area, project, unitNumber, attachDrivePhotos, useOllama } = req.body || {};
  if (!url && !rawText) {
    throw new AppError('Provide either a public listing url or rawText', 400);
  }
  const listing = await generatePerfectListing({
    url: typeof url === 'string' ? url.trim() : undefined,
    rawText: typeof rawText === 'string' ? rawText : undefined,
    area: typeof area === 'string' ? area.trim() : undefined,
    project: typeof project === 'string' ? project.trim() : undefined,
    unitNumber: typeof unitNumber === 'string' ? unitNumber.trim() : undefined,
    attachDrivePhotos: attachDrivePhotos !== false,
    useOllama: useOllama !== false,
  });
  res.json({ success: true, data: listing });
}));

/**
 * POST /api/daisy/ejari/draft
 * Generate an Ejari-compliant Dubai residential tenancy contract draft with 90-day renewal date & PDC schedule.
 */
router.post('/ejari/draft', requireMinRole('agent'), asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.landlordName || !body.tenantName || !body.cluster || !body.unitNumber || !body.startDate || !body.annualRentAed) {
    throw new AppError('Required: landlordName, tenantName, cluster, unitNumber, startDate, annualRentAed', 400);
  }
  const draft = generateEjariTenancyDraft({
    ...body,
    annualRentAed: Number(body.annualRentAed),
    chequesCount: ([1, 2, 4, 6, 12].includes(Number(body.chequesCount)) ? Number(body.chequesCount) : 4) as 1 | 2 | 4 | 6 | 12,
  });
  res.status(201).json({ success: true, data: draft });
}));

/**
 * POST /api/daisy/receipts/generate
 * Issue an official White Caves Real Estate LLC payment receipt (Deposit, Commission + VAT, or Rent Cheque).
 */
router.post('/receipts/generate', requireMinRole('agent'), asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.payerName || !body.amountAed || !body.cluster || !body.unitNumber) {
    throw new AppError('Required: payerName, amountAed, cluster, unitNumber', 400);
  }
  const receipt = generatePaymentReceipt({
    payerName: String(body.payerName),
    payerPhone: body.payerPhone ? String(body.payerPhone) : undefined,
    category: body.category || 'SECURITY_DEPOSIT',
    amountAed: Number(body.amountAed),
    paymentMethod: body.paymentMethod || 'CHEQUE',
    chequeOrRefNumber: body.chequeOrRefNumber ? String(body.chequeOrRefNumber) : undefined,
    cluster: String(body.cluster),
    unitNumber: String(body.unitNumber),
    contractRef: body.contractRef ? String(body.contractRef) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
  });
  res.status(201).json({ success: true, data: receipt });
}));

/**
 * GET /api/daisy/renewals/90-day
 * Scan active leases expiring within Dubai Law No. 33/2008 90-day notice window and generate Linda WhatsApp drafts.
 */
router.get('/renewals/90-day', requireMinRole('agent'), asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days || 90) || 90));
  const summary = await scan90DayRenewalReminders(days);
  res.json({ success: true, data: summary });
}));

export default router;
