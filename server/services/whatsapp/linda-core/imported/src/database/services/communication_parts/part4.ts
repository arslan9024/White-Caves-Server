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


export const methodsPart4 = {
  async getTemplateAnalytics(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      const stats = await CommunicationLog.getDeliveryStats({ templateId });

      // Daily usage for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyUsage = await CommunicationLog.aggregate([
        { $match: { templateId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        success: true,
        template: {
          templateId: template.templateId,
          name: template.name,
          category: template.category,
          status: template.status,
          usage: template.usage,
          deliveryRate: template.deliveryRate,
          version: template.version
        },
        deliveryStats: stats,
        dailyUsage,
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDashboard() {
    try {
      const [
        totalTemplates,
        activeTemplates,
        overallStats,
        topTemplates,
        recentMessages
      ] = await Promise.all([
        CommunicationTemplate.countDocuments(),
        CommunicationTemplate.countDocuments({ status: 'active' }),
        CommunicationLog.getDeliveryStats(),
        CommunicationTemplate.findMostUsed(5),
        CommunicationLog.find().sort({ createdAt: -1 }).limit(10)
      ]);

      return {
        success: true,
        dashboard: {
          templates: {
            total: totalTemplates,
            active: activeTemplates
          },
          messages: overallStats,
          topTemplates: topTemplates.map(t => ({
            templateId: t.templateId,
            name: t.name,
            category: t.category,
            totalSent: t.usage.totalSent,
            deliveryRate: t.deliveryRate
          })),
          recentMessages: recentMessages.map(m => ({
            logId: m.logId,
            recipientPhone: m.recipientPhone,
            templateName: m.templateName,
            status: m.status,
            createdAt: m.createdAt
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async retryFailedMessages(sendFn, limit = 20) {
    try {
      const failedMessages = await CommunicationLog.getFailedMessages(limit);

      const results = [];
      let retried = 0;
      let queued = 0;
      let stillFailed = 0;

      for (const msg of failedMessages) {
        try {
          if (!(await ContactConsentService.hasConsent(msg.recipientPhone))) {
            results.push({ logId: msg.logId, status: 'skipped_no_consent' });
            continue;
          }
          await msg.retry();
          if (sendFn) {
            await sendFn(msg.recipientPhone, msg.content);
            await msg.markSent();
            retried++;
            results.push({ logId: msg.logId, status: 'retried_successfully' });
          } else {
            queued++;
            results.push({ logId: msg.logId, status: 'queued_for_retry' });
          }
        } catch (retryError) {
          await msg.markFailed(retryError.message, 'RETRY_FAILED');
          stillFailed++;
          results.push({ logId: msg.logId, status: 'retry_failed', error: retryError.message });
        }
      }

      return {
        success: true,
        stats: { retried, queued, stillFailed, total: failedMessages.length },
        results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async processQueue(sendFn, limit = 50, delayMs = 1000) {
    try {
      if (typeof sendFn !== 'function') {
        return { success: false, error: 'A send function is required to process queued messages.' };
      }
      const candidates = await CommunicationLog.getQueuedMessages(limit);

      let sent = 0;
      let failed = 0;
      let skipped = 0;
      let deferred = 0;

      for (const candidate of candidates) {
        const msg = await CommunicationLog.findOneAndUpdate(
          { _id: candidate._id, status: 'queued' },
          { $set: { status: 'sending' } },
          { new: true }
        );
        if (!msg) continue;

        try {
          if (!(await ContactConsentService.hasConsent(msg.recipientPhone))) {
            msg.status = 'cancelled';
            msg.errorMessage = 'Recipient consent is absent or revoked.';
            await msg.save();
            skipped++;
            continue;
          }

          await sendFn(msg.recipientPhone, msg.content, msg);
          await msg.markSent();
          sent++;

          // Update template stats if applicable
          if (msg.templateId) {
            await CommunicationTemplate.findOneAndUpdate(
              { templateId: msg.templateId },
              {
                $inc: { 'usage.totalSent': 1 },
                $set: { 'usage.lastUsedAt': new Date() }
              }
            );
          }

          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (sendError) {
          // Nothing was sent: the new-conversation budget holds the message for later.
          if (sendError.code === 'DEFERRED') {
            msg.status = 'queued';
            msg.scheduledFor = sendError.deferUntil;
            msg.errorMessage = sendError.message;
            await msg.save();
            deferred++;
            continue;
          }
          if (sendError.code === 'NEW_CONVERSATION_LIMIT') {
            msg.status = 'cancelled';
            msg.errorCode = sendError.code;
            msg.errorMessage = sendError.message;
            await msg.save();
            skipped++;
            continue;
          }
          await msg.markFailed(sendError.message, sendError.code || 'QUEUE_SEND_FAILED');
          failed++;

          if (msg.templateId) {
            await CommunicationTemplate.findOneAndUpdate(
              { templateId: msg.templateId },
              { $inc: { 'usage.totalFailed': 1 } }
            );
          }
        }
      }

      return {
        success: true,
        stats: { processed: candidates.length, sent, failed, skipped, deferred },
        message: `Queue processed: ${sent} sent, ${failed} failed, ${skipped} skipped, ${deferred} deferred out of ${candidates.length}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async expireStaleQueued(maxAgeMs, now = new Date()) {
    const cutoff = new Date(now.getTime() - maxAgeMs);
    const result = await CommunicationLog.updateMany(
      {
        status: 'queued',
        $or: [
          { scheduledFor: null, queuedAt: { $lt: cutoff } },
          { scheduledFor: { $lt: cutoff } }
        ]
      },
      {
        $set: {
          status: 'cancelled',
          errorCode: 'EXPIRED',
          errorMessage: 'Expired in the queue before the master account could send it.'
        }
      }
    );
    return result.modifiedCount || 0;
  },

  detectVariables(content) {
    const regex = /\{(\w+)\}/g;
    const variables = [];
    const seen = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (!seen.has(name)) {
        seen.add(name);
        variables.push({
          name,
          displayName: name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
          required: true,
          example: ''
        });
      }
    }

    return variables;
  }
};
