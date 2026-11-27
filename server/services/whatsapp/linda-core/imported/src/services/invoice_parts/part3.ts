// @ts-nocheck
/**
 * ========================================================================
 * INVOICE & PAYMENT SERVICE
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * Enterprise-grade service layer for the full invoice-to-payment lifecycle:
 *
 *  1.  Invoice CRUD            — Create, read, update, cancel invoices
 *  2.  Auto-Invoice Generation — From PropertyTenancy cheque schedules
 *  3.  Payment Processing      — Gateway-agnostic (PayTabs, Stripe, cash …)
 *  4.  Receipt Generation      — WhatsApp, email, PDF-ready receipts
 *  5.  Reconciliation          — Auto & manual matching payments → invoices
 *  6.  Overdue Management      — Find overdue, send reminders
 *  7.  Reports                 — Revenue, outstanding, payment history
 *  8.  Recurring Invoices      — Monthly/quarterly auto-generation
 *  9.  Refunds                 — Full & partial refund processing
 * 10.  Quick Stats             — Bot-friendly text summary
 *
 * @module InvoicePaymentService
 * @since Phase 5 Feature 4 – February 2026
 */

import mongoose from 'mongoose';
import {
  Invoice,
  InvoicePayment,
  PaymentReceipt,
  ReconciliationLog
} from '../database/schemas/InvoiceSchema.js';


