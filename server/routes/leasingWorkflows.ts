/**
 * leasingWorkflows.ts
 * White Caves Real Estate LLC — Wave 2 & Wave 3 Residential Leasing Go-Live Routes:
 * - Listing Readiness Gate & Auto-Publish + Bayut/Property Finder XML/CSV Feeds
 * - Tenant Lead Qualification, Top-3 Vault Matching & MD Calendar Viewings (+ T-2h Reminder)
 * - DB-Persisted 12-Stage Tenancy Deals, Official PDF Receipts & Unified MD Daily Cockpit
 */

import { Router } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../database.js';
import { normalizeAppRoleToOrgRole } from '../services/rbac/leasingRoleClearanceMatrix.js';
import {
  evaluateAndAutoPublishListing,
  generateBayutPropertyFinderXmlFeed,
  generatePortalCsvFeed,
  listVerifiedActivePortalProperties,
} from '../services/leasing/listingReadinessPublishService.js';
import {
  bookViewingWithMdCalendarAndReminder,
  captureQualifyAndMatchTenantLead,
} from '../services/leasing/tenantMatchingViewingService.js';
import {
  advancePersistedTenancyDealStage,
  createPersistedTenancyDeal,
  generateOfficialTenancyDocsBundle,
} from '../services/leasing/tenancyDealPersistenceAndDocsService.js';
import { lindaMultiSimPool } from '../services/whatsapp/LindaMultiSimPoolService.js';
import { listSuppressedPhones } from '../services/whatsapp/dh2OutreachGovernanceService.js';
import { listMdPrimaryMasterQueue } from '../services/whatsapp/aiConversationAnalyzerService.js';
import { processDueQueueBatch } from '../services/leasing/leasingQueueWorkerService.js';

const router = Router();
const db = prisma as any;

// ─── WAVE 2: LISTING READINESS GATE & PORTAL FEEDS ─────────────────────────

router.post('/listings/:propertyId/publish', asyncHandler(async (req: AuthRequest, res) => {
  const propertyId = String(req.params.propertyId || '');
  const { mdApproved, approvedAnnualRentAed, approvedChequesCount, photoUrlsOverride, skipDriveLookup } = req.body || {};
  const report = await evaluateAndAutoPublishListing({
    propertyId,
    mdApproved: mdApproved === true,
    approvedAnnualRentAed: approvedAnnualRentAed ? Number(approvedAnnualRentAed) : undefined,
    approvedChequesCount: approvedChequesCount ? Number(approvedChequesCount) : undefined,
    approvedByUserId: req.user?.id || 'md-arslan-malik',
    photoUrlsOverride: Array.isArray(photoUrlsOverride) ? photoUrlsOverride : undefined,
    skipDriveLookup: skipDriveLookup === true,
  });
  res.json({ success: true, data: report });
}));

router.get('/feeds/bayut-pf.xml', asyncHandler(async (_req, res) => {
  const props = await listVerifiedActivePortalProperties();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(generateBayutPropertyFinderXmlFeed(props));
}));

router.get('/feeds/portals.csv', asyncHandler(async (_req, res) => {
  const props = await listVerifiedActivePortalProperties();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="whitecaves-dh2-rentals.csv"');
  res.send(generatePortalCsvFeed(props));
}));

// ─── WAVE 2: TENANT LEAD QUALIFICATION, MATCHING & VIEWINGS ────────────────

router.post('/tenants/qualify-match', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone || !b.budgetAed || !b.bedrooms) {
    throw new AppError('name, phone, budgetAed, and bedrooms are required', 400);
  }
  const result = await captureQualifyAndMatchTenantLead({
    name: String(b.name),
    phone: String(b.phone),
    email: b.email ? String(b.email) : undefined,
    source: b.source || 'WHITE_CAVES_WEB',
    budgetAed: Number(b.budgetAed),
    chequesCount: b.chequesCount ? Number(b.chequesCount) : undefined,
    bedrooms: Number(b.bedrooms),
    moveInDate: b.moveInDate ? String(b.moveInDate) : undefined,
    preferredCluster: b.preferredCluster ? String(b.preferredCluster) : undefined,
    notes: b.notes ? String(b.notes) : undefined,
  });
  res.status(201).json({ success: true, data: result });
}));

router.post('/viewings/book', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.tenantName || !b.tenantPhone || !b.cluster || !b.unitNumber || !b.scheduledAtIso) {
    throw new AppError('tenantName, tenantPhone, cluster, unitNumber, and scheduledAtIso are required', 400);
  }
  const booked = await bookViewingWithMdCalendarAndReminder({
    leadId: b.leadId ? String(b.leadId) : undefined,
    propertyId: b.propertyId ? String(b.propertyId) : undefined,
    tenantName: String(b.tenantName),
    tenantPhone: String(b.tenantPhone),
    cluster: String(b.cluster),
    unitNumber: String(b.unitNumber),
    scheduledAtIso: String(b.scheduledAtIso),
    notes: b.notes ? String(b.notes) : undefined,
  });
  res.status(201).json({ success: true, data: booked });
}));

// ─── WAVE 3: DB-PERSISTED 12-STAGE TENANCY DEALS & OFFICIAL PDF RECEIPTS ───

