/**
 * tenancyDealPersistenceAndDocsService.ts
 * White Caves Real Estate LLC — DB-Persisted 12-Stage Tenancy Lifecycle,
 * Sequential Official PDF Payment Receipts, 5% UAE VAT Commission Invoices,
 * Pre-Filled Tenancy Contract Drafts & Henry Google Drive Stage Archival
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import {
  advanceTenancyStage,
  type LeasingDealStage,
  type TenancyContractMode,
  type TenancyDealState,
} from './tenancyLifecycleFormula.js';
import type { OrgJobRole } from '../rbac/leasingRoleClearanceMatrix.js';
import { ensureTenancyStageFolders, uploadFileToUnitSubfolder } from '../henry/driveInventoryManager.js';
import { dispatchStageCareAndRenewalNotifications } from './leasingCareNotificationDispatcher.js';

const log = createLogger('TenancyDealPersistence');
const defaultDb = prisma as any;

export interface ChequeScheduleEntry {
  installment: number; chequeNumber: string; bankName: string; amountAed: number; dueDateIso: string; status: 'PENDING' | 'CLEARED' | 'BOUNCED';
}

export interface GeneratedWhiteCavesDocs {
  receiptNumber: string; vatInvoiceNumber: string; commissionAed: number; vat5PercentAed: number; totalAgencyFeeAed: number;
  receiptPdfBuffer: Buffer; vatInvoicePdfBuffer: Buffer; contractDraftPdfBuffer: Buffer;
  driveArchivedFiles: Array<{ name: string; fileId?: string; destination?: string }>;
}

export function buildOfficialWhiteCavesPdfBuffer(input: {
  documentTitle: string;
  documentNumber: string;
  lines: string[];
}): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const allLines = [
    'WHITE CAVES REAL ESTATE LLC — DUBAI, UAE',
    `Document: ${input.documentTitle} | Ref: ${input.documentNumber}`,
    `Issued: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC | Primary Desk: +971505760056`,
    '------------------------------------------------------------------------',
    ...input.lines,
    '------------------------------------------------------------------------',
    'Authorized Signatory: Arslan Malik, Managing Director — White Caves Real Estate LLC',
  ];

  const streamBody = [
    'BT', '/F1 11 Tf', '42 780 Td', '16 TL',
    ...allLines.map((line, i) => `${i === 0 ? '' : 'T* '}(${esc(line)}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(streamBody, 'utf8')} >> stream\n${streamBody}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

export function generateOfficialTenancyDocsBundle(input: {
  deal: TenancyDealState;
  cheques?: ChequeScheduleEntry[];
  securityDepositAed?: number;
  sequenceNumber?: number;
}): Omit<GeneratedWhiteCavesDocs, 'driveArchivedFiles'> {
  const year = new Date().getFullYear();
  const seq = String(input.sequenceNumber || Math.floor(1000 + Math.random() * 9000));
  const receiptNumber = `WC-RCPT-${year}-${seq}`;
  const vatInvoiceNumber = `WC-VAT-${year}-${seq}`;

  const annualRent = Number(input.deal.annualRentAed || 95_000);
  const commissionAed = Math.round(annualRent * 0.05);
  const vat5PercentAed = Math.round(commissionAed * 0.05 * 100) / 100;
  const totalAgencyFeeAed = Math.round((commissionAed + vat5PercentAed) * 100) / 100;
  const securityDepositAed = input.securityDepositAed ?? Math.round(annualRent * 0.05);
  const unitLabel = `${input.deal.area} / ${input.deal.project} / Unit ${input.deal.unitNumber}`;

  const receiptPdfBuffer = buildOfficialWhiteCavesPdfBuffer({
    documentTitle: 'OFFICIAL PAYMENT & CHEQUE RECEIPT',
    documentNumber: receiptNumber,
    lines: [
      `Property: ${unitLabel}`,
      `Landlord: ${input.deal.landlordName} (${input.deal.landlordPhone})`,
      `Tenant: ${input.deal.tenantName || 'TBD'} (${input.deal.tenantPhone || 'TBD'})`,
      `Annual Rent: AED ${annualRent.toLocaleString()} (${input.deal.chequesCount || 4} Cheques)`,
      `Security Deposit (5%): AED ${securityDepositAed.toLocaleString()}`,
      `Agency Commission + 5% VAT: AED ${totalAgencyFeeAed.toLocaleString()}`,
      ...(input.cheques || []).map(
        c => `Cheque #${c.installment}: ${c.chequeNumber} (${c.bankName}) — AED ${c.amountAed.toLocaleString()} due ${c.dueDateIso.slice(0, 10)}`
      ),
    ],
  });

  const vatInvoicePdfBuffer = buildOfficialWhiteCavesPdfBuffer({
    documentTitle: 'TAX INVOICE (UAE 5% VAT)',
    documentNumber: vatInvoiceNumber,
    lines: [
      `Property: ${unitLabel}`,
      `Billed To: ${input.deal.tenantName || input.deal.landlordName}`,
      `Service: Residential Leasing Brokerage Commission (5% of AED ${annualRent.toLocaleString()})`,
      `Taxable Commission Subtotal: AED ${commissionAed.toLocaleString()}`,
      `UAE Federal VAT (5%): AED ${vat5PercentAed.toLocaleString()}`,
      `TOTAL PAYABLE (INCL. VAT): AED ${totalAgencyFeeAed.toLocaleString()}`,
    ],
  });

  const contractDraftPdfBuffer = buildOfficialWhiteCavesPdfBuffer({
    documentTitle: `DUBAI TENANCY CONTRACT DRAFT (${input.deal.contractMode})`,
    documentNumber: input.deal.dealId,
    lines: [
      `Property: ${unitLabel}`,
      `Landlord: ${input.deal.landlordName} | Phone: ${input.deal.landlordPhone}`,
      `Tenant: ${input.deal.tenantName || 'TBD'} | Phone: ${input.deal.tenantPhone || 'TBD'}`,
      `Annual Rent: AED ${annualRent.toLocaleString()} | Cheques: ${input.deal.chequesCount || 4}`,
      `Security Deposit: AED ${securityDepositAed.toLocaleString()}`,
      'Execution Rule: Cheques & Fees FIRST -> Tenant Signs FIRST -> Payment Clearance -> Landlord Countersigns -> Ejari + DEWA.',
    ],
  });

  return {
    receiptNumber, vatInvoiceNumber, commissionAed, vat5PercentAed, totalAgencyFeeAed,
    receiptPdfBuffer, vatInvoicePdfBuffer, contractDraftPdfBuffer,
  };
}

export async function createPersistedTenancyDeal(input: {
  propertyId: string;
  contractMode: TenancyContractMode;
  area?: string;
  project: string;
  unitNumber: string;
  landlordName: string;
  landlordPhone: string;
  tenantName?: string;
  tenantPhone?: string;
  annualRentAed: number;
  chequesCount?: number;
  leaseStartIso: string;
  leaseEndIso: string;
  cheques?: ChequeScheduleEntry[];
  initialStage?: LeasingDealStage;
  dbOverride?: any;
}) {
  const db = input.dbOverride || defaultDb;
  const year = new Date().getFullYear();
  const contractNumber = `WC-TC-${year}-${Date.now().toString().slice(-5)}`;
  const commissionAmount = Math.round(input.annualRentAed * 0.05);

  const initialState: TenancyDealState = {
    dealId: contractNumber,
    contractMode: input.contractMode,
    area: input.area || 'Damac Hills 2',
    project: input.project,
    unitNumber: input.unitNumber,
    landlordName: input.landlordName,
    landlordPhone: input.landlordPhone,
    tenantName: input.tenantName,
    tenantPhone: input.tenantPhone,
    annualRentAed: input.annualRentAed,
    chequesCount: input.chequesCount || 4,
    currentStage: input.initialStage || 'STAGE_06_OFFER_SUBMITTED_AND_APPROVED',
    chequesCollected: false,
    feesCollected: false,
    tenantSigned: false,
    paymentCleared: false,
    landlordSigned: false,
    vipProxyActions: [],
    history: [],
  };

  let contractId = contractNumber;
  if (db.tenancyContract?.create) {
    const rec = await db.tenancyContract.create({
      data: {
        contractNumber,
        propertyId: input.propertyId,
        leaseStart: new Date(input.leaseStartIso),
        leaseEnd: new Date(input.leaseEndIso),
        startDate: new Date(input.leaseStartIso),
        endDate: new Date(input.leaseEndIso),
        annualRentAED: input.annualRentAed,
        annualRentAed: input.annualRentAed,
        commissionAmount,
        status: 'DRAFT',
        chequesSchedule: { lifecycleState: initialState, cheques: input.cheques || [] },
      },
    });
    if (rec?.id) contractId = rec.id;
  }

  return { contractId, contractNumber, dealState: initialState };
}

export async function advancePersistedTenancyDealStage(input: {
  contractId: string;
  nextStage: LeasingDealStage;
  actorRole: OrgJobRole;
  actorUserId: string;
  vipProxyOnBehalfOfClient?: boolean;
  note?: string;
  evidence?: {
    chequesCollected?: boolean;
    feesCollected?: boolean;
    tenantSigned?: boolean;
    paymentCleared?: boolean;
    landlordSigned?: boolean;
    ejariPdfFileId?: string;
    dewaProofPdfFileId?: string;
  };
  archiveToDrive?: boolean;
  dbOverride?: any;
}) {
  const db = input.dbOverride || defaultDb;
  const contract = await db.tenancyContract?.findUnique?.({ where: { id: input.contractId } });
  if (!contract) throw new Error(`TenancyContract "${input.contractId}" not found`);

  const scheduleObj = (contract.chequesSchedule || {}) as {
    lifecycleState?: TenancyDealState;
    cheques?: ChequeScheduleEntry[];
  };
  if (!scheduleObj.lifecycleState) {
    throw new Error(`TenancyContract "${input.contractId}" missing lifecycleState metadata`);
  }

  const transition = advanceTenancyStage({
    deal: scheduleObj.lifecycleState,
    nextStage: input.nextStage,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    vipProxyOnBehalfOfClient: input.vipProxyOnBehalfOfClient,
    note: input.note,
    evidence: input.evidence,
  });

  const statusMap: Partial<Record<LeasingDealStage, string>> = {
    STAGE_08_TENANT_SIGNED_FIRST: 'SIGNED',
    STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED: 'SIGNED',
    STAGE_11_EJARI_AND_DEWA_REGISTERED: 'ATTESTED_EJARI',
    STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED: 'ACTIVE',
  };

  let generatedDocs: GeneratedWhiteCavesDocs | null = null;
  if (input.nextStage === 'STAGE_07_CHEQUES_AND_FEES_COLLECTED') {
    const bundle = generateOfficialTenancyDocsBundle({ deal: transition.deal, cheques: scheduleObj.cheques || [] });

    if (db.financialReceiptLog?.create) {
      await db.financialReceiptLog.create({
        data: {
          receiptNumber: bundle.receiptNumber,
          amountAED: bundle.totalAgencyFeeAed,
          vatAmountAED: bundle.vat5PercentAed,
          zohoBooksSynced: false,
          contractId: contract.id,
        },
      });
    }

    const driveArchivedFiles: GeneratedWhiteCavesDocs['driveArchivedFiles'] = [];
    if (input.archiveToDrive) {
      try {
        const mode = transition.deal.contractMode === 'RENEWAL_TENANCY' ? 'RENEWAL' : 'NEW';
        const year = new Date().getFullYear();
        const folders = await ensureTenancyStageFolders({
          areaName: transition.deal.area,
          projectName: transition.deal.project,
          unitNumber: transition.deal.unitNumber,
          contractYear: year,
          contractMode: mode,
        });
        const uploads = [
          { name: `${bundle.receiptNumber}_Payment_Receipt.pdf`, buf: bundle.receiptPdfBuffer, sub: `Tenancy Contract/${year}_${mode}/02_Cheques_&_Receipts` },
          { name: `${bundle.vatInvoiceNumber}_VAT_Invoice.pdf`, buf: bundle.vatInvoicePdfBuffer, sub: `Tenancy Contract/${year}_${mode}/02_Cheques_&_Receipts` },
          { name: `${transition.deal.dealId}_Contract_Draft.pdf`, buf: bundle.contractDraftPdfBuffer, sub: `Tenancy Contract/${year}_${mode}/03_Signed_Contracts` },
        ];
        for (const u of uploads) {
          const uploaded = await uploadFileToUnitSubfolder({
            areaName: transition.deal.area,
            projectName: transition.deal.project,
            unitNumber: transition.deal.unitNumber,
            subfolder: u.sub,
            fileName: u.name,
            mimeType: 'application/pdf',
            content: u.buf,
          });
          driveArchivedFiles.push({ name: u.name, fileId: uploaded.file.id || undefined, destination: folders.cyclePath });
        }
      } catch (err) {
        log.warn('Drive archival skipped:', err instanceof Error ? err.message : err);
      }
    }
    generatedDocs = { ...bundle, driveArchivedFiles };
  }

  await db.tenancyContract.update({
    where: { id: contract.id },
    data: {
      status: statusMap[input.nextStage] || contract.status,
      chequesSchedule: { ...scheduleObj, lifecycleState: transition.deal },
    },
  });

  const notifications = await dispatchStageCareAndRenewalNotifications({
    deal: transition.deal,
    stage: input.nextStage,
    contractEndDateIso: contract.leaseEnd ? new Date(contract.leaseEnd).toISOString() : undefined,
    cheques: scheduleObj.cheques || [],
    dbOverride: db,
  });

  return {
    contractId: contract.id,
    ...transition,
    generatedDocs: generatedDocs
      ? {
          receiptNumber: generatedDocs.receiptNumber,
          vatInvoiceNumber: generatedDocs.vatInvoiceNumber,
          commissionAed: generatedDocs.commissionAed,
          vat5PercentAed: generatedDocs.vat5PercentAed,
          totalAgencyFeeAed: generatedDocs.totalAgencyFeeAed,
          receiptPdfBytes: generatedDocs.receiptPdfBuffer.length,
          vatInvoicePdfBytes: generatedDocs.vatInvoicePdfBuffer.length,
          contractDraftPdfBytes: generatedDocs.contractDraftPdfBuffer.length,
          driveArchivedFiles: generatedDocs.driveArchivedFiles,
        }
      : null,
    notifications,
  };
}