export const methodsPart3 = {
  async getOverdueInvoices() {
    try {
      const overdue = await Invoice.findOverdue();

      const summary = {
        count: overdue.length,
        totalOverdue: overdue.reduce((s, i) => s + i.balanceDue, 0),
        byDaysOverdue: {
          under7:   overdue.filter(i => (Date.now() - i.dueDate) / 86400000 < 7).length,
          days7to30: overdue.filter(i => {
            const d = (Date.now() - i.dueDate) / 86400000;
            return d >= 7 && d < 30;
          }).length,
          days30to90: overdue.filter(i => {
            const d = (Date.now() - i.dueDate) / 86400000;
            return d >= 30 && d < 90;
          }).length,
          over90: overdue.filter(i => (Date.now() - i.dueDate) / 86400000 >= 90).length
        }
      };

      return { success: true, overdue, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getUpcomingInvoices(daysAhead = 7) {
    try {
      const now   = new Date();
      const until = new Date(now.getTime() + daysAhead * 86400000);

      const upcoming = await Invoice.find({
        status: { $in: ['draft', 'sent', 'viewed'] },
        dueDate: { $gte: now, $lte: until }
      }).sort({ dueDate: 1 });

      return {
        success: true,
        upcoming,
        count: upcoming.length,
        totalDue: upcoming.reduce((s, i) => s + i.balanceDue, 0)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async processRecurringInvoices() {
    try {
      const now = new Date();
      const recurring = await Invoice.find({
        isRecurring: true,
        'recurringConfig.nextDate': { $lte: now },
        status: { $nin: ['cancelled', 'written_off'] }
      });

      const generated = [];

      for (const template of recurring) {
        const invoiceNumber = await Invoice.generateInvoiceNumber();
        const newDueDate = this._calcNextDate(template.recurringConfig.frequency, now);

        const inv = new Invoice({
          invoiceNumber,
          tenantPhone:  template.tenantPhone,
          tenantName:   template.tenantName,
          ownerPhone:   template.ownerPhone,
          propertyId:   template.propertyId,
          tenancyId:    template.tenancyId,
          type:         template.type,
          lineItems:    template.lineItems.map(li => ({
            description: li.description,
            amount:      li.amount,
            quantity:    li.quantity,
            category:    li.category,
            taxRate:     li.taxRate
          })),
          totalAmount:  template.totalAmount,
          dueDate:      newDueDate,
          status:       template.recurringConfig.autoSend ? 'sent' : 'draft',
          sentAt:       template.recurringConfig.autoSend ? new Date() : undefined,
          sentVia:      template.recurringConfig.autoSend ? ['whatsapp'] : [],
          isRecurring:  false,   // The generated copy is not itself recurring
          createdBy:    'system:recurring'
        });

        await inv.save();
        generated.push(inv);

        // Update next date on template
        template.recurringConfig.nextDate = this._calcNextDate(
          template.recurringConfig.frequency,
          newDueDate
        );
        // End if past end date
        if (template.recurringConfig.endDate && template.recurringConfig.nextDate > template.recurringConfig.endDate) {
          template.isRecurring = false;
        }
        await template.save();
      }

      return { success: true, generated: generated.length, invoices: generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createRecurringInvoice(data) {
    try {
      const invoiceNumber = data.invoiceNumber || await Invoice.generateInvoiceNumber();
      const invoice = new Invoice({
        ...data,
        invoiceNumber,
        isRecurring: true,
        recurringConfig: {
          frequency: data.frequency || 'monthly',
          nextDate:  data.nextDate || data.dueDate || new Date(),
          endDate:   data.endDate,
          autoSend:  data.autoSend || false
        }
      });
      await invoice.save();
      return { success: true, invoice, invoiceNumber };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  _calcNextDate(frequency, fromDate) {
    const d = new Date(fromDate);
    switch (frequency) {
      case 'monthly':     d.setMonth(d.getMonth() + 1); break;
      case 'quarterly':   d.setMonth(d.getMonth() + 3); break;
      case 'semi_annual': d.setMonth(d.getMonth() + 6); break;
      case 'annual':      d.setFullYear(d.getFullYear() + 1); break;
      default:            d.setMonth(d.getMonth() + 1);
    }
    return d;
  },

  async getRevenueReport(opts = {}) {
    try {
      const startDate = opts.startDate ? new Date(opts.startDate) : new Date(new Date().getFullYear(), 0, 1);
      const endDate   = opts.endDate   ? new Date(opts.endDate)   : new Date();

      const invoices = await Invoice.find({
        issueDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      });

      const payments = await InvoicePayment.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      // Revenue by type
      const byType = {};
      for (const inv of invoices) {
        if (!byType[inv.type]) byType[inv.type] = { invoiced: 0, count: 0 };
        byType[inv.type].invoiced += inv.totalAmount;
        byType[inv.type].count++;
      }

      // Payments by gateway
      const byGateway = {};
      for (const pay of payments) {
        if (!byGateway[pay.gateway]) byGateway[pay.gateway] = { collected: 0, count: 0 };
        byGateway[pay.gateway].collected += pay.amount;
        byGateway[pay.gateway].count++;
      }

      // Monthly breakdown
      const monthly = {};
      for (const pay of payments) {
        const key = `${pay.createdAt.getFullYear()}-${String(pay.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { collected: 0, count: 0 };
        monthly[key].collected += pay.amount;
        monthly[key].count++;
      }

      return {
        success: true,
        report: {
          period: { start: startDate, end: endDate },
          invoices: {
            total:          invoices.length,
            totalInvoiced:  invoices.reduce((s, i) => s + i.totalAmount, 0),
            totalPaid:      invoices.reduce((s, i) => s + i.paidAmount, 0),
            totalBalance:   invoices.reduce((s, i) => s + i.balanceDue, 0),
            paidCount:      invoices.filter(i => i.status === 'paid').length,
            overdueCount:   invoices.filter(i => i.dueDate < new Date() && !['paid', 'cancelled', 'refunded'].includes(i.status)).length
          },
          payments: {
            total:          payments.length,
            totalCollected: payments.reduce((s, p) => s + p.amount, 0)
          },
          byType,
          byGateway,
          monthly
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getOutstandingReport() {
    try {
      const unpaid = await Invoice.find({
        status: { $in: ['draft', 'sent', 'viewed', 'partially_paid', 'overdue'] },
        balanceDue: { $gt: 0 }
      }).sort({ dueDate: 1 });

      // Group by tenant
      const byTenant = {};
      for (const inv of unpaid) {
        const key = inv.tenantPhone || 'unknown';
        if (!byTenant[key]) byTenant[key] = {
          name: inv.tenantName || 'Unknown',
          phone: key,
          invoices: 0,
          totalDue: 0
        };
        byTenant[key].invoices++;
        byTenant[key].totalDue += inv.balanceDue;
      }

      return {
        success: true,
        outstanding: {
          totalInvoices:   unpaid.length,
          totalOutstanding: unpaid.reduce((s, i) => s + i.balanceDue, 0),
          overdueCount:    unpaid.filter(i => i.dueDate < new Date()).length,
          overdueAmount:   unpaid.filter(i => i.dueDate < new Date()).reduce((s, i) => s + i.balanceDue, 0),
          byTenant:        Object.values(byTenant).sort((a, b) => b.totalDue - a.totalDue)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTenantPaymentHistory(tenantPhone, opts = {}) {
    try {
      const invoices = await Invoice.findByTenant(tenantPhone, opts);
      const payments = await InvoicePayment.find({ payerPhone: tenantPhone })
        .sort({ createdAt: -1 })
        .limit(opts.limit || 50);

      return {
        success: true,
        tenant: {
          phone: tenantPhone,
          invoices:       invoices.length,
          payments:       payments.length,
          totalInvoiced:  invoices.reduce((s, i) => s + i.totalAmount, 0),
          totalPaid:      payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
          totalBalance:   invoices.reduce((s, i) => s + i.balanceDue, 0)
        },
        invoices,
        payments
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
