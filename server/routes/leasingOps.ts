/**
 * Internal Leasing Operations Routes — Shared by White-Caves-Frontend & White-Caves-Mobile
 * Mounted at /api/leasing in server/routes/registry.ts (< 350 lines, AEG-042)
 */

import { Router, type Response } from 'express';
import { prisma } from '../database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getSocketServer } from '../services/socketServer.js';
import {
  FALLBACK_PUBLIC_RENTALS,
  normalizeE164Phone,
} from '../services/leasing/publicLeasingSanitizer.js';
import {
  buildChequeSchedule,
  ensureSeedsLoaded,
  humanTakeoverLocks,
  VALID_LEAD_STATUSES,
  VALID_VIEWING_STATUSES,
} from '../services/leasing/leasingOpsSeeds.js';
import {
  inMemoryContracts,
  inMemoryLeads,
  inMemoryLeasedIds,
  inMemoryViewings,
} from './publicLeasing.js';
import { getOrInitLindaRuntime } from '../controllers/linda/lindaCommon.js';

const router = Router();
const db = prisma as any;

// ─── LEADS PIPELINE (GET / POST / PATCH /api/leasing/leads) ──────────────────

router.get(
  '/leads',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    ensureSeedsLoaded();
    let dbLeads: any[] = [];
    try {
      dbLeads = await db.lead.findMany({
        where: { dealType: 'lease' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch {
      dbLeads = [];
    }

    const normalizedDb = dbLeads.map(l => ({
      id: l.id,
      tenantName: l.tenantName || l.name,
      tenantPhone: l.tenantPhone || l.phone || '+971500000000',
      tenantEmail: l.tenantEmail || l.email || '',
      propertyId: l.propertyId || '673a10000000000000000101',
      assignedAgentId: l.assignedAgentId || l.assignedToId || 'wc-agent-arslan',
      source: l.source || 'WEB_INQUIRY',
      status: String(l.status || 'NEW').toUpperCase(),
      notes: l.notes || '',
      createdAt: l.createdAt,
    }));

    const combined = [...inMemoryLeads];
    for (const item of normalizedDb) {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    }

    res.json({ success: true, data: combined, total: combined.length });
  })
);

router.post(
  '/leads',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureSeedsLoaded();
    const body = (req.body || {}) as Record<string, any>;
    const tenantName = String(body.tenantName || body.name || '').trim();
    const rawPhone = String(body.tenantPhone || body.phone || '').trim();
    if (!tenantName || !rawPhone) {
      throw new AppError('tenantName and tenantPhone are required', 400);
    }

    const tenantPhone = normalizeE164Phone(rawPhone);
    const source = body.source || 'MOBILE_FIELD';
    const status = VALID_LEAD_STATUSES.includes(body.status) ? body.status : 'NEW';
    const propertyId = String(body.propertyId || '673a10000000000000000101');
    const matchedProp = FALLBACK_PUBLIC_RENTALS.find(
      p => p.id === propertyId || p.slug === propertyId
    );

    const newLead: Record<string, any> = {
      id: `lead-${Date.now()}`,
      tenantName,
      name: tenantName,
      tenantPhone,
      phone: tenantPhone,
      tenantEmail: body.tenantEmail || body.email || '',
      propertyId: matchedProp?.id || propertyId,
      propertyTitle: matchedProp?.title || body.propertyTitle || 'DAMAC Hills 2 Verified Rental',
      community: matchedProp?.community || body.community || 'DAMAC Hills 2',
      subCommunity: matchedProp?.subCommunity || body.subCommunity || 'Camelia',
      annualRentAed: Number(body.annualRentAed || matchedProp?.annualRentAed || 90000),
      chequesCount: Number(body.chequesCount || matchedProp?.chequesCount || 4),
      assignedAgentId: req.user?.id || body.assignedAgentId || 'wc-agent-arslan',
      source,
      status,
      notes: body.notes || 'Logged via White Caves Field Leasing Companion',
      createdAt: new Date().toISOString(),
    };

    inMemoryLeads.unshift(newLead);

    try {
      const sock = getSocketServer() as any;
      sock?.io?.to('crm').emit('lead:created', { lead: newLead, timestamp: new Date().toISOString() });
    } catch {
      // non-fatal
    }

    let lindaTriggered = false;
    try {
      const { messageBridge } = await getOrInitLindaRuntime();
      await messageBridge.send({
        phoneNumber: tenantPhone.replace(/\D/g, ''),
        message: `Hello ${tenantName}! Thank you for visiting White Caves Real Estate at ${newLead.community}. Let us know when you'd like to view ${newLead.propertyTitle}.`,
      });
      lindaTriggered = true;
    } catch {
      lindaTriggered = false;
    }

    res.status(201).json({ success: true, data: newLead, lindaFollowUpDispatched: lindaTriggered });
  })
);

const patchLeadHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  ensureSeedsLoaded();
  const leadId = String(req.params.id || req.body?.id || req.body?.leadId || '').trim();
  const nextStatus = String(req.body?.status || '').toUpperCase();
  const notes = req.body?.notes;

  if (!leadId) throw new AppError('leadId is required', 400);
  if (nextStatus && !VALID_LEAD_STATUSES.includes(nextStatus as any)) {
    throw new AppError(`Invalid lead status. Allowed: ${VALID_LEAD_STATUSES.join(', ')}`, 400);
  }

  const idx = inMemoryLeads.findIndex(l => l.id === leadId);
  if (idx >= 0) {
    if (nextStatus) inMemoryLeads[idx].status = nextStatus;
    if (notes !== undefined) inMemoryLeads[idx].notes = String(notes);
    inMemoryLeads[idx].updatedAt = new Date().toISOString();
    return res.json({ success: true, data: inMemoryLeads[idx] });
  }

  try {
    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(notes !== undefined ? { notes: String(notes) } : {}),
      },
    });
    return res.json({ success: true, data: updated });
  } catch {
    throw new AppError('Lead not found', 404);
  }
});

router.patch('/leads', patchLeadHandler);
router.patch('/leads/:id', patchLeadHandler);

// ─── VIEWINGS (GET / POST / PATCH /api/leasing/viewings) ─────────────────────

router.get(
  '/viewings',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    ensureSeedsLoaded();
    res.json({ success: true, data: inMemoryViewings, total: inMemoryViewings.length });
  })
);

router.post(
  '/viewings',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureSeedsLoaded();
    const body = (req.body || {}) as Record<string, any>;
    const leadId = String(body.leadId || '').trim();
    const propertyId = String(body.propertyId || '673a10000000000000000101').trim();
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 86400000);
    if (!leadId) throw new AppError('leadId is required to schedule a viewing', 400);

    const lead = inMemoryLeads.find(l => l.id === leadId);
    const prop = FALLBACK_PUBLIC_RENTALS.find(p => p.id === propertyId || p.slug === propertyId);

    const viewing: Record<string, any> = {
      id: `view-${Date.now()}`,
      leadId,
      propertyId: prop?.id || propertyId,
      propertyTitle: prop?.title || lead?.propertyTitle || 'DAMAC Hills 2 Verified Rental',
      community: prop?.community || lead?.community || 'DAMAC Hills 2',
      subCommunity: prop?.subCommunity || lead?.subCommunity || 'Camelia',
      tenantName: body.tenantName || lead?.tenantName || 'Valued Tenant',
      tenantPhone: body.tenantPhone || lead?.tenantPhone || '+971500000000',
      agentId: req.user?.id || body.agentId || 'wc-agent-arslan',
      scheduledAt: Number.isNaN(scheduledAt.getTime()) ? new Date().toISOString() : scheduledAt.toISOString(),
      status: VALID_VIEWING_STATUSES.includes(body.status) ? body.status : 'CONFIRMED',
      directions: `${prop?.subCommunity || 'Camelia'} Security Gate, ${prop?.community || 'DAMAC Hills 2'}, Dubai`,
      feedback: body.feedback || '',
      createdAt: new Date().toISOString(),
    };

    inMemoryViewings.unshift(viewing);
    if (lead) lead.status = 'VIEWING_SCHEDULED';

    res.status(201).json({ success: true, data: viewing });
  })
);

const patchViewingHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  ensureSeedsLoaded();
  const viewingId = String(req.params.id || req.body?.id || req.body?.viewingId || '').trim();
  const status = req.body?.status ? String(req.body.status).toUpperCase() : undefined;
  const scheduledAt = req.body?.scheduledAt;
  const feedback = req.body?.feedback;

  if (!viewingId) throw new AppError('viewingId is required', 400);
  if (status && !VALID_VIEWING_STATUSES.includes(status as any)) {
    throw new AppError(`Invalid viewing status. Allowed: ${VALID_VIEWING_STATUSES.join(', ')}`, 400);
  }

  const viewing = inMemoryViewings.find(v => v.id === viewingId);
  if (!viewing) throw new AppError('Viewing appointment not found', 404);

  if (status) viewing.status = status;
  if (scheduledAt) viewing.scheduledAt = new Date(scheduledAt).toISOString();
  if (feedback !== undefined) viewing.feedback = String(feedback);
  viewing.updatedAt = new Date().toISOString();

  if (status === 'COMPLETED') {
    const parentLead = inMemoryLeads.find(l => l.id === viewing.leadId);
    if (parentLead && parentLead.status === 'VIEWING_SCHEDULED') {
      parentLead.status = 'VIEWING_COMPLETED';
    }
  }

  res.json({ success: true, data: viewing });
});

router.patch('/viewings', patchViewingHandler);
router.patch('/viewings/:id', patchViewingHandler);

// ─── CLOSE LEASING DEAL (POST /api/leasing/contracts/close) ──────────────────

router.get(
  '/contracts',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({ success: true, data: inMemoryContracts, total: inMemoryContracts.length });
  })
);

router.post(
  '/contracts/close',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureSeedsLoaded();
    const body = (req.body || {}) as Record<string, any>;
    const propertyId = String(body.propertyId || '').trim();
    const leadId = body.leadId ? String(body.leadId).trim() : undefined;
    const annualRentAed = Number(body.annualRentAed || 90000);
    const chequesCount = Number(body.chequesCount || 4);
    const startDate = body.startDate || new Date().toISOString().split('T')[0];
    const endDate =
      body.endDate ||
      new Date(new Date(startDate).getTime() + 365 * 86400000).toISOString().split('T')[0];

    if (!propertyId) throw new AppError('propertyId is required to close a leasing contract', 400);

    const matchedProp = FALLBACK_PUBLIC_RENTALS.find(
      p => p.id === propertyId || p.slug === propertyId
    );

    inMemoryLeasedIds.add(propertyId);
    if (matchedProp) {
      inMemoryLeasedIds.add(matchedProp.id);
      inMemoryLeasedIds.add(matchedProp.slug);
    }

    try {
      if (/^[a-f0-9]{24}$/i.test(propertyId)) {
        await db.property.update({
          where: { id: propertyId },
          data: { status: 'LEASED', inventoryStage: 'leased_sold', vacancyStatus: 'OCCUPIED' },
        });
      }
    } catch {
      // in-memory fallback already updated
    }

    const lead = leadId ? inMemoryLeads.find(l => l.id === leadId) : undefined;
    if (lead) lead.status = 'CLOSED_WON';

    const chequesSchedule = buildChequeSchedule(annualRentAed, chequesCount, startDate);
    const contractNumber = `EJARI-WC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const ejariNumber =
      body.ejariNumber || `01-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const tenancyContract: Record<string, any> = {
      id: `contract-${Date.now()}`,
      contractNumber,
      ejariNumber,
      propertyId: matchedProp?.id || propertyId,
      propertyTitle: matchedProp?.title || body.propertyTitle || 'DAMAC Hills 2 Verified Villa',
      community: matchedProp?.community || body.community || 'DAMAC Hills 2',
      subCommunity: matchedProp?.subCommunity || body.subCommunity || 'Camelia',
      landlordProfileId: body.landlordProfileId || 'landlord-profile-01',
      landlordName: body.landlordName || 'Humaid Al Falasi',
      tenantProfileId: body.tenantProfileId || 'tenant-profile-01',
      tenantName: body.tenantName || lead?.tenantName || 'Sophie Bernard',
      tenantPhone: body.tenantPhone || lead?.tenantPhone || '+971529876543',
      tenantEmiratesId: body.tenantEmiratesId || '784-1992-4829102-1',
      agentId: req.user?.id || body.agentId || 'wc-agent-arslan',
      startDate,
      endDate,
      annualRentAed,
      securityDepositAed: Number(body.securityDepositAed || Math.round(annualRentAed * 0.05)),
      chequesCount,
      chequesSchedule,
      status: 'ACTIVE',
      documents: body.documents || [
        `/api/documents/dld-unified-tenancy-${contractNumber}.pdf`,
        `/api/documents/ejari-certificate-${ejariNumber}.pdf`,
      ],
      createdAt: new Date().toISOString(),
    };

    inMemoryContracts.unshift(tenancyContract);

    res.status(201).json({
      success: true,
      data: { contract: tenancyContract, propertyStatus: 'LEASED', leadStatus: 'CLOSED_WON' },
    });
  })
);

