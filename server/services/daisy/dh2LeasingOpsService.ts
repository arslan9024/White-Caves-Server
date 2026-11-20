import crypto from 'node:crypto';
import { prisma } from '../../database.js';

const db = prisma as any;

export interface EjariTenancyInput {
  landlordName: string;
  landlordEmiratesId?: string;
  landlordEmail?: string;
  landlordPhone: string;
  tenantName: string;
  tenantEmiratesId?: string;
  tenantPassport?: string;
  tenantEmail?: string;
  tenantPhone: string;
  community?: string;
  cluster: string;
  unitNumber: string;
  dewaPremiseNumber?: string;
  plotNumber?: string;
  propertyType?: string;
  bedrooms?: number;
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string;  // defaults to +1 year minus 1 day
  annualRentAed: number;
  chequesCount: 1 | 2 | 4 | 6 | 12;
  furnished?: boolean;
  securityDepositAed?: number;
}

export function generateEjariTenancyDraft(input: EjariTenancyInput) {
  const start = new Date(input.startDate);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid startDate (use YYYY-MM-DD)');
  const end = input.endDate
    ? new Date(input.endDate)
    : new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate() - 1));

  // UAE Law No. 33 of 2008: 90-day statutory renewal/amendment notice deadline
  const renewalNoticeDeadline = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const depositPercent = input.furnished ? 0.1 : 0.05;
  const securityDepositAed = input.securityDepositAed ?? Math.round(input.annualRentAed * depositPercent);
  const agencyCommissionAed = Math.max(5000, Math.round(input.annualRentAed * 0.05));
  const agencyVatAed = Math.round(agencyCommissionAed * 0.05);

  const chequeAmount = Math.round(input.annualRentAed / input.chequesCount);
  const intervalMonths = Math.max(1, Math.round(12 / input.chequesCount));
  const chequeSchedule = Array.from({ length: input.chequesCount }, (_, idx) => {
    const due = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + idx * intervalMonths, start.getUTCDate()));
    return {
      chequeNumber: idx + 1,
      dueDate: due.toISOString().slice(0, 10),
      amountAed: idx === input.chequesCount - 1 ? input.annualRentAed - chequeAmount * (input.chequesCount - 1) : chequeAmount,
      payableTo: input.landlordName,
      status: 'PDC_PENDING',
    };
  });

  const contractRef = `WC-EJARI-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  return {
    contractRef,
    ejariStatus: 'DRAFT_READY_FOR_DLD_REGISTRATION',
    brokerage: {
      company: 'WHITE CAVES REAL ESTATE L.L.C',
      agent: 'Daisy (MGR-05-2 — Residential Leasing Desk)',
      jurisdiction: 'Dubai Land Department (DLD) / RERA',
    },
    parties: {
      landlord: {
        name: input.landlordName,
        emiratesId: input.landlordEmiratesId || 'PENDING_VERIFICATION',
        phone: input.landlordPhone,
        email: input.landlordEmail || null,
      },
      tenant: {
        name: input.tenantName,
        emiratesId: input.tenantEmiratesId || 'PENDING_VERIFICATION',
        passport: input.tenantPassport || null,
        phone: input.tenantPhone,
        email: input.tenantEmail || null,
      },
    },
    property: {
      community: input.community || 'DAMAC Hills 2',
      cluster: input.cluster,
      unitNumber: input.unitNumber,
      propertyType: input.propertyType || 'Townhouse / Villa',
      bedrooms: input.bedrooms || 3,
      furnished: Boolean(input.furnished),
      dewaPremiseNumber: input.dewaPremiseNumber || 'REQUIRED_BEFORE_EJARI',
      plotNumber: input.plotNumber || 'PER_TITLE_DEED',
      driveFormulaPath: `Damac Hills 2/${input.cluster}/${input.unitNumber}/Tenancy Contract`,
    },
    term: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      statutory90DayNoticeDate: renewalNoticeDeadline.toISOString().slice(0, 10),
    },
    financials: {
      annualRentAed: input.annualRentAed,
      chequesCount: input.chequesCount,
      securityDepositAed,
      agencyCommissionAed,
      agencyVatAed,
      totalAgencyFeeWithVatAed: agencyCommissionAed + agencyVatAed,
      chequeSchedule,
    },
    statutoryClauses: [
      'Governed by Dubai Law No. (26) of 2007 and Law No. (33) of 2008 regulating the relationship between landlords and tenants in the Emirate of Dubai.',
      `Mandatory 90-day written notice prior to ${renewalNoticeDeadline.toISOString().slice(0, 10)} is required for any rent adjustment (subject to RERA Smart Rental Index) or non-renewal.`,
      'Tenant is responsible for DEWA, Chiller/Empower (if applicable), and Internet utilities; Landlord is responsible for major structural and MEP maintenance above AED 500 per incident.',
      'Ejari registration with Dubai Land Department must be completed upon key handover and cheque clearance.',
    ],
    createdAt: new Date().toISOString(),
  };
}

export function generatePaymentReceipt(input: {
  payerName: string;
  payerPhone?: string;
  category: 'SECURITY_DEPOSIT' | 'AGENCY_COMMISSION' | 'RENT_CHEQUE' | 'BOOKING_DEPOSIT';
  amountAed: number;
  paymentMethod: 'CHEQUE' | 'BANK_TRANSFER' | 'CASH' | 'CARD';
  chequeOrRefNumber?: string;
  cluster: string;
  unitNumber: string;
  contractRef?: string;
  notes?: string;
}) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const receiptNumber = `WC-RCP-${datePart}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const includeVat = input.category === 'AGENCY_COMMISSION';
  const vatAed = includeVat ? Math.round(input.amountAed * 0.05) : 0;

  return {
    receiptNumber,
    issuedAt: new Date().toISOString(),
    issuer: {
      company: 'WHITE CAVES REAL ESTATE L.L.C',
      bankName: 'Mashreq Bank',
      bankBranch: 'Mashreq NEOBiz Digital',
      accountName: 'WHITE CAVES REAL ESTATE L.L.C',
      issuedByAgent: 'Daisy (MGR-05-2 — Residential Leasing)',
    },
    payer: {
      name: input.payerName,
      phone: input.payerPhone || null,
    },
    property: {
      community: 'DAMAC Hills 2',
      cluster: input.cluster,
      unitNumber: input.unitNumber,
      contractRef: input.contractRef || null,
      driveArchivePath: `Damac Hills 2/${input.cluster}/${input.unitNumber}/Tenancy Contract`,
    },
    payment: {
      category: input.category,
      method: input.paymentMethod,
      reference: input.chequeOrRefNumber || 'N/A',
      subtotalAed: input.amountAed,
      vat5PercentAed: vatAed,
      totalReceivedAed: input.amountAed + vatAed,
      currency: 'AED',
      notes: input.notes || 'Official payment receipt issued by White Caves Real Estate LLC.',
    },
  };
}

