// @ts-nocheck
/**
 * CommunicationService.js
 * PURPOSE: Service layer for Communication Templates & Message Sending
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * HANDLES:
 * - Template CRUD operations
 * - Message rendering with variable interpolation
 * - Bulk message sending
 * - Delivery tracking & analytics
 * - Scheduled message management
 * - Communication history per recipient
 */

import CommunicationTemplate from '../../schemas/CommunicationTemplateSchema.js';
import CommunicationLog from '../../schemas/CommunicationLogSchema.js';
import { createHash } from 'node:crypto';
import ContactConsentService from '../../../campaigns/ContactConsentService.js';


export const methodsPart3 = {
  async sendBulkMessage(options) {
    try {
      const {
        templateId,
        recipients,
        sentBy,
        sentFrom,
        language,
        context = {},
        sendFn,
        delayMs = 1000,
        idempotencyKey
      } = options;

      const normalizedKey = CommunicationService._validateIdempotencyKey(idempotencyKey);
      if (normalizedKey) await CommunicationService._ensureIdempotencyIndex();
      if (!recipients || recipients.length === 0) {
        return { success: false, error: 'At least one recipient is required' };
      }

      // Load template
      const template = await CommunicationTemplate.findOne({ templateId, status: 'active' });
      if (!template) {
        return { success: false, error: `Active template ${templateId} not found` };
      }

      // Generate bulk ID
      const bulkId = normalizedKey
        ? `BULK-${createHash('sha256').update(normalizedKey).digest('hex').slice(0, 20).toUpperCase()}`
        : `BULK-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const results = [];
      let sent = 0;
      let failed = 0;
      let queued = 0;
      let skipped = 0;

      for (const recipient of recipients) {
        if (!(await ContactConsentService.hasConsent(recipient.phone))) {
          skipped++;
          results.push({ phone: recipient.phone, status: 'skipped', reason: 'consent_required' });
          continue;
        }

        const vars = recipient.variables || {};
        const renderedContent = template.render(vars, language || template.language);
        const recipientKey = normalizedKey
          ? `${createHash('sha256').update(normalizedKey).digest('hex').slice(0, 24)}:${createHash('sha256').update(String(recipient.phone).replace(/\D/g, '')).digest('hex').slice(0, 32)}`
          : null;

        if (recipientKey) {
          const existing = await CommunicationLog.findOne({ idempotencyKey: recipientKey });
          if (existing) {
            results.push({ phone: recipient.phone, status: existing.status, logId: existing.logId, duplicate: true });
            if (existing.status === 'sent' || existing.status === 'delivered' || existing.status === 'read') sent++;
            else if (existing.status === 'failed') failed++;
            else queued++;
            continue;
          }
        }

        const log = new CommunicationLog({
          logId: CommunicationLog.generateLogId(),
          templateId: template.templateId,
          templateName: template.name,
          bulkId,
          sentBy,
          sentFrom,
          recipientId: recipient.id,
          recipientPhone: recipient.phone,
          recipientName: recipient.name,
          recipientType: recipient.type || 'unknown',
          content: renderedContent,
          language: language || template.language,
          variablesUsed: vars,
          status: 'queued',
          context,
          priority: 'normal',
          idempotencyKey: recipientKey
        });

        const saved = await CommunicationService._saveMessageLog(log);
        if (saved.duplicate) {
          results.push({ phone: recipient.phone, status: saved.log.status, logId: saved.log.logId, duplicate: true });
          continue;
        }

        if (sendFn) {
          try {
            await sendFn(recipient.phone, renderedContent);
            await log.markSent();
            sent++;
            results.push({ phone: recipient.phone, status: 'sent', logId: log.logId });
          } catch (sendError) {
            await log.markFailed(sendError.message, 'BULK_SEND_FAILED');
            failed++;
            results.push({ phone: recipient.phone, status: 'failed', error: sendError.message, logId: log.logId });
          }

          // Rate limiting delay
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } else {
          queued++;
          results.push({ phone: recipient.phone, status: 'queued', logId: log.logId });
        }
      }

      // Update template usage
      template.usage.totalSent += sent;
      template.usage.totalFailed += failed;
      template.usage.lastUsedAt = new Date();
      await template.save();

      return {
        success: true,
        bulkId,
        stats: {
          total: recipients.length,
          sent,
          failed,
          queued,
          skipped,
          deliveryRate: recipients.length > 0 ? ((sent / recipients.length) * 100).toFixed(1) : '0.0'
        },
        results,
        message: `Bulk send complete: ${sent} sent, ${failed} failed, ${queued} queued`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async scheduleMessage(options) {
    try {
      const { scheduledFor, ...sendOptions } = options;

      if (!scheduledFor) {
        return { success: false, error: 'scheduledFor date is required' };
      }

      const scheduleDate = new Date(scheduledFor);
      if (scheduleDate <= new Date()) {
        return { success: false, error: 'scheduledFor must be in the future' };
      }

      // Create without sending; scheduledFor is stored atomically so the queue worker never sends it early.
      const result = await CommunicationService.sendTemplateMessage({
        ...sendOptions,
        scheduledFor: scheduleDate,
        sendFn: null
      });

      if (result.success && result.log) {
        if (result.duplicate) return result;
        return {
          success: true,
          log: result.log,
          message: `Message scheduled for ${scheduleDate.toISOString()}`
        };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDueScheduledMessages(limit = 50) {
    try {
      const now = new Date();
      const messages = await CommunicationLog.find({
        status: 'queued',
        scheduledFor: { $lte: now }
      })
        .sort({ priority: -1, scheduledFor: 1 })
        .limit(limit);

      return {
        success: true,
        messages: messages.map(m => m.toObject()),
        count: messages.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getRecipientHistory(recipientPhone, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;
      const filter = { recipientPhone };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;
      const logs = await CommunicationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await CommunicationLog.countDocuments(filter);

      return {
        success: true,
        logs: logs.map(l => l.toObject()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDeliveryStats(filter = {}) {
    try {
      const stats = await CommunicationLog.getDeliveryStats(filter);
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getBulkStatus(bulkId) {
    try {
      const stats = await CommunicationLog.getBulkStatus(bulkId);
      const logs = await CommunicationLog.find({ bulkId }).sort({ createdAt: 1 });

      return {
        success: true,
        bulkId,
        stats,
        messages: logs.map(l => ({
          logId: l.logId,
          recipientPhone: l.recipientPhone,
          recipientName: l.recipientName,
          status: l.status,
          sentAt: l.sentAt,
          deliveredAt: l.deliveredAt,
          errorMessage: l.errorMessage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
