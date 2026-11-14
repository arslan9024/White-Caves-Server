import crypto from 'crypto';
import { Express, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import authMiddleware from '../middleware/auth.js';
import { WHATSAPP_WEBHOOK_SECRET } from '../config/env.js';
import logger from '../utils/logger.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { getSocketServer } from '../services/socketServer.js';

export function mountWhatsappCompatibilityRoutes(app: Express): void {
  // WhatsApp Webhook (public endpoint — requires webhook secret for verification)
  app.post(
    '/api/whatsapp/webhook',
    asyncHandler(async (req: Request, res: Response) => {
      if (!WHATSAPP_WEBHOOK_SECRET) {
        throw new AppError('WhatsApp webhook not configured — set WHATSAPP_WEBHOOK_SECRET', 500);
      }
      // SECURITY: Only accept webhook secret via header (never query params — they leak in logs)
      const webhookToken = (req.headers['x-webhook-token'] || '') as string;
      if (!webhookToken) {
        throw new AppError('Webhook token required in x-webhook-token header', 403);
      }
      // Use timing-safe comparison to prevent timing attacks on secret
      const expected = Buffer.from(WHATSAPP_WEBHOOK_SECRET, 'utf8');
      const received = Buffer.from(webhookToken, 'utf8');
      if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        throw new AppError('Invalid webhook token', 403);
      }
      logger.debug('WhatsApp webhook received', {
        hasEntry: !!req.body?.entry,
        entryCount: req.body?.entry?.length ?? 0,
      });
      res.status(200).json({ success: true });
    })
  );

  // Linda Relay Bridge CRM Lead, Campaign Telemetry & Receipt Ingestion (/api/v1/webhooks/linda/*)
  app.post(
    [
      '/api/v1/webhooks/linda',
      '/api/v1/webhooks/linda/lead',
      '/api/v1/webhooks/linda/receipt',
      '/api/v1/webhooks/linda/campaign',
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const {
        phone,
        name,
        category,
        project,
        inquiry,
        confidence,
        source,
        receiptStatus,
        messageId,
        cluster,
        unit,
        campaignName,
        status: campaignStatus,
        totalDispatched,
        skipped,
        dailyTarget,
        poolStatus,
        recentLogs,
        event,
        assignedAgent,
        from,
        body,
        hasMedia,
        mediaType,
      } = (req.body ?? {}) as Record<string, unknown>;

      // 1. Live Campaign Telemetry Broadcast
      if (campaignName || req.path.endsWith('/campaign')) {
        const telemetry = {
          campaignName: String(campaignName || 'VARDON_OUTREACH_CAMPAIGN'),
          status: String(campaignStatus || 'ACTIVE_DISPATCH_VERIFIED'),
          totalDispatched: Number(totalDispatched ?? 0),
          skipped: Number(skipped ?? 0),
          dailyTarget: Number(dailyTarget ?? 12),
          poolStatus: (poolStatus as Record<string, unknown>) ?? {},
          recentLogs: Array.isArray(recentLogs) ? (recentLogs as Array<Record<string, unknown>>) : [],
          timestamp: new Date().toISOString(),
        };
        getSocketServer()?.emitLindaCampaignTelemetry(telemetry);
        res.status(200).json({ success: true, status: 'campaign_telemetry_broadcasted', telemetry });
        return;
      }

      // 2. Delivery / Read Receipt
      if (receiptStatus) {
        logger.info('[LindaRelay] Delivery/Read receipt synced', {
          phone,
          receiptStatus,
          messageId,
          cluster,
          unit,
        });
        res.status(200).json({ success: true, status: 'receipt_recorded', receiptStatus });
        return;
      }

      // 3. Raw Inbound Message Relay
      if (from && body !== undefined && !category && !event) {
        getSocketServer()?.emitLindaMessage({
          id: `linda_msg_${Date.now()}`,
          from: String(from),
          body: String(body),
          timestamp: new Date(),
          hasMedia: Boolean(hasMedia),
          type: String(mediaType || 'chat'),
        });
      }

      const cleanPhone =
        typeof phone === 'string' && phone.trim()
          ? phone.trim()
          : typeof from === 'string' && from.trim()
            ? from.trim()
            : null;
      const leadName = typeof name === 'string' && name.trim() ? name.trim() : 'DAMAC Hills 2 Owner';
      const numConfidence = Number(confidence || 0.8);
      const leadScore = Math.min(100, Math.round(numConfidence * 100));
      const catStr = String(category || event || 'SELLER').toUpperCase();
      const projStr = String(project || cluster || 'VARDON');
      const inquiryStr = String(inquiry || body || '');
      const notes = `[${catStr} | ${projStr}] ${inquiryStr}`.trim();

      let leadId = `linda_lead_${Date.now()}`;
      try {
        if (cleanPhone) {
          const existing = await prisma.lead.findFirst({ where: { phone: cleanPhone } });
          if (existing) {
            const updated = await prisma.lead.update({
              where: { id: existing.id },
              data: {
                score: Math.max(existing.score, leadScore),
                notes: `${existing.notes || ''}\n${notes}`.trim(),
              },
            });
            leadId = updated.id;
          } else {
            const created = await prisma.lead.create({
              data: {
                name: leadName,
                phone: cleanPhone,
                source: typeof source === 'string' ? source : 'whatsapp_linda_outreach',
                status: 'new',
                score: leadScore,
                notes,
              },
            });
            leadId = created.id;
          }
        }
      } catch {
        // Non-blocking fallback when DB is in mock/offline mode
      }

      // Emit real-time lead update and HOT_LEAD escalation via Socket.IO
      const socketServer = getSocketServer();
      if (socketServer && cleanPhone) {
        socketServer.emitLeadUpdated({
          leadId,
          status: 'new',
          score: leadScore,
          updatedBy: 'Linda AI Agent',
        });

        const isHotLead =
          event === 'HOT_LEAD' ||
          catStr.includes('HOT') ||
          catStr.includes('SELLER') ||
          catStr.includes('BUYER') ||
          leadScore >= 80;

        if (isHotLead) {
          socketServer.emitLindaHotLead({
            id: leadId,
            phone: cleanPhone,
            name: leadName,
            category: catStr,
            project: projStr,
            unit: typeof unit === 'string' ? unit : undefined,
            inquiry: inquiryStr,
            confidence: numConfidence,
            assignedAgent: typeof assignedAgent === 'string' ? assignedAgent : undefined,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(200).json({ success: true, leadId, status: 'synced' });
    })
  );

  // ============================================================================
  // STATIC ROUTES — Static APIs for frontend pages not yet backed by full CRUD
  // These prevent 404 errors and return meaningful empty/default data
  // ============================================================================

  // WhatsApp API stubs (WhatsAppSettingsPage, WhatsAppDashboardPage, WhatsAppChatbotPage)
  app.get(
    '/api/whatsapp/stats',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: { totalMessages: 0, sentToday: 0, received: 0, activeChats: 0, sessions: [] },
      });
    })
  );
  app.get(
    '/api/whatsapp/settings',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (_req: Request, res: Response) => {
      const row = await prisma.systemSetting.findUnique({ where: { key: 'whatsapp_settings' } });
      const defaults = { phoneNumber: '', connected: false, autoReply: false, businessHours: null };
      const data = row ? { ...defaults, ...(row.value as object) } : defaults;
      res.status(200).json({ success: true, data });
    })
  );
  app.put(
    '/api/whatsapp/settings',
    authMiddleware,
    requireRole('owner'),
    asyncHandler(async (req: Request, res: Response) => {
      const { phoneNumber, autoReply, businessHours } = req.body ?? {};
      const userId = (req as Request & { user?: { id: string } }).user?.id;
      const current = await prisma.systemSetting.findUnique({
        where: { key: 'whatsapp_settings' },
      });
      const existing = (current?.value ?? {}) as Record<string, unknown>;
      const updated: Prisma.InputJsonValue = {
        ...existing,
        ...(phoneNumber !== undefined && { phoneNumber: String(phoneNumber) }),
        ...(autoReply !== undefined && { autoReply: Boolean(autoReply) }),
        ...(businessHours !== undefined && { businessHours }),
      } as Prisma.InputJsonValue;
      await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_settings' },
        update: {
          value: updated as Prisma.InputJsonValue,
          category: 'whatsapp',
          updatedBy: userId,
        },
        create: {
          key: 'whatsapp_settings',
          value: updated as Prisma.InputJsonValue,
          category: 'whatsapp',
          updatedBy: userId,
        },
      });
      res.status(200).json({ success: true, data: updated });
    })
  );
  app.post(
    '/api/whatsapp/session',
    authMiddleware,
    requireRole('owner'),
    asyncHandler(async (req: Request, res: Response) => {
      const { phoneNumber } = req.body ?? {};
      const userId = (req as Request & { user?: { id: string } }).user?.id;
      if (!phoneNumber)
        throw new AppError('phoneNumber is required to start a WhatsApp session', 400);
      const sessionId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sessionData = {
        sessionId,
        phoneNumber: String(phoneNumber),
        status: 'pending',
        startedAt: new Date().toISOString(),
      };
      await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_session' },
        update: { value: sessionData, category: 'whatsapp', updatedBy: userId },
        create: {
          key: 'whatsapp_session',
          value: sessionData,
          category: 'whatsapp',
          updatedBy: userId,
        },
      });
      res.status(200).json({ success: true, data: sessionData });
    })
  );
  app.post(
    '/api/whatsapp/init',
    authMiddleware,
    requireRole('owner'),
    asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'WhatsApp initialization pending — configure phone number first',
      });
    })
  );
  app.post(
    '/api/whatsapp/disconnect',
    authMiddleware,
    requireRole('owner'),
    asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'WhatsApp disconnected' });
    })
  );
  app.post(
    '/api/whatsapp/message',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (_req: Request, res: Response) => {
      res
        .status(200)
        .json({ success: true, data: { id: Date.now().toString(), status: 'queued' } });
    })
  );
  app.get(
    '/api/whatsapp/chatbot/messages',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (req: Request, res: Response) => {
      const conversationId = req.query.conversationId as string | undefined;
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

      const where = conversationId ? { conversationId } : {};
      const messages = await prisma.nadiaMessage.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: { conversation: { select: { id: true, customerPhone: true, status: true } } },
      });

      res.status(200).json({ success: true, data: messages.reverse() });
    })
  );
  app.post(
    '/api/whatsapp/chatbot/messages',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (req: Request, res: Response) => {
      const { conversationId, body, messageType = 'text', direction = 'outbound' } = req.body;
      if (!conversationId || !body) {
        throw new AppError('conversationId and body are required', 400);
      }

      const conversation = await prisma.nadiaConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) throw new AppError('Conversation not found', 404);

      const message = await prisma.nadiaMessage.create({
        data: {
          conversationId,
          waMessageId: `manual-${Date.now()}`,
          direction: ['inbound', 'outbound'].includes(direction) ? direction : 'outbound',
          body: String(body).slice(0, 4096),
          messageType: ['text', 'image', 'document', 'audio', 'video'].includes(messageType)
            ? messageType
            : 'text',
          status: 'sent',
          timestamp: new Date(),
        },
      });

      res.status(201).json({ success: true, data: message });
    })
  );
  app.delete(
    '/api/whatsapp/chatbot/messages/:id',
    authMiddleware,
    requirePermission('access_whatsapp_business'),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as Record<string, string>;
      const message = await prisma.nadiaMessage.findUnique({ where: { id } });
      if (!message) throw new AppError('Message not found', 404);
      await prisma.nadiaMessage.delete({ where: { id } });
      res.status(200).json({ success: true });
    })
  );
}