export async function scan90DayRenewalReminders(windowDays = 90) {
  const now = new Date();
  const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  let leases: any[] = [];

  try {
    leases = await db.lease.findMany({
      where: {
        endDate: { gte: now, lte: horizon },
        status: { in: ['ACTIVE', 'active', 'EXPIRING_SOON', 'expiring_soon'] },
      },
      include: { property: true, tenant: true },
      orderBy: { endDate: 'asc' },
      take: 100,
    });
  } catch {
    leases = [];
  }

  const reminders = leases.map(lease => {
    const endDate = new Date(lease.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const urgency = daysRemaining <= 30 ? 'URGENT_<=30D' : daysRemaining <= 60 ? 'ACTION_REQUIRED_60D' : 'STATUTORY_NOTICE_90D';
    const tenantName = lease.tenant?.name || 'Valued Tenant';
    const unitTitle = lease.property?.title || lease.propertyId || 'DAMAC Hills 2 Unit';
    const endStr = endDate.toISOString().slice(0, 10);

    return {
      leaseId: lease.id,
      tenantName,
      tenantPhone: lease.tenant?.phone || null,
      propertyTitle: unitTitle,
      annualRentAed: lease.annualRent || lease.rentAmount || null,
      endDate: endStr,
      daysRemaining,
      urgency,
      lindaWhatsAppDraft: `Hello ${tenantName}, this is Daisy & Linda from White Caves Real Estate LLC. Per Dubai RERA Law No. 33/2008 (90-day notice window), your tenancy for ${unitTitle} expires on ${endStr} (${daysRemaining} days left). Reply RENEW to lock in your seamless Ejari renewal.`,
    };
  });

  return {
    scannedAt: now.toISOString(),
    windowDays,
    statutoryBasis: 'Dubai Law No. 33 of 2008 — Mandatory 90-Day Renewal Notice',
    totalExpiring: reminders.length,
    reminders,
  };
}
