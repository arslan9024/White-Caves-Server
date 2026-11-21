/**
 * Public Leasing Routes — Unauthenticated Storefront & Lead Capture
 * Mounted at /api/public in server/bootstrap/publicRoutes.ts
 *
 * Endpoints:
 *   GET  /api/public/properties/rent  — Filtered, paginated, sanitized AVAILABLE rental listings
 *   GET  /api/public/properties/:slug — Full sanitized property details + assigned broker + wa.me link
 *   POST /api/public/leads/inquiry    — Creates Lead (NEW), assigns broker, emits Socket.IO lead:created, triggers Linda greeting
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { getSocketServer } from '../services/socketServer.js';
import {
  FALLBACK_PUBLIC_RENTALS,
  normalizeE164Phone,
  toPublicRentalDto,
  type PublicRentalPropertyDto,
} from '../services/leasing/publicLeasingSanitizer.js';
import { getOrInitLindaRuntime } from '../controllers/linda/lindaCommon.js';
import logger from '../utils/logger.js';

const router = Router();
const db = prisma as any;

// In-memory store for leased property IDs/slugs and newly created public leads when DB is in fallback mode
export const inMemoryLeasedIds = new Set<string>();
export const inMemoryLeads: Array<Record<string, any>> = [];
export const inMemoryViewings: Array<Record<string, any>> = [];
export const inMemoryContracts: Array<Record<string, any>> = [];

async function loadSanitizedAvailableRentals(): Promise<PublicRentalPropertyDto[]> {
  let dbRecords: any[] = [];
  try {
    dbRecords = await db.property.findMany({
      where: {
        status: { in: ['available', 'AVAILABLE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
  } catch {
    dbRecords = [];
  }

  const mappedDb = dbRecords
    .map(r => toPublicRentalDto(r))
    .filter(p => p.status === 'AVAILABLE' && !inMemoryLeasedIds.has(p.id) && !inMemoryLeasedIds.has(p.slug));

  const fallbackActive = FALLBACK_PUBLIC_RENTALS.filter(
    p => !inMemoryLeasedIds.has(p.id) && !inMemoryLeasedIds.has(p.slug)
  );

  const combined = [...mappedDb];
  for (const fb of fallbackActive) {
    if (!combined.some(c => c.slug === fb.slug || c.id === fb.id)) {
      combined.push(fb);
    }
  }
  return combined;
}

/**
 * GET /api/public/properties/rent
 * Filter by community, minRent, maxRent, bedrooms, cheques, sort, page, pageSize
 */
router.get(
  '/properties/rent',
  asyncHandler(async (req: Request, res: Response) => {
    const community = typeof req.query.community === 'string' ? req.query.community.trim().toLowerCase() : '';
    const minRent = req.query.minRent ? Number(req.query.minRent) : undefined;
    const maxRent = req.query.maxRent ? Number(req.query.maxRent) : undefined;
    const bedrooms = req.query.bedrooms !== undefined && req.query.bedrooms !== '' ? Number(req.query.bedrooms) : undefined;
    const cheques = req.query.cheques !== undefined && req.query.cheques !== '' ? Number(req.query.cheques) : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 24));

    let items = await loadSanitizedAvailableRentals();

    if (community) {
      items = items.filter(
        p =>
          p.community.toLowerCase().includes(community) ||
          p.subCommunity.toLowerCase().includes(community) ||
          p.location.toLowerCase().includes(community)
      );
    }
    if (minRent !== undefined && !Number.isNaN(minRent)) {
      items = items.filter(p => p.annualRentAed >= minRent);
    }
    if (maxRent !== undefined && !Number.isNaN(maxRent)) {
      items = items.filter(p => p.annualRentAed <= maxRent);
    }
    if (bedrooms !== undefined && !Number.isNaN(bedrooms)) {
      items = items.filter(p => p.bedrooms === bedrooms);
    }
    if (cheques !== undefined && !Number.isNaN(cheques)) {
      items = items.filter(p => p.chequesCount >= cheques);
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => a.annualRentAed - b.annualRentAed);
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.annualRentAed - a.annualRentAed);
    } else if (sort === 'area_desc') {
      items.sort((a, b) => b.areaSqFt - a.areaSqFt);
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    res.json({
      success: true,
      data: paged,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  })
);

/**
 * GET /api/public/properties/:slug
 * Full sanitized property details by slug or id
 */
router.get(
  '/properties/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const slugParam = String(req.params.slug || '').trim().toLowerCase();
    if (!slugParam) {
      throw new AppError('Property slug is required', 400);
    }

    const items = await loadSanitizedAvailableRentals();
    const match = items.find(
      p => p.slug.toLowerCase() === slugParam || p.id.toLowerCase() === slugParam
    );

    if (!match) {
      throw new AppError('Rental property not found or already leased', 404);
    }

    res.json({
      success: true,
      data: match,
    });
  })
);

/**
 * POST /api/public/leads/inquiry
 * Creates Lead (status: NEW), assigns broker, emits Socket.IO lead:created,
 * and triggers Linda WhatsApp automated greeting + viewing slot prompt.
 */
