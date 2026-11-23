import type { Invoice } from '@prisma/client';

export interface GeneratedFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export const PDF_MIME = 'application/pdf';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv; charset=utf-8';

export type LeaseInvoiceInput = Pick<
  Invoice,
  | 'id'
  | 'invoiceNumber'
  | 'client'
  | 'amount'
  | 'vatAmount'
  | 'totalAmount'
  | 'currency'
  | 'status'
  | 'createdAt'
  | 'dueDate'
>;

export function safeDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toISOString().slice(0, 10);
}

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function buildCsvBuffer(headers: string[], rows: Array<Array<unknown>>): Buffer {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return Buffer.from(`\ufeff${lines.join('\r\n')}`, 'utf8');
}
