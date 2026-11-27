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


export const methodsPart2 = {
  async sendNotification(id) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      const notif = res.notification;
      if (!['pending', 'scheduled'].includes(notif.status) && notif.status !== 'snoozed') {
        return { success: false, error: `Cannot send notification in ${notif.status} status` };
      }

      // Mark as sending
      notif.status = 'sending';
      await notif.save();

      const startTime = Date.now();

      try {
        // Simulate channel delivery
        const delivered = await this._deliverViaChannel(notif);

        if (delivered) {
          await notif.markSent();
          await this._log(notif._id, notif.ruleId, 'sent', {
            channel: notif.channel,
            recipientPhone: notif.recipient?.phone,
            deliveryTime: Date.now() - startTime,
            success: true
          });

          // Update rule stats
          await this._updateRuleStats(notif.ruleId, 'sent');

          return { success: true, notification: notif, delivered: true };
        } else {
          await notif.markFailed('Delivery failed');
          await this._log(notif._id, notif.ruleId, 'failed', {
            channel: notif.channel,
            error: 'Delivery failed',
            success: false
          });
          return { success: true, notification: notif, delivered: false };
        }
      } catch (sendError) {
        await notif.markFailed(sendError.message);
        await this._log(notif._id, notif.ruleId, 'failed', {
          error: sendError.message, success: false
        });
        return { success: false, error: sendError.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async processPending(limit = 50) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const pending = await Notif.findPending(limit);

      const results = { sent: 0, failed: 0, skipped: 0, total: pending.length };

      for (const notif of pending) {
        // Check quiet hours
        if (this._isQuietHours()) {
          results.skipped++;
          continue;
        }

        const sendResult = await this.sendNotification(notif.notificationId);
        if (sendResult.success && sendResult.delivered) {
          results.sent++;
        } else {
          results.failed++;
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async retryFailed() {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const failed = await Notif.find({
        status: 'failed',
        retryCount: { $lt: 3 },
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: new Date() } }
        ]
      }).limit(50);

      const results = { retried: 0, stillFailed: 0, total: failed.length };

      for (const notif of failed) {
        await notif.scheduleRetry(30);
        const sendResult = await this.sendNotification(notif.notificationId);
        if (sendResult.success && sendResult.delivered) {
          results.retried++;
        } else {
          results.stillFailed++;
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async runAllScanners() {
    try {
      const results = {
        leaseExpiry: await this.scanLeaseExpiry(),
        paymentDue: await this.scanPaymentDue(),
        chequeDue: await this.scanChequeDue(),
        commissionPending: await this.scanCommissionPending(),
        overdueInvoices: await this.scanOverdueInvoices()
      };

      const totalGenerated = Object.values(results).reduce((sum, r) =>
        sum + (r.success ? (r.generated || 0) : 0), 0);

      return { success: true, results, totalGenerated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async scanLeaseExpiry() {
    try {
      const Tenancy = this._model('PropertyTenancy');
      const Rule = this._model('NotificationRule');
      if (!Tenancy || !Rule) return { success: false, error: 'Required models not available' };

      // Get active rules for lease expiry
      const rules = await Rule.findByTrigger('lease_expiry');
      if (!rules.length) return { success: true, generated: 0, message: 'No active lease_expiry rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 30;
        const expiring = await Tenancy.findUpcomingExpirations(days);

        for (const tenancy of expiring) {
          const expiryDate = tenancy.contractExpiryDate;
          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          const phone = tenancy.tenantPhone || tenancy.contactNumber;

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'lease_expiry',
            entityType: 'tenancy',
            entityId: tenancy._id?.toString(),
            entityRef: tenancy._id,
            recipient: {
              phone: phone,
              name: tenancy.tenantName,
              role: rule.recipients?.target || 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: daysLeft <= 7 ? 'high' : (daysLeft <= 15 ? 'medium' : 'low'),
            subject: `Lease Expiry Alert — ${daysLeft} days remaining`,
            message: rule.messageTemplate
              ? rule.messageTemplate
                  .replace('{{tenantName}}', tenancy.tenantName || 'Tenant')
                  .replace('{{daysLeft}}', daysLeft)
                  .replace('{{expiryDate}}', expiryDate.toLocaleDateString())
                  .replace('{{propertyId}}', tenancy.propertyId || 'N/A')
              : `⚠️ Lease Expiry Reminder\n\nDear ${tenancy.tenantName || 'Tenant'},\nYour lease expires in ${daysLeft} days (${expiryDate.toLocaleDateString()}).\nPlease contact your property manager for renewal.\n\n— Linda Property Bot`,
            messageData: { daysLeft, expiryDate, tenantName: tenancy.tenantName, propertyId: tenancy.propertyId },
            metadata: { source: 'lease_expiry_scanner', tenancyId: tenancy._id?.toString() }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async scanPaymentDue() {
    try {
      const Invoice = this._model('Invoice');
      const Rule = this._model('NotificationRule');
      if (!Invoice || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('payment_due');
      if (!rules.length) return { success: true, generated: 0, message: 'No active payment_due rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 7;
        const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const invoices = await Invoice.find({
          status: { $in: ['draft', 'sent', 'partially_paid'] },
          dueDate: { $lte: futureDate, $gte: new Date() }
        }).limit(200);

        for (const inv of invoices) {
          const daysLeft = Math.ceil((inv.dueDate - new Date()) / (1000 * 60 * 60 * 24));

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'payment_due',
            entityType: 'invoice',
            entityId: inv.invoiceNumber || inv._id?.toString(),
            entityRef: inv._id,
            recipient: {
              phone: inv.tenantPhone || inv.tenantId,
              name: inv.tenantName,
              role: 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: daysLeft <= 3 ? 'high' : 'medium',
            subject: `Payment Due — ${inv.invoiceNumber}`,
            message: `💰 Payment Reminder\n\nInvoice: ${inv.invoiceNumber}\nAmount: AED ${(inv.balanceDue || inv.totalAmount || 0).toLocaleString()}\nDue: ${inv.dueDate.toLocaleDateString()} (${daysLeft} days)\n\nPlease arrange payment to avoid late fees.\n\n— Linda Property Bot`,
            messageData: { invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue || inv.totalAmount, daysLeft },
            metadata: { source: 'payment_due_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