// ─── LINDA & HENRY MEDIA INGEST + SLASH COMMANDS + 30M TAKEOVER ──────────────

router.post(
  '/kyc/ingest-media',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const docType = String(body.docType || 'EMIRATES_ID').toUpperCase();
    const fileName = String(body.fileName || `${docType.toLowerCase()}-${Date.now()}.jpg`);

    res.status(201).json({
      success: true,
      data: {
        id: `doc-ocr-${Date.now()}`,
        type: docType,
        title: `Tenant ${docType} (${fileName})`,
        status: 'PENDING_OCR',
        leadId: body.leadId || null,
        driveFileUrl: `https://drive.google.com/drive/folders/white-caves-henry-kyc/${fileName}`,
        createdAt: new Date().toISOString(),
      },
    });
  })
);

router.post(
  '/linda/takeover',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId, active = true } = (req.body || {}) as {
      conversationId?: string;
      active?: boolean;
    };
    if (!conversationId) throw new AppError('conversationId is required', 400);

    if (!active) {
      humanTakeoverLocks.delete(conversationId);
      return res.json({ success: true, data: { conversationId, takeoverActive: false, expiresAt: null } });
    }

    const expiresAt = Date.now() + 30 * 60 * 1000;
    humanTakeoverLocks.set(conversationId, { agentName: req.user?.name || 'Arslan Malik', expiresAt });

    res.json({
      success: true,
      data: {
        conversationId,
        takeoverActive: true,
        durationMinutes: 30,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });
  })
);

router.post(
  '/linda/slash',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { command, conversationId } = (req.body || {}) as { command?: string; conversationId?: string };
    const raw = String(command || '').trim();
    if (!raw.startsWith('/')) {
      throw new AppError('Slash command must start with / (e.g. /property, /viewing, /kyc)', 400);
    }

    const [cmd, ...args] = raw.split(/\s+/);
    const argText = args.join(' ');
    let replyText = '';

    if (cmd === '/property') {
      const available = FALLBACK_PUBLIC_RENTALS.filter(
        p => !inMemoryLeasedIds.has(p.id) && !inMemoryLeasedIds.has(p.slug)
      ).slice(0, 3);
      replyText = [
        '🏡 *VERIFIED AVAILABLE RENTALS (WHITE CAVES DESK)*',
        ...available.map(
          p =>
            `• *${p.title}* (${p.subCommunity}, ${p.community}) — AED ${p.annualRentAed.toLocaleString()}/yr (${p.chequesCount} cheques)`
        ),
        'Reply with your preferred option to lock a viewing slot.',
      ].join('\n');
    } else if (cmd === '/viewing') {
      replyText = `📅 *VIEWING SLOT INVITATION*\nWe have reserved a viewing slot for ${
        argText || 'tomorrow at 4:00 PM GST'
      } at the community gate. Reply *CONFIRM* to lock your appointment.`;
    } else if (cmd === '/kyc') {
      replyText =
        '🪪 *TENANT KYC & EJARI FAST-TRACK*\nPlease reply with a clear photo or PDF of your *Emirates ID (Front & Back)* and *Passport*. Our Henry Vault & Browser OCR will prepare your official DLD Unified Tenancy Contract immediately.';
    } else {
      replyText = `⚡ Executed command \`${cmd}\` for conversation ${conversationId || 'active'}.`;
    }

    res.json({
      success: true,
      data: { command: cmd, conversationId: conversationId || 'default', replyText, timestamp: new Date().toISOString() },
    });
  })
);

export default router;
