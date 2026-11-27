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

class InvoicePaymentService {
}

import { methodsPart1 } from './invoice_parts/part1.js';
import { methodsPart2 } from './invoice_parts/part2.js';
import { methodsPart3 } from './invoice_parts/part3.js';
import { methodsPart4 } from './invoice_parts/part4.js';
Object.assign(InvoicePaymentService.prototype, methodsPart1, methodsPart2, methodsPart3, methodsPart4);


export default new InvoicePaymentService();

