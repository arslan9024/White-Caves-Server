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


export const methodsPart2 = {
  static async sendTemplateMessage(options) {
    try {
      const {
        templateId,
        recipientPhone,
        recipientId,
        recipientName,
        recipientType,
        variables = {},
        sentBy,
        sentFrom,
        language,
        context = {},
        priority = 'normal',
        sendFn,
        idempotencyKey,
        scheduledFor
      } = options;

      const normalizedKey = CommunicationService._validateIdempotencyKey(idempotencyKey);
      if (normalizedKey) await CommunicationService._ensureIdempotencyIndex();
      if (!(await ContactConsentService.hasConsent(recipientPhone))) {
        return { success: false, error: 'Recipient consent is required before messaging.' };
      }

      if (normalizedKey) {
        const existing = await CommunicationLog.findOne({ idempotencyKey: normalizedKey });
        if (existing) {
          return { success: existing.status !== 'failed', duplicate: true, log: existing.toObject(), message: 'Request already processed.' };
        }
      }

      // 1. Load template
      const template = await CommunicationTemplate.findOne({ templateId, status: 'active' });
      if (!template) {
        return { success: false, error: `Active template ${templateId} not found` };
      }

      // 2. Validate variables
      const validation = template.validateVariables(variables);
      if (!validation.valid) {
        return {
          success: false,
          error: `Missing required variables: ${validation.missing.join(', ')}`
        };
      }

      // 3. Render message
      const renderedContent = template.render(variables, language || template.language);

      // 4. Create log entry
      const log = new CommunicationLog({
        logId: CommunicationLog.generateLogId(),
        templateId: template.templateId,
        templateName: template.name,
        sentBy,
        sentFrom,
        recipientId,
        recipientPhone,
        recipientName,
        recipientType: recipientType || 'unknown',
        content: renderedContent,
        language: language || template.language,
        variablesUsed: variables,
        status: 'queued',
        context,
        priority,
        idempotencyKey: normalizedKey,
        ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {})
      });

      const saved = await CommunicationService._saveMessageLog(log);
      if (saved.duplicate) {
        return { success: saved.log.status !== 'failed', duplicate: true, log: saved.log.toObject(), message: 'Request already processed.' };
      }

      // 5. Send message (if sendFn provided)
      if (sendFn) {
        try {
          await sendFn(recipientPhone, renderedContent);
          await log.markSent();

          // Update template usage
          template.usage.totalSent += 1;
          template.usage.lastUsedAt = new Date();
          await template.save();
        } catch (sendError) {
          await log.markFailed(sendError.message, 'SEND_FAILED');
          template.usage.totalFailed += 1;
          await template.save();

          return {
            success: false,
            error: `Message queued but send failed: ${sendError.message}`,
            log: log.toObject()
          };
        }
      }

      return {
        success: true,
        log: log.toObject(),
        renderedContent,
        message: sendFn ? 'Message sent successfully' : 'Message queued for sending'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async sendDirectMessage(options) {
    try {
      const {
        recipientPhone,
        recipientId,
        recipientName,
        recipientType,
        content,
        sentBy,
        sentFrom,
        language = 'en',
        context = {},
        priority = 'normal',
        sendFn,
        idempotencyKey
      } = options;

      if (!content || !recipientPhone) {
        return { success: false, error: 'Content and recipientPhone are required' };
      }

      const normalizedKey = CommunicationService._validateIdempotencyKey(idempotencyKey);
      if (normalizedKey) await CommunicationService._ensureIdempotencyIndex();
      if (!(await ContactConsentService.hasConsent(recipientPhone))) {
        return { success: false, error: 'Recipient consent is required before messaging.' };
      }
      if (normalizedKey) {
        const existing = await CommunicationLog.findOne({ idempotencyKey: normalizedKey });
        if (existing) {
          return { success: existing.status !== 'failed', duplicate: true, log: existing.toObject(), message: 'Request already processed.' };
        }
      }

      const log = new CommunicationLog({
        logId: CommunicationLog.generateLogId(),
        sentBy: sentBy || 'system',
        sentFrom,
        recipientId,
        recipientPhone,
        recipientName,
        recipientType: recipientType || 'unknown',
        content,
        language,
        status: 'queued',
        context,
        priority,
        idempotencyKey: normalizedKey
      });

      const saved = await CommunicationService._saveMessageLog(log);
      if (saved.duplicate) {
        return { success: saved.log.status !== 'failed', duplicate: true, log: saved.log.toObject(), message: 'Request already processed.' };
      }

      if (sendFn) {
        try {
          await sendFn(recipientPhone, content);
          await log.markSent();
        } catch (sendError) {
          await log.markFailed(sendError.message, 'SEND_FAILED');
        }
      }

      return {
        success: true,
        log: log.toObject(),
        message: sendFn ? 'Direct message sent' : 'Direct message queued'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
