/**
 * leasingCareNotificationService.ts
 * White Caves Real Estate LLC — Care-Driven Landlord & Tenant Lifecycle Notifications
 *
 * Keeps both Landlords and Tenants warmly informed of every completed stage and exact next step
 * via Primary Master WhatsApp (+971505760056) and CRM Portal Notifications.
 */

import { PRIMARY_MASTER_PHONE } from '../whatsapp/leasingSimOutreachFormula.js';
import type { LeasingDealStage, TenancyContractMode } from './tenancyLifecycleFormula.js';

export interface CareNotificationEnvelope {
  recipientType: 'LANDLORD' | 'TENANT';
  recipientName: string;
  recipientPhone: string;
  senderWhatsApp: string;
  stage: LeasingDealStage;
  subject: string;
  completedStep: string;
  nextStepRequired: string;
  whatsappMessage: string;
  createdAt: string;
}

export function buildStageCareNotifications(input: {
  stage: LeasingDealStage;
  contractMode: TenancyContractMode;
  area: string;
  project: string;
  unitNumber: string;
  landlordName: string;
  landlordPhone: string;
  tenantName?: string;
  tenantPhone?: string;
  appointmentIso?: string;
  annualRentAed?: number;
  contractEndDateIso?: string;
}): CareNotificationEnvelope[] {
  const unitLabel = `${input.project} Unit ${input.unitNumber}, ${input.area}`;
  const now = new Date().toISOString();
  const list: CareNotificationEnvelope[] = [];

  const pushLandlord = (subject: string, completedStep: string, nextStepRequired: string, body: string) => {
    list.push({
      recipientType: 'LANDLORD',
      recipientName: input.landlordName,
      recipientPhone: input.landlordPhone,
      senderWhatsApp: PRIMARY_MASTER_PHONE,
      stage: input.stage,
      subject,
      completedStep,
      nextStepRequired,
      whatsappMessage: body,
      createdAt: now,
    });
  };

  const pushTenant = (subject: string, completedStep: string, nextStepRequired: string, body: string) => {
    if (!input.tenantName || !input.tenantPhone) return;
    list.push({
      recipientType: 'TENANT',
      recipientName: input.tenantName,
      recipientPhone: input.tenantPhone,
      senderWhatsApp: PRIMARY_MASTER_PHONE,
      stage: input.stage,
      subject,
      completedStep,
      nextStepRequired,
      whatsappMessage: body,
      createdAt: now,
    });
  };

  const dewaReq =
    input.contractMode === 'NEW_TENANCY'
      ? 'Ejari Certificate PDF + DEWA Security Deposit Receipt PDF'
      : 'Renewed Ejari Certificate PDF + Latest DEWA Bill PDF';

  switch (input.stage) {
    case 'STAGE_03_MD_PRICE_NEGOTIATION':
      pushLandlord(
        'Leasing Consultation Confirmed',
        'Availability registered in White Caves Master Vault',
        'Brief price & terms discussion with Arslan Malik (MD)',
        `Dear ${input.landlordName}, thank you for confirming availability for ${unitLabel}. This is Arslan Malik from White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}). Our brief discussion is scheduled${input.appointmentIso ? ` for ${input.appointmentIso}` : ''} to finalize your target rent and terms so we can match verified tenants quickly.`
      );
      break;
    case 'STAGE_06_OFFER_SUBMITTED_AND_APPROVED':
      pushLandlord(
        'Tenant Offer Approved — Proceeding to Cheque Collection',
        'Offer terms approved',
        'We are collecting cheques & fees from the tenant first before sending contract for your signature',
        `Dear ${input.landlordName}, wonderful news! The offer for ${unitLabel}${input.annualRentAed ? ` at AED ${input.annualRentAed.toLocaleString()}/year` : ''} is approved. Per White Caves protection policy, we will collect cheques & fees and obtain the tenant's signature first before requesting your countersignature.`
      );
      pushTenant(
        'Congratulations — Your Rental Offer is Approved!',
        'Landlord approved your offer',
        'Submit security deposit, rent cheques & agency fee to proceed to contract signing',
        `Dear ${input.tenantName}, congratulations! The landlord has approved your offer for ${unitLabel}. Our next step is cheque & fee collection, followed immediately by your tenancy contract signature. Reply anytime — I am personally assisting you.`
      );
      break;
    case 'STAGE_07_CHEQUES_AND_FEES_COLLECTED':
      pushTenant(
        'Official Payment Receipt Issued — Ready for Your Signature',
        'Cheques & agency fees received and receipted',
        'Review and sign your Dubai Tenancy Contract (Tenant signs first)',
        `Dear ${input.tenantName}, we have received your cheques and fees for ${unitLabel} and issued your official White Caves payment receipt. Next step: please sign the tenancy contract so we can complete payment clearance and obtain the landlord's signature.`
      );
      break;
    case 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED':
      pushLandlord(
        'Payment Cleared — Ready for Your Countersignature',
        'Tenant signed & payment clearance verified',
        'Countersign the tenancy contract so Ejari & DEWA can be finalized',
        `Dear ${input.landlordName}, all payments and tenant signatures for ${unitLabel} are now verified and cleared. Please countersign the tenancy contract so we can finalize Ejari registration smoothly.`
      );
      break;
    case 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED':
      pushTenant(
        'Contract Fully Executed — Ejari & DEWA Step',
        'Landlord countersigned your Tenancy Contract',
        `Submit ${dewaReq} (upload in portal or send directly to me on WhatsApp for VIP service)`,
        `Dear ${input.tenantName}, your Tenancy Contract for ${unitLabel} is now fully signed by both parties! Next step: please share your ${dewaReq} — you can upload directly in our portal or simply send the PDFs to me here on WhatsApp and I will file them for you.`
      );
      break;
    case 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED':
      pushLandlord(
        'Tenancy Complete — Ejari & Receipts Filed',
        'Ejari & DEWA verified and archived; renewal calendar set',
        `90-day statutory RERA renewal check scheduled ahead of ${input.contractEndDateIso || 'contract end'}`,
        `Dear ${input.landlordName}, your lease for ${unitLabel} is officially complete! Copies of the signed contract, Ejari, DEWA verification, and receipts are safely archived in your property folder, and your 90-day RERA renewal reminder is set on our calendar.`
      );
      pushTenant(
        'Welcome Home — Tenancy Complete & Filed',
        'Ejari, DEWA & payment receipts verified',
        `Enjoy your home — we will notify you 90 days before ${input.contractEndDateIso || 'renewal'} with zero hassle`,
        `Dear ${input.tenantName}, welcome home to ${unitLabel}! Your Ejari, DEWA documentation, and payment receipts are all confirmed and filed. Our team is always one WhatsApp message away whenever you need support.`
      );
      break;
    default:
      pushLandlord(
        `Stage Update: ${input.stage}`,
        `Completed ${input.stage}`,
        'White Caves Leasing Desk is progressing to the next milestone',
        `Dear ${input.landlordName}, quick update on ${unitLabel}: we have completed ${input.stage} and are moving forward with care.`
      );
  }

  return list;
}
