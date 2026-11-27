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


export const methodsPart3 = {
  async scanChequeDue() {
    try {
      const Tenancy = this._model('PropertyTenancy');
      const Rule = this._model('NotificationRule');
      if (!Tenancy || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('cheque_due');
      if (!rules.length) return { success: true, generated: 0, message: 'No active cheque_due rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 7;
        const cheques = await Tenancy.findUpcomingCheques(days);

        for (const tenancy of cheques) {
          const upcomingCheques = (tenancy.paymentSchedule?.cheques || []).filter(c => {
            if (c.isPaid) return false;
            const due = new Date(c.chequeDueDate);
            return due >= new Date() && due <= new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          });

          for (const cheque of upcomingCheques) {
            const daysLeft = Math.ceil((new Date(cheque.chequeDueDate) - new Date()) / (1000 * 60 * 60 * 24));

            const result = await this.createNotification({
              ruleId: rule._id,
              ruleName: rule.name,
              triggerType: 'cheque_due',
              entityType: 'tenancy',
              entityId: `${tenancy._id}-cheque-${cheque.chequeNumber || 'unknown'}`,
              recipient: {
                phone: tenancy.tenantPhone || tenancy.contactNumber,
                name: tenancy.tenantName,
                role: 'tenant'
              },
              channel: rule.channels?.[0] || 'whatsapp',
              priority: daysLeft <= 3 ? 'high' : 'medium',
              subject: `Cheque Due — ${daysLeft} days`,
              message: `🏦 Cheque Reminder\n\nCheque #${cheque.chequeNumber || 'N/A'}\nAmount: AED ${(cheque.amount || 0).toLocaleString()}\nDue: ${new Date(cheque.chequeDueDate).toLocaleDateString()}\n\nPlease ensure funds are available.\n\n— Linda Property Bot`,
              messageData: { chequeNumber: cheque.chequeNumber, amount: cheque.amount, daysLeft },
              metadata: { source: 'cheque_due_scanner' }
            });

            if (result.success && !result.deduplicated) generated++;
          }
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async scanOverdueInvoices() {
    try {
      const Invoice = this._model('Invoice');
      const Rule = this._model('NotificationRule');
      if (!Invoice || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('payment_overdue');
      if (!rules.length) return { success: true, generated: 0, message: 'No active payment_overdue rules' };

      let generated = 0;

      for (const rule of rules) {
        const overdue = await Invoice.find({
          status: { $in: ['sent', 'partially_paid', 'overdue'] },
          dueDate: { $lt: new Date() }
        }).limit(200);

        for (const inv of overdue) {
          const daysOverdue = Math.ceil((new Date() - inv.dueDate) / (1000 * 60 * 60 * 24));

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'payment_overdue',
            entityType: 'invoice',
            entityId: inv.invoiceNumber || inv._id?.toString(),
            entityRef: inv._id,
            recipient: {
              phone: inv.tenantPhone || inv.tenantId,
              name: inv.tenantName,
              role: 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: 'critical',
            subject: `OVERDUE — ${inv.invoiceNumber}`,
            message: `🚨 OVERDUE Payment\n\nInvoice: ${inv.invoiceNumber}\nAmount Due: AED ${(inv.balanceDue || inv.totalAmount || 0).toLocaleString()}\nOverdue by: ${daysOverdue} days\n\nImmediate payment required to avoid penalties.\n\n— Linda Property Bot`,
            messageData: { invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue || inv.totalAmount, daysOverdue },
            metadata: { source: 'overdue_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async scanCommissionPending() {
    try {
      const CalcRecord = this._model('CalculationRecord');
      const Rule = this._model('NotificationRule');
      if (!CalcRecord || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('commission_pending');
      if (!rules.length) return { success: true, generated: 0, message: 'No active commission_pending rules' };

      let generated = 0;

      for (const rule of rules) {
        const pending = await CalcRecord.find({ status: 'pending_approval' }).limit(100);

        for (const record of pending) {
          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'commission_pending',
            entityType: 'commission',
            entityId: record.calculationId || record._id?.toString(),
            entityRef: record._id,
            recipient: {
              phone: rule.recipients?.customPhones?.[0],
              role: rule.recipients?.target || 'manager'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: 'high',
            subject: `Commission Approval Needed`,
            message: `📋 Commission Pending Approval\n\nAgent: ${record.agentPhone || 'N/A'}\nAmount: AED ${(record.commissionAmount || 0).toLocaleString()}\nDeal: ${record.dealId || 'N/A'}\n\nPlease review and approve/reject.\n\n— Linda Property Bot`,
            messageData: { agentPhone: record.agentPhone, amount: record.commissionAmount },
            metadata: { source: 'commission_pending_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async processEscalations() {
    try {
      const Notif = this._model('Notification');
      const Rule = this._model('NotificationRule');
      if (!Notif || !Rule) return { success: false, error: 'Model not available' };

      // Find sent notifications that haven't been acknowledged and have escalation rules
      const escalatableNotifs = await Notif.find({
        status: { $in: ['sent', 'delivered'] },
        escalated: false,
        ruleId: { $exists: true }
      }).populate('ruleId').limit(100);

      let escalated = 0;

      for (const notif of escalatableNotifs) {
        const rule = notif.ruleId;
        if (!rule?.recipients?.escalation?.enabled) continue;

        const hoursSinceSent = (Date.now() - notif.sentAt) / (1000 * 60 * 60);
        if (hoursSinceSent < (rule.recipients.escalation.escalateAfterHours || 24)) continue;

        // Create escalation notification
        const escalateResult = await this.createNotification({
          ruleId: rule._id,
          ruleName: `[ESCALATION] ${rule.name}`,
          triggerType: notif.triggerType,
          entityType: notif.entityType,
          entityId: `ESC-${notif.entityId}`,
          recipient: {
            role: rule.recipients.escalation.escalateTo || 'manager'
          },
          channel: notif.channel,
          priority: 'critical',
          subject: `[ESCALATED] ${notif.subject}`,
          message: `🔺 ESCALATED NOTIFICATION\n\nOriginal notification was not acknowledged within ${rule.recipients.escalation.escalateAfterHours}h.\n\n${notif.message}`,
          parentNotificationId: notif.notificationId,
          metadata: { source: 'escalation_engine', originalNotificationId: notif.notificationId }
        });

        if (escalateResult.success && !escalateResult.deduplicated) {
          notif.escalated = true;
          notif.escalatedAt = new Date();
          notif.escalatedTo = rule.recipients.escalation.escalateTo;
          notif.status = 'escalated';
          await notif.save();
          escalated++;

          await this._log(notif._id, rule._id, 'escalated', {
            escalatedTo: rule.recipients.escalation.escalateTo
          });
        }
      }

      return { success: true, escalated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async suppressForRecipient(phone, triggerType, hours = 24) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const query = {
        'recipient.phone': phone,
        triggerType,
        status: { $in: ['pending', 'scheduled'] }
      };

      const result = await Notif.updateMany(query, {
        $set: { status: 'suppressed', metadata: { suppressedUntil: new Date(Date.now() + hours * 60 * 60 * 1000) } }
      });

      return { success: true, suppressed: result.modifiedCount, phone, triggerType, hours };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
