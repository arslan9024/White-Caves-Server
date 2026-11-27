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


export const methodsPart1 = {
  _model(name) {
    try { return mongoose.model(name); }
    catch { return null; }
  },

  async createInvoice(data) {
    try {
      const invoiceNumber = data.invoiceNumber || await Invoice.generateInvoiceNumber();
      const invoice = new Invoice({ ...data, invoiceNumber });
      await invoice.save();
      return { success: true, invoice, invoiceNumber };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getInvoice(idOrNumber) {
    try {
      let invoice = null;
      if (mongoose.isValidObjectId(idOrNumber)) {
        invoice = await Invoice.findById(idOrNumber);
      }
      if (!invoice) {
        invoice = await Invoice.findOne({ invoiceNumber: idOrNumber });
      }
      if (!invoice) return { success: false, error: 'Invoice not found' };
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async listInvoices(opts = {}) {
    try {
      const query = {};
      if (opts.tenantPhone) query.tenantPhone = opts.tenantPhone;
      if (opts.propertyId)  query.propertyId  = opts.propertyId;
      if (opts.status)      query.status      = opts.status;
      if (opts.type)        query.type        = opts.type;

      if (opts.startDate || opts.endDate) {
        query.issueDate = {};
        if (opts.startDate) query.issueDate.$gte = new Date(opts.startDate);
        if (opts.endDate)   query.issueDate.$lte = new Date(opts.endDate);
      }

      const invoices = await Invoice.find(query)
        .sort({ issueDate: -1 })
        .limit(opts.limit || 50);

      const summary = {
        count: invoices.length,
        totalAmount:   invoices.reduce((s, i) => s + i.totalAmount, 0),
        totalPaid:     invoices.reduce((s, i) => s + i.paidAmount, 0),
        totalBalance:  invoices.reduce((s, i) => s + i.balanceDue, 0)
      };

      return { success: true, invoices, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateInvoice(idOrNumber, updates) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
        return { success: false, error: `Cannot edit invoice in '${invoice.status}' status` };
      }
      Object.assign(invoice, updates);
      await invoice.save();
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelInvoice(idOrNumber, reason) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (invoice.status === 'paid') {
        return { success: false, error: 'Cannot cancel a paid invoice — use refund instead' };
      }
      invoice.status        = 'cancelled';
      invoice.internalNotes = (invoice.internalNotes || '') + `\nCancelled: ${reason || 'No reason'}`;
      await invoice.save();
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async sendInvoice(idOrNumber, channels = ['whatsapp']) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      await invoice.markAsSent(channels);
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async generateFromTenancy(tenancyId) {
    try {
      const Tenancy = this._model('PropertyTenancy');
      if (!Tenancy) return { success: false, error: 'PropertyTenancy model not available' };

      const tenancy = await Tenancy.findById(tenancyId);
      if (!tenancy) return { success: false, error: 'Tenancy not found' };

      const cheques = tenancy.paymentSchedule?.cheques || [];
      if (!cheques.length) return { success: false, error: 'No cheques in payment schedule' };

      const generated = [];
      for (const cheque of cheques) {
        // Skip already-paid cheques or ones that already have invoices
        const existing = await Invoice.findOne({
          tenancyId: tenancyId.toString(),
          'lineItems.description': { $regex: `Cheque.*${cheque.chequeNumber}` }
        });
        if (existing) continue;

        const invoiceNumber = await Invoice.generateInvoiceNumber();
        const inv = new Invoice({
          invoiceNumber,
          tenantPhone:  tenancy.tenantPhone,
          tenantName:   tenancy.tenantName,
          ownerPhone:   tenancy.ownerPhone,
          propertyId:   tenancy.propertyId,
          tenancyId:    tenancyId.toString(),
          type: 'rent',
          lineItems: [{
            description: `Cheque #${cheque.chequeNumber} — Rent Payment`,
            amount:      cheque.chequeAmount || tenancy.contractAmount / (cheques.length || 1),
            category:    'rent'
          }],
          totalAmount:  cheque.chequeAmount || tenancy.contractAmount / (cheques.length || 1),
          dueDate:      cheque.chequeDueDate || new Date(),
          status:       cheque.isPaid ? 'paid' : 'draft',
          paidAmount:   cheque.isPaid ? (cheque.chequeAmount || 0) : 0,
          paidDate:     cheque.isPaid ? (cheque.paidDate || new Date()) : undefined,
          createdBy:    'system:auto-generate'
        });
        await inv.save();
        generated.push(inv);
      }

      return { success: true, generated: generated.length, invoices: generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async initiatePayment(data) {
    try {
      const { invoiceNumber, amount, gateway, method, payerPhone, payerName, createdBy, methodDetails } = data;

      // Validate invoice
      const { invoice } = await this.getInvoice(invoiceNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
        return { success: false, error: `Invoice is ${invoice.status}` };
      }

      const payAmount = amount || invoice.balanceDue;
      if (payAmount <= 0) return { success: false, error: 'Nothing to pay' };
      if (payAmount > invoice.balanceDue) {
        return { success: false, error: `Amount ${payAmount} exceeds balance ${invoice.balanceDue}` };
      }

      const paymentId = await InvoicePayment.generatePaymentId();
      const payment = new InvoicePayment({
        paymentId,
        invoiceId:     invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        payerPhone:    payerPhone || invoice.tenantPhone,
        payerName:     payerName || invoice.tenantName,
        amount:        payAmount,
        currency:      invoice.currency,
        gateway:       gateway || 'cash',
        method:        method || 'cash',
        methodDetails: methodDetails || {},
        status:        'initiated',
        statusHistory: [{ status: 'initiated', timestamp: new Date() }],
        createdBy
      });

      await payment.save();

      // For non-gateway payments (cash, cheque, bank_transfer), auto-complete
      if (['cash', 'cheque', 'bank_transfer'].includes(gateway)) {
        return await this.completePayment(paymentId);
      }

      // For gateway payments, return payment with redirect URL
      const gatewayResult = await this._initiateGateway(gateway, payment, invoice);
      if (gatewayResult.redirectUrl) {
        payment.gatewayConfig.redirectUrl = gatewayResult.redirectUrl;
        payment.status = 'pending';
        payment.statusHistory.push({ status: 'pending', timestamp: new Date() });
        await payment.save();
      }

      return { success: true, payment, paymentId, redirectUrl: gatewayResult.redirectUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async completePayment(paymentId, gatewayResponse = {}) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      if (payment.status === 'completed') return { success: true, payment, message: 'Already completed' };
      if (['failed', 'cancelled', 'refunded'].includes(payment.status)) {
        return { success: false, error: `Cannot complete a ${payment.status} payment` };
      }

      // Complete the payment
      await payment.complete(gatewayResponse);

      // Apply payment to invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        await invoice.applyPayment(payment.amount);
      }

      // Generate receipt
      const receipt = await this._generateReceipt(payment, invoice);

      return { success: true, payment, invoice, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async failPayment(paymentId, reason) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      await payment.fail(reason);
      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getPayment(paymentId) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
