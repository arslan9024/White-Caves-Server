import type { Invoice } from '@prisma/client';
import type { GeneratedFile, LeaseInvoiceInput } from './documents/documentTypes.js';
import {
  generateLeaseInvoicePdf,
  generateContractPdf,
  generateCommissionPdf,
  generateMonthlyPnLPdf,
} from './documents/documentPdfReports.js';
import {
  generateLeadsExcel,
  generatePropertiesExcel,
  generateMonthlyPLReport,
  generateCommissionDetailExcel,
} from './documents/documentExcelReports.js';
import { renderSimplePdf, renderInvoicePdf } from './documents/documentPdfRenderer.js';

export type { GeneratedFile, LeaseInvoiceInput };
export {
  renderSimplePdf,
  renderInvoicePdf,
  generateLeaseInvoicePdf,
  generateContractPdf,
  generateCommissionPdf,
  generateMonthlyPnLPdf,
  generateLeadsExcel,
  generatePropertiesExcel,
  generateMonthlyPLReport,
  generateCommissionDetailExcel,
};

export class DocumentService {
  async generateLeaseInvoicePdf(invoice: LeaseInvoiceInput): Promise<GeneratedFile> {
    return generateLeaseInvoicePdf(invoice);
  }

  private async renderInvoicePdf(lines: string[]): Promise<Buffer> {
    return renderInvoicePdf(lines);
  }

  async generateContractPdf(contractId: string): Promise<GeneratedFile> {
    return generateContractPdf(contractId);
  }

  async generateCommissionPdf(agentId: string): Promise<GeneratedFile> {
    return generateCommissionPdf(agentId);
  }

  async generateLeadsExcel(): Promise<GeneratedFile> {
    return generateLeadsExcel();
  }

  async generatePropertiesExcel(): Promise<GeneratedFile> {
    return generatePropertiesExcel();
  }

  async generateMonthlyPLReport(): Promise<GeneratedFile> {
    return generateMonthlyPLReport();
  }

  private async renderSimplePdf(title: string, lines: string[]): Promise<Buffer> {
    return renderSimplePdf(title, lines);
  }

  async generateCommissionDetailExcel(agentId?: string): Promise<GeneratedFile> {
    return generateCommissionDetailExcel(agentId);
  }

  async generateMonthlyPnLPdf(year: number, month: number): Promise<GeneratedFile> {
    return generateMonthlyPnLPdf(year, month);
  }
}

export const documentService = new DocumentService();
