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


export const methodsPart4 = {
  async getQuickStats() {
    try {
      const [totalInv, paidInv, overdueInv, draftInv] = await Promise.all([
        Invoice.countDocuments({}),
        Invoice.countDocuments({ status: 'paid' }),
        Invoice.countDocuments({
          status: { $nin: ['paid', 'cancelled', 'refunded', 'written_off'] },
          dueDate: { $lt: new Date() }
        }),
        Invoice.countDocuments({ status: 'draft' })
      ]);

      const [totalPay, completedPay] = await Promise.all([
        InvoicePayment.countDocuments({}),
        InvoicePayment.countDocuments({ status: 'completed' })
      ]);

      const [invoiceAgg] = await Invoice.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: {
          _id: null,
          totalInvoiced: { $sum: '$totalAmount' },
          totalPaid:     { $sum: '$paidAmount' },
          totalBalance:  { $sum: '$balanceDue' }
        }}
      ]) || [{}];

      const stats = invoiceAgg || {};

      const lines = [
        '💰 *INVOICE & PAYMENT STATS*',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '📄 *Invoices*',
        `   Total: ${totalInv}`,
        `   Paid: ${paidInv} ✅`,
        `   Overdue: ${overdueInv} ⚠️`,
        `   Draft: ${draftInv}`,
        '',
        '💳 *Payments*',
        `   Total: ${totalPay}`,
        `   Completed: ${completedPay} ✅`,
        '',
        '📊 *Financials*',
        `   Invoiced: AED ${(stats.totalInvoiced || 0).toLocaleString()}`,
        `   Collected: AED ${(stats.totalPaid || 0).toLocaleString()}`,
        `   Outstanding: AED ${(stats.totalBalance || 0).toLocaleString()}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━'
      ];

      return lines.join('\n');
    } catch (error) {
      return `❌ Error loading stats: ${error.message}`;
    }
  },

  async _initiateGateway(gateway, payment, invoice) {
    // Placeholder — override per gateway in production
    switch (gateway) {
      case 'paytabs':
        return this._initiatePayTabs(payment, invoice);
      case 'stripe':
        return this._initiateStripe(payment, invoice);
      default:
        return { redirectUrl: null };
    }
  },

  async _initiatePayTabs(payment, invoice) {
    // PayTabs integration placeholder
    // In production: call PayTabs API to create payment page
    // Return: { redirectUrl: 'https://secure.paytabs.com/payment/...' }
    console.log(`[PayTabs] Would initiate payment ${payment.paymentId} for AED ${payment.amount}`);
    return {
      redirectUrl: null,
      transactionId: `PT-${Date.now()}`
    };
  },

  async _initiateStripe(payment, invoice) {
    // Stripe integration placeholder
    // In production: call Stripe API to create checkout session
    // Return: { redirectUrl: 'https://checkout.stripe.com/...' }
    console.log(`[Stripe] Would initiate payment ${payment.paymentId} for AED ${payment.amount}`);
    return {
      redirectUrl: null,
      transactionId: `STR-${Date.now()}`
    };
  }
};
