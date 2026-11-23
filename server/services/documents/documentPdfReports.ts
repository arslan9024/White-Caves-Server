import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import {
  type GeneratedFile,
  type LeaseInvoiceInput,
  PDF_MIME,
  safeDate,
} from './documentTypes.js';
import { renderSimplePdf, renderInvoicePdf } from './documentPdfRenderer.js';

export async function generateLeaseInvoicePdf(
  invoice: LeaseInvoiceInput
): Promise<GeneratedFile> {
  try {
    const currency = invoice.currency || 'AED';
    const lines = [
      'WHITE CAVES REAL ESTATE L.L.C',
      `Invoice Number: ${invoice.invoiceNumber}`,
      `Client: ${invoice.client}`,
      `Status: ${invoice.status}`,
      `Issue Date: ${safeDate(invoice.createdAt)}`,
      `Due Date: ${safeDate(invoice.dueDate)}`,
      `Net Amount: ${currency} ${invoice.amount.toFixed(2)}`,
      `VAT Amount: ${currency} ${invoice.vatAmount.toFixed(2)}`,
      `Total Amount: ${currency} ${invoice.totalAmount.toFixed(2)}`,
    ];
    return {
      buffer: await renderInvoicePdf(lines),
      mimeType: PDF_MIME,
      filename: `lease-invoice-${invoice.id}.pdf`,
    };
  } catch (error) {
    logger.error('Lease invoice PDF generation failed', { invoiceId: invoice.id, error });
    throw error;
  }
}

export async function generateContractPdf(contractId: string): Promise<GeneratedFile> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      type: true,
      status: true,
      value: true,
      currency: true,
      startDate: true,
      endDate: true,
      createdAt: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  const lines = [
    `Contract Number: ${contract.contractNumber}`,
    `Title: ${contract.title}`,
    `Type: ${contract.type}`,
    `Status: ${contract.status}`,
    `Value: ${contract.currency || 'AED'} ${contract.value ?? 0}`,
    `Start Date: ${safeDate(contract.startDate)}`,
    `End Date: ${safeDate(contract.endDate)}`,
    `Created At: ${safeDate(contract.createdAt)}`,
  ];

  const buffer = await renderSimplePdf('Contract Summary', lines);
  return {
    buffer,
    mimeType: PDF_MIME,
    filename: `contract-${contract.contractNumber || contract.id}.pdf`,
  };
}

export async function generateCommissionPdf(agentId: string): Promise<GeneratedFile> {
  const [agent, commissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, email: true },
    }),
    prisma.commission.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        type: true,
        createdAt: true,
      },
    }),
  ]);

  if (!agent) {
    throw new Error('Agent not found');
  }

  const totalAmount = commissions.reduce((acc, item) => acc + (item.amount || 0), 0);
  const lines = [
    `Agent: ${agent.name || '—'} (${agent.email || '—'})`,
    `Records: ${commissions.length}`,
    `Total: AED ${totalAmount.toFixed(2)}`,
    '',
    ...commissions.map(
      c =>
        `${safeDate(c.createdAt)} | ${(c.type || '').toUpperCase()} | ${(c.status || '').toUpperCase()} | AED ${(c.amount || 0).toFixed(2)}`
    ),
  ];

  const buffer = await renderSimplePdf('Commission Summary', lines);
  return {
    buffer,
    mimeType: PDF_MIME,
    filename: `commission-${agent.id}.pdf`,
  };
}

export async function generateMonthlyPnLPdf(year: number, month: number): Promise<GeneratedFile> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [transactions, expenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
  ]);

  const grossIncome = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const vatCollected = Math.round(grossIncome * 0.05 * 100) / 100;
  const netOperatingIncome = grossIncome - totalExpenses;

  const periodLabel = `${year}-${String(month).padStart(2, '0')}`;
  const lines = [
    `Period: ${periodLabel} (${safeDate(startDate)} to ${safeDate(endDate)})`,
    `Gross Transaction Volume: AED ${grossIncome.toLocaleString('en-US')}`,
    `UAE FTA VAT (5% Collected): AED ${vatCollected.toLocaleString('en-US')}`,
    `Total Operating Expenses: AED ${totalExpenses.toLocaleString('en-US')}`,
    `Net Operating Income: AED ${netOperatingIncome.toLocaleString('en-US')}`,
    '',
    `Total Transactions Processed: ${transactions.length}`,
    `Total Expense Line Items: ${expenses.length}`,
  ];

  const buffer = await renderSimplePdf(`Monthly P&L Statement — ${periodLabel}`, lines);
  return {
    buffer,
    mimeType: PDF_MIME,
    filename: `pnl-statement-${periodLabel}.pdf`,
  };
}