router.post('/tenancy-deals', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.propertyId || !b.project || !b.unitNumber || !b.landlordName || !b.landlordPhone || !b.annualRentAed) {
    throw new AppError('propertyId, project, unitNumber, landlordName, landlordPhone, and annualRentAed are required', 400);
  }
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const created = await createPersistedTenancyDeal({
    propertyId: String(b.propertyId),
    contractMode: b.contractMode === 'RENEWAL_TENANCY' ? 'RENEWAL_TENANCY' : 'NEW_TENANCY',
    area: b.area ? String(b.area) : 'Damac Hills 2',
    project: String(b.project),
    unitNumber: String(b.unitNumber),
    landlordName: String(b.landlordName),
    landlordPhone: String(b.landlordPhone),
    tenantName: b.tenantName ? String(b.tenantName) : undefined,
    tenantPhone: b.tenantPhone ? String(b.tenantPhone) : undefined,
    annualRentAed: Number(b.annualRentAed),
    chequesCount: b.chequesCount ? Number(b.chequesCount) : 4,
    leaseStartIso: b.leaseStartIso || now.toISOString(),
    leaseEndIso: b.leaseEndIso || nextYear.toISOString(),
    cheques: Array.isArray(b.cheques) ? b.cheques : [],
  });
  res.status(201).json({ success: true, data: created });
}));

router.post('/tenancy-deals/:dealId/advance', asyncHandler(async (req: AuthRequest, res) => {
  const contractId = String(req.params.dealId || '');
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const { nextStage, vipProxyOnBehalfOfClient, note, evidence, archiveToDrive } = req.body || {};
  if (!nextStage) throw new AppError('nextStage is required', 400);
  const result = await advancePersistedTenancyDealStage({
    contractId,
    nextStage,
    actorRole: role,
    actorUserId: req.user?.id || 'md-arslan-malik',
    vipProxyOnBehalfOfClient: vipProxyOnBehalfOfClient === true,
    note,
    evidence,
    archiveToDrive: archiveToDrive === true,
  });
  res.json({ success: true, data: result });
}));

router.get('/tenancy-deals/:dealId/receipt-pdf', asyncHandler(async (req, res) => {
  const contract = await db.tenancyContract?.findUnique?.({ where: { id: String(req.params.dealId) } });
  if (!contract?.chequesSchedule?.lifecycleState) {
    throw new AppError('Persisted tenancy deal not found', 404);
  }
  const bundle = generateOfficialTenancyDocsBundle({
    deal: contract.chequesSchedule.lifecycleState,
    cheques: contract.chequesSchedule.cheques || [],
  });
  const docType = req.query.type === 'vat' ? 'vat' : req.query.type === 'contract' ? 'contract' : 'receipt';
  const buf =
    docType === 'vat'
      ? bundle.vatInvoicePdfBuffer
      : docType === 'contract'
        ? bundle.contractDraftPdfBuffer
        : bundle.receiptPdfBuffer;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${bundle.receiptNumber}-${docType}.pdf"`);
  res.send(buf);
}));

router.post('/queue/process-due', asyncHandler(async (req: AuthRequest, res) => {
  const limit = req.body?.limit ? Number(req.body.limit) : 20;
  const result = await processDueQueueBatch(limit);
  res.json({ success: true, data: result });
}));

// ─── WAVE 3: UNIFIED MD DAILY LEASING COCKPIT AGGREGATION ──────────────────

router.get('/cockpit/daily-summary', asyncHandler(async (_req, res) => {
  const simTelemetry = lindaMultiSimPool.getPoolTelemetry();
  const [dncList, mdQueue, activeListings, upcomingViewings, activeDeals, renewalAlerts] = await Promise.all([
    listSuppressedPhones(),
    listMdPrimaryMasterQueue('pending'),
    listVerifiedActivePortalProperties(),
    db.viewingAppointment?.findMany?.({ where: { status: { in: ['REQUESTED', 'CONFIRMED'] } }, orderBy: { scheduledAt: 'asc' }, take: 20 }).catch(() => []) || [],
    db.tenancyContract?.findMany?.({ orderBy: { updatedAt: 'desc' }, take: 20 }).catch(() => []) || [],
    db.followUpQueue?.findMany?.({
      where: { entityType: { in: ['CHEQUE_T7D_ALERT', 'RERA_90D_RENEWAL_NOTICE'] }, status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
      take: 30,
    }).catch(() => []) || [],
  ]);

  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      primaryMasterPhone: '+971505760056',
      simFleet: {
        poolSize: simTelemetry.poolSize,
        hunterPoolSize: simTelemetry.hunterPoolSize,
        connectedCount: simTelemetry.connectedCount,
        connectedHunterCount: simTelemetry.connectedHunterCount,
        antiBanPolicy: simTelemetry.antiBanPolicy,
      },
      dncSuppressedCount: dncList.length,
      mdFollowUpQueueCount: mdQueue.length,
      mdFollowUpQueue: mdQueue.slice(0, 10),
      verifiedActiveListingsCount: activeListings.length,
      portalFeeds: {
        bayutPropertyFinderXml: '/api/leasing-formula/feeds/bayut-pf.xml',
        csvFeed: '/api/leasing-formula/feeds/portals.csv',
      },
      upcomingViewingsCount: upcomingViewings.length,
      upcomingViewings,
      activeDealsCount: activeDeals.length,
      activeDeals: activeDeals.map((d: any) => ({
        id: d.id,
        contractNumber: d.contractNumber,
        status: d.status,
        annualRentAed: d.annualRentAed || d.annualRentAED,
        stage: d.chequesSchedule?.lifecycleState?.currentStage || d.status,
        project: d.chequesSchedule?.lifecycleState?.project || 'DAMAC Hills 2',
        unitNumber: d.chequesSchedule?.lifecycleState?.unitNumber || 'TBD',
      })),
      chequeAndRenewalAlertsCount: renewalAlerts.length,
      chequeAndRenewalAlerts: renewalAlerts,
    },
  });
}));

export default router;
