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


export const methodsPart2 = {
  async listPayments(opts = {}) {
    try {
      const query = {};
      if (opts.payerPhone)    query.payerPhone    = opts.payerPhone;
      if (opts.invoiceNumber) query.invoiceNumber = opts.invoiceNumber;
      if (opts.gateway)       query.gateway       = opts.gateway;
      if (opts.status)        query.status        = opts.status;
      if (opts.reconciled !== undefined) query.reconciled = opts.reconciled;

      const payments = await InvoicePayment.find(query)
        .sort({ createdAt: -1 })
        .limit(opts.limit || 50);

      const summary = {
        count:    payments.length,
        total:    payments.reduce((s, p) => s + p.amount, 0),
        completed: payments.filter(p => p.status === 'completed').length,
        pending:   payments.filter(p => ['initiated', 'pending', 'processing'].includes(p.status)).length,
        failed:    payments.filter(p => p.status === 'failed').length
      };

      return { success: true, payments, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async processRefund(paymentId, refundData = {}) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      if (payment.status !== 'completed') {
        return { success: false, error: `Cannot refund a ${payment.status} payment` };
      }

      const refundAmount = refundData.amount || payment.amount;
      if (refundAmount > payment.amount) {
        return { success: false, error: 'Refund exceeds payment amount' };
      }

      await payment.refund(refundAmount, refundData.reason || 'Refund requested');

      // Reverse payment on invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        invoice.paidAmount = Math.max(0, +(invoice.paidAmount - refundAmount).toFixed(2));
        if (refundAmount >= payment.amount) {
          invoice.status = 'refunded';
        }
        await invoice.save();
      }

      return { success: true, payment, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async _generateReceipt(payment, invoice) {
    try {
      const receiptId = await PaymentReceipt.generateReceiptId();

      const receiptText = this._formatReceiptText(payment, invoice);

      const receipt = new PaymentReceipt({
        receiptId,
        paymentId:      payment.paymentId,
        invoiceNumber:  payment.invoiceNumber,
        payerName:      payment.payerName,
        payerPhone:     payment.payerPhone,
        amount:         payment.amount,
        currency:       payment.currency,
        description:    `Payment for Invoice ${payment.invoiceNumber}`,
        paymentMethod:  `${payment.gateway} / ${payment.method}`,
        transactionRef: payment.gatewayConfig?.transactionId || payment.paymentId,
        propertyId:     invoice?.propertyId,
        propertyName:   invoice?.propertyName,
        format:         'whatsapp',
        receiptText
      });

      await receipt.save();

      // Update payment with receipt reference
      payment.receiptId        = receiptId;
      payment.receiptGenerated = true;
      await payment.save();

      return receipt;
    } catch (error) {
      console.error('Receipt generation error:', error.message);
      return null;
    }
  },

  _formatReceiptText(payment, invoice) {
    const lines = [
      '🧾 *PAYMENT RECEIPT*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `📋 Receipt: ${payment.receiptId || 'Pending'}`,
      `💳 Payment: ${payment.paymentId}`,
      `📄 Invoice: ${payment.invoiceNumber || 'N/A'}`,
      '',
      `👤 Payer: ${payment.payerName || 'N/A'}`,
      `📱 Phone: ${payment.payerPhone || 'N/A'}`,
      '',
      `💰 Amount: ${payment.currency} ${payment.amount.toLocaleString()}`,
      `🏦 Method: ${payment.gateway} / ${payment.method}`,
      `📅 Date: ${new Date().toLocaleDateString('en-AE')}`,
      '',
    ];

    if (invoice) {
      lines.push(`🏠 Property: ${invoice.propertyName || invoice.propertyId || 'N/A'}`);
      lines.push(`📊 Invoice Total: ${invoice.currency} ${invoice.totalAmount.toLocaleString()}`);
      lines.push(`✅ Paid So Far: ${invoice.currency} ${invoice.paidAmount.toLocaleString()}`);
      lines.push(`📝 Balance: ${invoice.currency} ${invoice.balanceDue.toLocaleString()}`);
      lines.push('');
    }

    if (payment.gatewayConfig?.transactionId) {
      lines.push(`🔗 Ref: ${payment.gatewayConfig.transactionId}`);
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Thank you for your payment! ✅');

    return lines.join('\n');
  },

  async getReceipt(receiptId) {
    try {
      const receipt = await PaymentReceipt.findOne({ receiptId });
      if (!receipt) return { success: false, error: 'Receipt not found' };
      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getReceiptByPayment(paymentId) {
    try {
      const receipt = await PaymentReceipt.findOne({ paymentId });
      if (!receipt) return { success: false, error: 'Receipt not found for this payment' };
      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async autoReconcile() {
    try {
      const unreconciled = await InvoicePayment.find({
        status: 'completed',
        reconciled: false,
        invoiceNumber: { $exists: true, $ne: null }
      });

      const results = { matched: 0, failed: 0, errors: [] };

      for (const payment of unreconciled) {
        try {
          const invoice = await Invoice.findOne({ invoiceNumber: payment.invoiceNumber });
          if (!invoice) {
            results.failed++;
            results.errors.push(`No invoice found for ${payment.invoiceNumber}`);
            continue;
          }

          const recId = await ReconciliationLog.generateReconciliationId();
          const log = new ReconciliationLog({
            reconciliationId:      recId,
            type:                  'auto',
            paymentId:             payment.paymentId,
            invoiceNumber:         payment.invoiceNumber,
            matchedAmount:         payment.amount,
            currency:              payment.currency,
            matchConfidence:       'exact',
            matchCriteria:         ['invoiceNumber'],
            invoiceBalanceBefore:  invoice.balanceDue,
            invoiceBalanceAfter:   Math.max(0, invoice.balanceDue - payment.amount),
            status:                'confirmed',
            performedBy:           'system:auto-reconcile'
          });
          await log.save();

          payment.reconciled   = true;
          payment.reconciledAt = new Date();
          payment.reconciledBy = 'system:auto-reconcile';
          await payment.save();

          results.matched++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Error reconciling ${payment.paymentId}: ${err.message}`);
        }
      }

      return { success: true, ...results, total: unreconciled.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async manualReconcile(paymentId, invoiceNumber, performedBy) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };

      const invoice = await Invoice.findOne({ invoiceNumber });
      if (!invoice) return { success: false, error: 'Invoice not found' };

      // Apply payment to invoice if not already
      if (!payment.reconciled) {
        await invoice.applyPayment(payment.amount);
      }

      const recId = await ReconciliationLog.generateReconciliationId();
      const log = new ReconciliationLog({
        reconciliationId:      recId,
        type:                  'manual',
        paymentId,
        invoiceNumber,
        matchedAmount:         payment.amount,
        currency:              payment.currency,
        matchConfidence:       'forced',
        matchCriteria:         ['manual_match'],
        invoiceBalanceBefore:  invoice.balanceDue + payment.amount,
        invoiceBalanceAfter:   invoice.balanceDue,
        status:                'confirmed',
        performedBy:           performedBy || 'admin'
      });
      await log.save();

      payment.reconciled     = true;
      payment.reconciledAt   = new Date();
      payment.reconciledBy   = performedBy || 'admin';
      payment.invoiceNumber  = invoiceNumber;
      payment.invoiceId      = invoice._id;
      await payment.save();

      return { success: true, reconciliation: log, payment, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getReconciliationHistory(opts = {}) {
    try {
      const query = {};
      if (opts.paymentId)     query.paymentId     = opts.paymentId;
      if (opts.invoiceNumber) query.invoiceNumber = opts.invoiceNumber;
      if (opts.type)          query.type          = opts.type;

      const logs = await ReconciliationLog.find(query)
        .sort({ performedAt: -1 })
        .limit(opts.limit || 50);

      return { success: true, logs, count: logs.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
