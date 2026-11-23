import { prisma } from '../../database.js';
import logger from '../../utils/logger.js';
import {
  type GeneratedFile,
  XLSX_MIME,
  CSV_MIME,
  safeDate,
  buildCsvBuffer,
} from './documentTypes.js';

export async function generateMonthlyPLReport(): Promise<GeneratedFile> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [rentIncome, commissionIncome, transactions] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        status: { in: ['paid', 'settled'] },
        notes: { contains: 'TYPE:rent' },
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.commission.aggregate({
      where: {
        status: 'paid',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    }),
  ]);

  const rentTotal = Number(rentIncome._sum.totalAmount ?? 0);
  const commissionTotal = Number(commissionIncome._sum.amount ?? 0);
  const grossIncome = rentTotal + commissionTotal;

  const exceljsModule = await import('exceljs').catch(() => null);
  if (!exceljsModule) {
    const rows = [
      ['Rent Income', rentTotal, rentIncome._count._all],
      ['Commission Income', commissionTotal, commissionIncome._count._all],
      ['Total Gross Income', grossIncome, ''],
    ];

    return {
      buffer: buildCsvBuffer(['Category', 'Amount (AED)', 'Count'], rows),
      mimeType: CSV_MIME,
      filename: `pl-report-${year}-${String(month).padStart(2, '0')}.csv`,
    };
  }

  const ExcelJS = (exceljsModule as any)?.default || (exceljsModule as any);
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('P&L Summary');
  summarySheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Amount (AED)', key: 'amount', width: 18 },
    { header: 'Count', key: 'count', width: 12 },
  ];

  summarySheet.addRow({ category: 'Rent Income', amount: rentTotal, count: rentIncome._count._all });
  summarySheet.addRow({ category: 'Commission Income', amount: commissionTotal, count: commissionIncome._count._all });
  summarySheet.addRow({ category: 'Total Gross Income', amount: grossIncome, count: '' });

  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } };

  const txSheet = workbook.addWorksheet('Transactions');
  txSheet.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Date', key: 'createdAt', width: 16 },
  ];

  transactions.forEach(tx =>
    txSheet.addRow({
      ...tx,
      createdAt: safeDate(tx.createdAt),
    })
  );

  const txHeader = txSheet.getRow(1);
  txHeader.font = { bold: true };
  txHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const periodLabel = `${year}-${String(month).padStart(2, '0')}`;
  logger.info('[DocumentService] generated monthly P&L report', { period: periodLabel, grossIncome });
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: XLSX_MIME,
    filename: `pl-report-${periodLabel}.xlsx`,
  };
}

export async function generateCommissionDetailExcel(agentId?: string): Promise<GeneratedFile> {
  const whereClause = agentId ? { agentId } : {};
  const commissions = await prisma.commission.findMany({
    where: whereClause,
    include: {
      agent: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const exceljsModule = await import('exceljs').catch(() => null);
  if (!exceljsModule) {
    const rows = commissions.map(c => [
      c.id,
      c.agent?.name || '—',
      c.agent?.email || '—',
      c.amount,
      c.currency || 'AED',
      c.status,
      c.type || 'sales',
      safeDate(c.createdAt),
    ]);
    return {
      buffer: buildCsvBuffer(
        ['Commission ID', 'Agent Name', 'Agent Email', 'Amount', 'Currency', 'Status', 'Type', 'Created At'],
        rows
      ),
      mimeType: CSV_MIME,
      filename: `commission-detail-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  const ExcelJS = (exceljsModule as any)?.default || (exceljsModule as any);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Commission Details');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Agent Name', key: 'agentName', width: 24 },
    { header: 'Agent Email', key: 'agentEmail', width: 28 },
    { header: 'Amount (AED)', key: 'amount', width: 16 },
    { header: 'VAT 5% (AED)', key: 'vat', width: 14 },
    { header: 'Net Payout (AED)', key: 'netPayout', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Date', key: 'createdAt', width: 16 },
  ];

  commissions.forEach(c => {
    const vat = Math.round((c.amount || 0) * 0.05 * 100) / 100;
    const netPayout = Math.round(((c.amount || 0) - vat) * 100) / 100;
    sheet.addRow({
      id: c.id,
      agentName: c.agent?.name || '—',
      agentEmail: c.agent?.email || '—',
      amount: c.amount || 0,
      vat,
      netPayout,
      status: c.status,
      type: c.type || 'sales',
      createdAt: safeDate(c.createdAt),
    });
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: XLSX_MIME,
    filename: `commission-detail-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
