// @ts-nocheck
/**
 * ========================================================================
 * AUTOMATED NOTIFICATION SERVICE
 * Phase 5: Feature 5 – Automated Notifications System
 * ========================================================================
 *
 * Enterprise-grade notification engine that:
 *   • Scans data sources for trigger conditions (lease expiry, payment due, etc.)
 *   • Evaluates rules against current state
 *   • Generates and queues notifications with deduplication
 *   • Delivers via WhatsApp (primary), SMS, email, in-app
 *   • Manages snooze, acknowledge, escalation, and retries
 *   • Provides analytics on delivery success and engagement
 *
 * Integrates with:
 *   • PropertyTenancy — lease/cheque alerts
 *   • Invoice/InvoicePayment — payment reminders
 *   • CommissionRule/CalculationRecord — commission alerts
 *   • CommunicationTemplate — message templates
 *   • PortfolioAnalyticsService — portfolio threshold alerts
 *
 * @module NotificationService
 * @since Phase 5 Feature 5 – February 2026
 */

import mongoose from 'mongoose';


export const methodsPart4 = {
  async getStats() {
    try {
      const Notif = this._model('Notification');
      const Rule = this._model('NotificationRule');
      const Log = this._model('NotificationLog');
      if (!Notif || !Rule) return { success: false, error: 'Model not available' };

      const [statusCounts, triggerCounts, channelCounts, ruleCount, totalNotifs, recentFailed] = await Promise.all([
        Notif.countByStatus(),
        Notif.aggregate([{ $group: { _id: '$triggerType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Notif.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Rule ? Rule.countDocuments({ active: true }) : 0,
        Notif.countDocuments(),
        Notif.countDocuments({ status: 'failed' })
      ]);

      const totalLogs = Log ? await Log.countDocuments() : 0;

      const byStatus = {};
      statusCounts.forEach(s => { byStatus[s._id] = s.count; });

      const byTrigger = {};
      triggerCounts.forEach(t => { byTrigger[t._id] = t.count; });

      const byChannel = {};
      channelCounts.forEach(c => { byChannel[c._id] = c.count; });

      const deliveryRate = totalNotifs > 0
        ? Math.round(((byStatus.sent || 0) + (byStatus.delivered || 0) + (byStatus.read || 0) + (byStatus.acknowledged || 0)) / totalNotifs * 100)
        : 0;

      return {
        success: true,
        stats: {
          totalNotifications: totalNotifs,
          activeRules: ruleCount,
          totalLogs: totalLogs,
          byStatus,
          byTrigger,
          byChannel,
          deliveryRate,
          failed: recentFailed,
          pending: byStatus.pending || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDeliveryReport(startDate, endDate) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const [sentCount, deliveredCount, failedCount, acknowledgedCount, escalatedCount, daily] = await Promise.all([
        Notif.countDocuments({ status: { $in: ['sent', 'delivered', 'read', 'acknowledged'] }, sentAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: { $in: ['delivered', 'read', 'acknowledged'] }, deliveredAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: 'failed', createdAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: 'acknowledged', acknowledgedAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ escalated: true, escalatedAt: { $gte: start, $lte: end } }),
        Notif.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read', 'acknowledged']] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }},
          { $sort: { _id: 1 } }
        ])
      ]);

      return {
        success: true,
        report: {
          period: { start, end },
          sent: sentCount,
          delivered: deliveredCount,
          failed: failedCount,
          acknowledged: acknowledgedCount,
          escalated: escalatedCount,
          deliveryRate: sentCount > 0 ? Math.round(deliveredCount / sentCount * 100) : 0,
          acknowledgeRate: sentCount > 0 ? Math.round(acknowledgedCount / sentCount * 100) : 0,
          daily
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getRecipientHistory(phone, options = {}) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const limit = options.limit || 50;
      const notifications = await Notif.findByRecipient(phone, { limit, ...options });

      const stats = {
        total: notifications.length,
        sent: notifications.filter(n => ['sent', 'delivered', 'read', 'acknowledged'].includes(n.status)).length,
        pending: notifications.filter(n => n.status === 'pending').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        acknowledged: notifications.filter(n => n.status === 'acknowledged').length
      };

      return { success: true, notifications, stats, phone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getRulePerformance() {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rules = await Rule.find({ active: true }).sort({ 'stats.totalSent': -1 });

      const performance = rules.map(r => ({
        ruleId: r.ruleId,
        name: r.name,
        triggerType: r.trigger?.type,
        priority: r.priority,
        totalSent: r.stats?.totalSent || 0,
        totalDelivered: r.stats?.totalDelivered || 0,
        totalFailed: r.stats?.totalFailed || 0,
        deliveryRate: r.deliveryRate,
        lastTriggered: r.stats?.lastTriggered,
        lastDelivered: r.stats?.lastDelivered
      }));

      return { success: true, performance, totalRules: rules.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getQuickStats() {
    try {
      const statsResult = await this.getStats();
      if (!statsResult.success) return '❌ Could not load notification stats';

      const s = statsResult.stats;

      return `📬 Notification Stats\n`
        + `━━━━━━━━━━━━━━━━━━━\n`
        + `📊 Total: ${s.totalNotifications}\n`
        + `📤 Pending: ${s.pending}\n`
        + `❌ Failed: ${s.failed}\n`
        + `📈 Delivery Rate: ${s.deliveryRate}%\n`
        + `📋 Active Rules: ${s.activeRules}\n`
        + `━━━━━━━━━━━━━━━━━━━\n`
        + `📌 By Type:\n`
        + Object.entries(s.byTrigger || {}).map(([k, v]) => `  • ${k}: ${v}`).join('\n')
        + `\n━━━━━━━━━━━━━━━━━━━\n`
        + `📡 By Channel:\n`
        + Object.entries(s.byChannel || {}).map(([k, v]) => `  • ${k}: ${v}`).join('\n');
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  },

  async seedDefaultRules() {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const defaults = [
        {
          name: 'Lease Expiry — 30 Day Warning',
          trigger: { type: 'lease_expiry', daysBeforeEvent: 30 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 720 },
          messageTemplate: '⚠️ Dear {{tenantName}}, your lease expires in {{daysLeft}} days ({{expiryDate}}). Please contact us for renewal.'
        },
        {
          name: 'Lease Expiry — 7 Day Urgent',
          trigger: { type: 'lease_expiry', daysBeforeEvent: 7 },
          recipients: { target: 'tenant', escalation: { enabled: true, escalateAfterHours: 48, escalateTo: 'manager' } },
          channels: ['whatsapp'],
          priority: 'high',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 },
          messageTemplate: '🚨 Dear {{tenantName}}, your lease expires in {{daysLeft}} days! Urgent renewal needed.'
        },
        {
          name: 'Payment Due — 7 Day Reminder',
          trigger: { type: 'payment_due', daysBeforeEvent: 7 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 }
        },
        {
          name: 'Payment Overdue Alert',
          trigger: { type: 'payment_overdue', daysBeforeEvent: 0 },
          recipients: { target: 'tenant', escalation: { enabled: true, escalateAfterHours: 72, escalateTo: 'landlord' } },
          channels: ['whatsapp'],
          priority: 'critical',
          frequency: { type: 'daily', maxSendsPerEntity: 5, cooldownHours: 24 }
        },
        {
          name: 'Cheque Due — 7 Day Reminder',
          trigger: { type: 'cheque_due', daysBeforeEvent: 7 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 }
        },
        {
          name: 'Commission Pending Approval',
          trigger: { type: 'commission_pending', daysBeforeEvent: 0 },
          recipients: { target: 'manager' },
          channels: ['whatsapp'],
          priority: 'high',
          frequency: { type: 'once', maxSendsPerEntity: 2, cooldownHours: 24 }
        }
      ];

      let created = 0;
      let skipped = 0;

      for (const def of defaults) {
        const exists = await Rule.findOne({ name: def.name });
        if (exists) {
          skipped++;
          continue;
        }
        await Rule.create(def);
        created++;
      }

      return { success: true, created, skipped, total: defaults.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
