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


export const methodsPart1 = {
  _model(name) {
    try { return mongoose.model(name); } catch { return null; }
  },

  async createRule(data) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'NotificationRule model not available' };

      const rule = new Rule(data);
      await rule.save();
      return { success: true, rule, ruleId: rule.ruleId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getRule(id) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rule = await Rule.findOne({
        $or: [
          { ruleId: id },
          ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
        ]
      });

      if (!rule) return { success: false, error: 'Rule not found' };
      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async listRules(filters = {}) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const query = {};
      if (filters.active !== undefined) query.active = filters.active;
      if (filters.triggerType) query['trigger.type'] = filters.triggerType;
      if (filters.priority) query.priority = filters.priority;

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));

      const [rules, total] = await Promise.all([
        Rule.find(query).sort({ priority: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Rule.countDocuments(query)
      ]);

      return { success: true, rules, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateRule(id, updates) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rule = await Rule.findOne({
        $or: [{ ruleId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });
      if (!rule) return { success: false, error: 'Rule not found' };

      // Prevent changing ruleId
      delete updates.ruleId;
      Object.assign(rule, updates);
      await rule.save();
      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteRule(id) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const result = await Rule.findOneAndDelete({
        $or: [{ ruleId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });

      if (!result) return { success: false, error: 'Rule not found' };
      return { success: true, deleted: result.ruleId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async toggleRule(id) {
    try {
      const res = await this.getRule(id);
      if (!res.success) return res;

      res.rule.active = !res.rule.active;
      await res.rule.save();
      return { success: true, rule: res.rule, active: res.rule.active };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createNotification(data) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Notification model not available' };

      // Build dedup key if not supplied
      if (!data.deduplicationKey && data.ruleId && data.entityId) {
        const today = new Date().toISOString().split('T')[0];
        data.deduplicationKey = `${data.ruleId}-${data.entityId}-${today}`;
      }

      // Check dedup
      if (data.deduplicationKey) {
        const exists = await Notif.findOne({ deduplicationKey: data.deduplicationKey });
        if (exists) {
          return { success: true, notification: exists, deduplicated: true, message: 'Already exists' };
        }
      }

      const notification = new Notif(data);
      await notification.save();

      // Log creation
      await this._log(notification._id, notification.ruleId, 'created', {
        channel: notification.channel,
        recipientPhone: notification.recipient?.phone
      });

      return { success: true, notification, notificationId: notification.notificationId };
    } catch (error) {
      if (error.code === 11000) {
        return { success: true, deduplicated: true, message: 'Duplicate notification prevented' };
      }
      return { success: false, error: error.message };
    }
  },

  async getNotification(id) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const notification = await Notif.findOne({
        $or: [{ notificationId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });

      if (!notification) return { success: false, error: 'Notification not found' };
      return { success: true, notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async listNotifications(filters = {}) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.triggerType) query.triggerType = filters.triggerType;
      if (filters.recipientPhone) query['recipient.phone'] = filters.recipientPhone;
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.entityId) query.entityId = filters.entityId;
      if (filters.priority) query.priority = filters.priority;
      if (filters.channel) query.channel = filters.channel;

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));

      const [notifications, total] = await Promise.all([
        Notif.find(query).sort({ priority: 1, scheduledFor: -1 }).skip((page - 1) * limit).limit(limit),
        Notif.countDocuments(query)
      ]);

      return { success: true, notifications, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelNotification(id, reason) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      if (['sent', 'delivered', 'read', 'acknowledged'].includes(res.notification.status)) {
        return { success: false, error: `Cannot cancel notification in ${res.notification.status} status` };
      }

      res.notification.status = 'cancelled';
      res.notification.metadata = { ...res.notification.metadata, cancelReason: reason };
      await res.notification.save();

      await this._log(res.notification._id, res.notification.ruleId, 'cancelled', { reason });

      return { success: true, notification: res.notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async acknowledgeNotification(id) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      await res.notification.acknowledge();
      await this._log(res.notification._id, res.notification.ruleId, 'acknowledged', {
        channel: res.notification.channel
      });

      return { success: true, notification: res.notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async snoozeNotification(id, hours = 4) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      await res.notification.snooze(hours);
      await this._log(res.notification._id, res.notification.ruleId, 'snoozed', {
        snoozedUntil: res.notification.snoozedUntil, hours
      });

      return { success: true, notification: res.notification, snoozedUntil: res.notification.snoozedUntil };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
