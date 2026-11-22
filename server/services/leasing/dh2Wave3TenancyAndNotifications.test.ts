import { describe, expect, it, vi } from 'vitest';
import {
  advancePersistedTenancyDealStage,
  createPersistedTenancyDeal,
  generateOfficialTenancyDocsBundle,
} from './tenancyDealPersistenceAndDocsService.js';

describe('Wave 3 — DB-Persisted 12-Stage Tenancy Lifecycle, PDF Receipts/VAT Invoices & Care/Renewal Engine', () => {
  it('generates valid PDF-1.4 buffers for Payment Receipt, 5% UAE VAT Invoice & Tenancy Contract Draft', () => {
    const bundle = generateOfficialTenancyDocsBundle({
      deal: {
        dealId: 'WC-TC-2026-1001',
        contractMode: 'NEW_TENANCY',
        area: 'Damac Hills 2',
        project: 'Camelia',
        unitNumber: '343',
        landlordName: 'Mr. Tariq',
        landlordPhone: '+971501112233',
        tenantName: 'Sarah Johnson',
        tenantPhone: '+971509998877',
        annualRentAed: 100000,
        chequesCount: 4,
        currentStage: 'STAGE_07_CHEQUES_AND_FEES_COLLECTED',
        chequesCollected: true,
        feesCollected: true,
        tenantSigned: false,
        paymentCleared: false,
        landlordSigned: false,
        vipProxyActions: [],
        history: [],
      },
      sequenceNumber: 1001,
    });

    expect(bundle.receiptNumber).toContain('WC-RCPT-');
    expect(bundle.vatInvoiceNumber).toContain('WC-VAT-');
    expect(bundle.commissionAed).toBe(5000);
    expect(bundle.vat5PercentAed).toBe(250);
    expect(bundle.totalAgencyFeeAed).toBe(5250);
    expect(bundle.receiptPdfBuffer.toString('utf8', 0, 8)).toBe('%PDF-1.4');
    expect(bundle.vatInvoicePdfBuffer.toString('utf8', 0, 8)).toBe('%PDF-1.4');
    expect(bundle.contractDraftPdfBuffer.toString('utf8', 0, 8)).toBe('%PDF-1.4');
  });

  it('persists 12-stage transitions enforcing Cheques FIRST -> Tenant Signs -> Clearance -> Landlord Signs -> Ejari/DEWA -> Renewal & Cheque Alerts', async () => {
    let storedContract: any = null;
    const receiptLogs: any[] = [];
    const followUpRows: any[] = [];

    const mockDb = {
      tenancyContract: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          storedContract = { id: 'tc-db-1', ...data };
          return storedContract;
        }),
        findUnique: vi.fn().mockImplementation(async () => storedContract),
        update: vi.fn().mockImplementation(async ({ data }) => {
          storedContract = { ...storedContract, ...data };
          return storedContract;
        }),
      },
      financialReceiptLog: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          receiptLogs.push(data);
          return data;
        }),
      },
      followUpQueue: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const row = { id: `fq-${followUpRows.length + 1}`, ...data };
          followUpRows.push(row);
          return row;
        }),
      },
    };

    const created = await createPersistedTenancyDeal({
      propertyId: 'prop-camelia-343',
      contractMode: 'NEW_TENANCY',
      project: 'Camelia',
      unitNumber: '343',
      landlordName: 'Mr. Tariq',
      landlordPhone: '+971501112233',
      tenantName: 'Sarah Johnson',
      tenantPhone: '+971509998877',
      annualRentAed: 100000,
      chequesCount: 4,
      leaseStartIso: '2026-12-01T00:00:00Z',
      leaseEndIso: '2027-11-30T00:00:00Z',
      cheques: [
        { installment: 1, chequeNumber: 'CHQ-001', bankName: 'Emirates NBD', amountAed: 25000, dueDateIso: '2026-12-01T00:00:00Z', status: 'PENDING' },
        { installment: 2, chequeNumber: 'CHQ-002', bankName: 'Emirates NBD', amountAed: 25000, dueDateIso: '2027-03-01T00:00:00Z', status: 'PENDING' },
      ],
      dbOverride: mockDb,
    });

    // Attempting to jump directly to Tenant Signed before Cheques Collected must throw
    await expect(
      advancePersistedTenancyDealStage({
        contractId: created.contractId,
        nextStage: 'STAGE_08_TENANT_SIGNED_FIRST',
        actorRole: 'MANAGING_DIRECTOR',
        actorUserId: 'md-arslan',
        evidence: { tenantSigned: true },
        dbOverride: mockDb,
      })
    ).rejects.toThrow(/Stage Sequence Violation/);

    // Stage 7: Cheques & Fees FIRST -> generates PDFs & persists FinancialReceiptLog
    const s7 = await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_07_CHEQUES_AND_FEES_COLLECTED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      evidence: { chequesCollected: true, feesCollected: true },
      dbOverride: mockDb,
    });
    expect(s7.generatedDocs?.commissionAed).toBe(5000);
    expect(s7.generatedDocs?.vat5PercentAed).toBe(250);
    expect(receiptLogs).toHaveLength(1);

    // Stage 8 -> 9 -> 10 -> 11 -> 12
    await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_08_TENANT_SIGNED_FIRST',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      evidence: { tenantSigned: true },
      dbOverride: mockDb,
    });
    await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      evidence: { paymentCleared: true },
      dbOverride: mockDb,
    });
    await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      evidence: { landlordSigned: true },
      dbOverride: mockDb,
    });
    await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_11_EJARI_AND_DEWA_REGISTERED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      evidence: { ejariPdfFileId: 'drive-ejari-1', dewaProofPdfFileId: 'drive-dewa-1' },
      dbOverride: mockDb,
    });
    const s12 = await advancePersistedTenancyDealStage({
      contractId: created.contractId,
      nextStage: 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan',
      dbOverride: mockDb,
    });

    expect(storedContract.status).toBe('ACTIVE');
    expect(s12.notifications.chequeT7dAlertsScheduled).toBe(2);
    expect(s12.notifications.rera90DayNoticeScheduled).toBe(true);
    expect(s12.notifications.stageNotificationsQueued).toBe(2);
  });
});