router.post(
  '/leads/inquiry',
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const tenantName = String(body.tenantName || body.name || '').trim();
    const rawPhone = String(body.tenantPhone || body.phone || '').trim();
    const tenantEmail = body.tenantEmail || body.email ? String(body.tenantEmail || body.email).trim() : undefined;
    const propertyId = body.propertyId ? String(body.propertyId).trim() : undefined;
    const propertySlug = body.propertySlug ? String(body.propertySlug).trim() : undefined;
    const preferredViewingAt = body.preferredViewingAt ? String(body.preferredViewingAt) : undefined;
    const notes = body.notes || body.message ? String(body.notes || body.message).trim() : undefined;

    if (!tenantName || tenantName.length < 2) {
      throw new AppError('tenantName is required (minimum 2 characters)', 400);
    }
    if (!rawPhone || rawPhone.replace(/\D/g, '').length < 8) {
      throw new AppError('A valid tenantPhone is required', 400);
    }

    const tenantPhone = normalizeE164Phone(rawPhone);
    const rentals = await loadSanitizedAvailableRentals();
    const matchedProperty = rentals.find(
      p => p.id === propertyId || p.slug === propertySlug || p.slug === propertyId
    );

    const assignedAgentId = matchedProperty?.assignedBroker?.id || 'wc-agent-arslan';
    const greetingText = `Marhaba ${tenantName}! This is Linda from White Caves Real Estate LLC. Thank you for your inquiry on ${
      matchedProperty ? `"${matchedProperty.title}" in ${matchedProperty.subCommunity}, ${matchedProperty.community}` : 'our verified Dubai rental collection'
    }. Would you like to confirm a viewing appointment${
      preferredViewingAt ? ` for ${preferredViewingAt}` : ' today or tomorrow between 10:00 AM and 6:00 PM GST'
    }? Reply with your preferred time or send your Emirates ID to fast-track your Ejari reservation.`;

    let createdLead: Record<string, any> | null = null;
    try {
      const validObjectId = propertyId && /^[a-f0-9]{24}$/i.test(propertyId) ? propertyId : undefined;
      createdLead = await db.lead.create({
        data: {
          name: tenantName,
          tenantName,
          phone: tenantPhone,
          tenantPhone,
          email: tenantEmail,
          tenantEmail,
          source: 'WEB_INQUIRY',
          status: 'NEW',
          dealType: 'lease',
          leasingStage: 1,
          ...(validObjectId ? { propertyId: validObjectId } : {}),
          notes: notes
            ? `[PUBLIC RENTAL INQUIRY${matchedProperty ? ` • ${matchedProperty.slug}` : ''}] ${notes}`
            : `[PUBLIC RENTAL INQUIRY${matchedProperty ? ` • ${matchedProperty.slug}` : ''}]`,
        },
      });
    } catch {
      createdLead = {
        id: `lead-${Date.now()}`,
        name: tenantName,
        tenantName,
        phone: tenantPhone,
        tenantPhone,
        email: tenantEmail,
        tenantEmail,
        propertyId: matchedProperty?.id || propertyId || '673a10000000000000000101',
        propertyTitle: matchedProperty?.title || 'DAMAC Hills 2 Verified Rental',
        community: matchedProperty?.community || 'DAMAC Hills 2',
        assignedAgentId,
        source: 'WEB_INQUIRY',
        status: 'NEW',
        notes: notes || 'Submitted via White Caves Public Rental Portal',
        createdAt: new Date().toISOString(),
      };
      inMemoryLeads.unshift(createdLead);
    }

    // If preferredViewingAt was requested, also queue a REQUESTED viewing
    let viewingAppointment: Record<string, any> | null = null;
    if (preferredViewingAt) {
      const scheduledDate = new Date(preferredViewingAt);
      const validDate = !Number.isNaN(scheduledDate.getTime()) ? scheduledDate : new Date(Date.now() + 86400000);
      viewingAppointment = {
        id: `view-${Date.now()}`,
        leadId: createdLead?.id,
        propertyId: matchedProperty?.id || propertyId || '673a10000000000000000101',
        propertyTitle: matchedProperty?.title || 'DAMAC Hills 2 Rental Villa',
        community: matchedProperty?.community || 'DAMAC Hills 2',
        subCommunity: matchedProperty?.subCommunity || 'Camelia',
        tenantName,
        tenantPhone,
        agentId: assignedAgentId,
        scheduledAt: validDate.toISOString(),
        status: 'REQUESTED',
        notes: notes || 'Requested from public rental detail modal',
      };
      inMemoryViewings.unshift(viewingAppointment);
    }

    // Emit real-time Socket.IO event to connected CRM agents
    try {
      const sock = getSocketServer() as any;
      if (sock?.io) {
        sock.io.to('crm').emit('lead:created', {
          lead: createdLead,
          viewing: viewingAppointment,
          property: matchedProperty || null,
          timestamp: new Date().toISOString(),
        });
      }
      sock?.emitLindaHotLead?.({
        id: String(createdLead?.id ?? ''),
        phone: tenantPhone,
        name: tenantName,
        category: 'TENANT_INQUIRY',
        project: matchedProperty?.community || 'DAMAC Hills 2',
        inquiry: notes || 'Viewing & rental inquiry',
        confidence: 0.95,
        assignedAgent: assignedAgentId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn('Socket emit lead:created non-fatal warning', { err });
    }

    // Trigger Linda WhatsApp automated greeting (non-blocking)
    let lindaDispatched = false;
    try {
      const { messageBridge } = await getOrInitLindaRuntime();
      await messageBridge.send({
        phoneNumber: tenantPhone.replace(/\D/g, ''),
        message: greetingText,
      });
      lindaDispatched = true;
    } catch {
      lindaDispatched = false;
    }

    res.status(201).json({
      success: true,
      data: {
        lead: createdLead,
        viewingAppointment,
        assignedAgentId,
        lindaGreeting: {
          dispatched: lindaDispatched,
          previewText: greetingText,
          whatsappDeepLink:
            matchedProperty?.assignedBroker?.whatsappDeepLink ||
            `https://wa.me/971505760056?text=${encodeURIComponent(greetingText)}`,
        },
      },
    });
  })
);

export default router;
