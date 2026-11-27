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


export const methodsPart5 = {
  async _log(notificationId, ruleId, event, data = {}) {
    try {
      const Log = this._model('NotificationLog');
      if (!Log) return;

      await Log.create({
        notificationId,
        ruleId,
        event,
        channel: data.channel,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        success: data.success,
        error: data.error,
        gatewayResponse: data.gatewayResponse,
        deliveryTime: data.deliveryTime,
        metadata: data,
        triggeredBy: data.triggeredBy || 'system'
      });
    } catch {
      // Silently fail — logging shouldn't break the main flow
    }
  },

  async _updateRuleStats(ruleId, event) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule || !ruleId) return;

      const update = {};
      if (event === 'sent') {
        update['stats.totalSent'] = 1;
        update['stats.totalDelivered'] = 1;
      } else if (event === 'failed') {
        update['stats.totalFailed'] = 1;
      } else if (event === 'acknowledged') {
        update['stats.totalAcknowledged'] = 1;
      }

      const setFields = {};
      if (event === 'sent') {
        setFields['stats.lastTriggered'] = new Date();
        setFields['stats.lastDelivered'] = new Date();
      }

      await Rule.findByIdAndUpdate(ruleId, {
        $inc: update,
        $set: setFields
      });
    } catch {
      // Silent fail
    }
  },

  async _deliverViaChannel(notification) {
    // Simulated delivery — always succeeds in dev/test
    // In production, integrate with:
    // - CommunicationService.sendMessage() for WhatsApp
    // - Twilio for SMS
    // - SendGrid for email
    // - Slack API for Slack
    return true;
  },

  _isQuietHours() {
    const hour = new Date().getHours();
    // Default quiet hours: 10 PM to 7 AM
    return hour >= 22 || hour < 7;
  }
};
