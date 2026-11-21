/**
 * tenancyLifecycleFormula.ts
 * White Caves Real Estate LLC — 12-Stage Dubai Residential Leasing & Tenancy Contract Formula
 *
 * Codifies 7 years of Dubai leasing execution experience into an enforced state machine:
 * Mission 1 (Discovery) -> Mission 2 (MD Negotiation & Calendar) -> Viewings & Offer ->
 * Mandatory Sequence: Cheques & Fees First -> Tenant Signs First -> Payment Clearance ->
 * Landlord Countersigns -> Ejari + DEWA Deposit Receipt (New) / Latest DEWA Bill (Renewal) ->
 * Google Drive Stage Archival -> Calendar 90-Day Renewal Cycle & Care Notifications.
 */

import { assertTaskClearance, type LeasingTaskPermission, type OrgJobRole } from '../rbac/leasingRoleClearanceMatrix.js';

export type TenancyContractMode = 'NEW_TENANCY' | 'RENEWAL_TENANCY';

export type LeasingDealStage =
  | 'STAGE_01_LANDLORD_OUTREACH'
  | 'STAGE_02_INVENTORY_VERIFIED'
  | 'STAGE_03_MD_PRICE_NEGOTIATION'
  | 'STAGE_04_INVENTORY_LIVE_PUBLISHED'
  | 'STAGE_05_TENANT_VIEWING_SCHEDULED'
  | 'STAGE_06_OFFER_SUBMITTED_AND_APPROVED'
  | 'STAGE_07_CHEQUES_AND_FEES_COLLECTED'
  | 'STAGE_08_TENANT_SIGNED_FIRST'
  | 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED'
  | 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED'
  | 'STAGE_11_EJARI_AND_DEWA_REGISTERED'
  | 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED';

export interface StageRuleSpec {
  order: number;
  stage: LeasingDealStage;
  title: string;
  mission: 'MISSION_1_INVENTORY_GENERATION' | 'MISSION_2_MD_NEGOTIATION' | 'MISSION_3_LEASING_CLOSING';
  requiredPermission: LeasingTaskPermission;
  allowedActors: OrgJobRole[];
  driveSubfolder: string;
  mandatoryChecklist: string[];
}

export const LEASING_12_STAGE_FORMULA: StageRuleSpec[] = [
  { order: 1, stage: 'STAGE_01_LANDLORD_OUTREACH', title: 'Landlord Availability Outreach (Hunter SIMs)', mission: 'MISSION_1_INVENTORY_GENERATION', requiredPermission: 'RUN_HUNTER_OUTREACH_CAMPAIGN', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'LEASING_AGENT'], driveSubfolder: 'Landlord Documents', mandatoryChecklist: ['Unit availability confirmed via Hunter SIM'] },
  { order: 2, stage: 'STAGE_02_INVENTORY_VERIFIED', title: 'Inventory Logged in Mary Vault & Drive Formula Enforced', mission: 'MISSION_1_INVENTORY_GENERATION', requiredPermission: 'LOG_DISCOVERED_INVENTORY', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'LEASING_AGENT'], driveSubfolder: 'House Pictures', mandatoryChecklist: ['Area/Project/Unit Drive folder enforced', 'Logged in Mary Vault with discoveredByUserId'] },
  { order: 3, stage: 'STAGE_03_MD_PRICE_NEGOTIATION', title: 'MD Primary Master Follow-Up & Price Negotiation Call / Google Meet', mission: 'MISSION_2_MD_NEGOTIATION', requiredPermission: 'NEGOTIATE_LANDLORD_PRICE', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER'], driveSubfolder: 'Landlord Documents', mandatoryChecklist: ['Primary Master (+971505760056) follow-up sent', 'Google Calendar appointment completed with Landlord'] },
  { order: 4, stage: 'STAGE_04_INVENTORY_LIVE_PUBLISHED', title: 'Updated Price, Status & Requirements Published Live', mission: 'MISSION_2_MD_NEGOTIATION', requiredPermission: 'PUBLISH_LIVE_WEB_LISTING', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER'], driveSubfolder: 'House Pictures', mandatoryChecklist: ['Negotiated rent & cheque count updated in Mary Vault', 'Published to White-Caves-Web SEO pages'] },
  { order: 5, stage: 'STAGE_05_TENANT_VIEWING_SCHEDULED', title: 'Hot Tenant Lead Connected & Viewing Completed', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'SCHEDULE_TENANT_VIEWING', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'LEASING_AGENT'], driveSubfolder: 'Tenant Documents', mandatoryChecklist: ['Viewing scheduled on MD Google Calendar', 'Viewing feedback recorded'] },
  { order: 6, stage: 'STAGE_06_OFFER_SUBMITTED_AND_APPROVED', title: 'Tenant Offer Submitted & Approved by Landlord', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'APPROVE_LANDLORD_OFFER', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'LANDLORD'], driveSubfolder: 'Tenancy Contract/01_Offer_&_Approvals', mandatoryChecklist: ['Written tenant offer received', 'Landlord written approval confirmed'] },
  { order: 7, stage: 'STAGE_07_CHEQUES_AND_FEES_COLLECTED', title: 'Cheques & Agency Fees Collected FIRST (+ Official Receipts)', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'COLLECT_CHEQUES_AND_FEES', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER'], driveSubfolder: 'Tenancy Contract/02_Cheques_&_Receipts', mandatoryChecklist: ['Security deposit collected', 'Rent cheques collected', 'Agency commission + 5% VAT collected', 'Payment receipt issued'] },
  { order: 8, stage: 'STAGE_08_TENANT_SIGNED_FIRST', title: 'Tenant Signs Tenancy Contract FIRST', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'COLLECT_CHEQUES_AND_FEES', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'TENANT'], driveSubfolder: 'Tenancy Contract/03_Signed_Contracts', mandatoryChecklist: ['Tenant Emirates ID & Passport verified', 'Tenant signature applied BEFORE Landlord'] },
  { order: 9, stage: 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED', title: 'Payment Clearance Gate Verified', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'VERIFY_PAYMENT_CLEARANCE', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'DOCUMENT_CONTROLLER'], driveSubfolder: 'Tenancy Contract/02_Cheques_&_Receipts', mandatoryChecklist: ['Deposit / initial rent / agency fee cleared in bank'] },
  { order: 10, stage: 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED', title: 'Landlord Countersigns Tenancy Contract', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'APPROVE_LANDLORD_OFFER', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'LANDLORD'], driveSubfolder: 'Tenancy Contract/03_Signed_Contracts', mandatoryChecklist: ['Landlord signature applied AFTER payment clearance'] },
  { order: 11, stage: 'STAGE_11_EJARI_AND_DEWA_REGISTERED', title: 'Ejari Certificate & DEWA PDF Submitted (Self or MD VIP Proxy)', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'UPLOAD_EJARI_AND_DEWA', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER', 'DOCUMENT_CONTROLLER', 'TENANT'], driveSubfolder: 'Tenancy Contract/04_Ejari_&_DEWA', mandatoryChecklist: ['Ejari Certificate PDF uploaded to Drive', 'DEWA Deposit Receipt (New) or Latest DEWA Bill (Renewal) uploaded to Drive'] },
  { order: 12, stage: 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED', title: 'Active Tenancy — Receipts Shared & Calendar 90-Day Renewal Set', mission: 'MISSION_3_LEASING_CLOSING', requiredPermission: 'SCHEDULE_MD_CALENDAR_MEETING', allowedActors: ['MANAGING_DIRECTOR', 'MANAGER'], driveSubfolder: 'Tenancy Contract/04_Ejari_&_DEWA', mandatoryChecklist: ['Receipts & Ejari shared with Landlord & Tenant', 'Google Calendar 90-day statutory notice & expiry reminders created'] },
];

export interface TenancyDealState {
  dealId: string;
  contractMode: TenancyContractMode;
  area: string;
  project: string;
  unitNumber: string;
  landlordName: string;
  landlordPhone: string;
  tenantName?: string;
  tenantPhone?: string;
  annualRentAed?: number;
  chequesCount?: number;
  currentStage: LeasingDealStage;
  chequesCollected: boolean;
  feesCollected: boolean;
  tenantSigned: boolean;
  paymentCleared: boolean;
  landlordSigned: boolean;
  ejariPdfFileId?: string;
  dewaProofPdfFileId?: string;
  dewaProofType?: 'DEWA_DEPOSIT_RECEIPT_NEW' | 'DEWA_LATEST_BILL_RENEWAL';
  vipProxyActions: Array<{ stage: LeasingDealStage; byRole: OrgJobRole; byUserId: string; note: string; at: string }>;
  history: Array<{ stage: LeasingDealStage; actorRole: OrgJobRole; actorUserId: string; note?: string; at: string }>;
}

export function getStageSpec(stage: LeasingDealStage): StageRuleSpec {
  const spec = LEASING_12_STAGE_FORMULA.find(s => s.stage === stage);
  if (!spec) throw new Error(`Unknown leasing stage: ${stage}`);
  return spec;
}

export function getRequiredDewaDocumentType(mode: TenancyContractMode): {
  type: 'DEWA_DEPOSIT_RECEIPT_NEW' | 'DEWA_LATEST_BILL_RENEWAL';
  label: string;
} {
  return mode === 'NEW_TENANCY'
    ? { type: 'DEWA_DEPOSIT_RECEIPT_NEW', label: 'DEWA Security Deposit Receipt PDF (Required for New Tenancy)' }
    : { type: 'DEWA_LATEST_BILL_RENEWAL', label: 'Latest DEWA Bill PDF (Required for Tenancy Renewal)' };
}

export function advanceTenancyStage(input: {
  deal: TenancyDealState;
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
}): { deal: TenancyDealState; driveStagePath: string; nextRecommendedStage: LeasingDealStage | null } {
  const currentSpec = getStageSpec(input.deal.currentStage);
  const nextSpec = getStageSpec(input.nextStage);

  if (nextSpec.order !== currentSpec.order + 1) {
    throw new Error(
      `Stage Sequence Violation: Cannot jump from ${currentSpec.stage} (#${currentSpec.order}) to ${nextSpec.stage} (#${nextSpec.order}). Follow the 12-stage formula in order.`
    );
  }

  if (input.vipProxyOnBehalfOfClient) {
    assertTaskClearance(input.actorRole, 'VIP_PROXY_UPLOAD_ON_BEHALF');
  } else {
    assertTaskClearance(input.actorRole, nextSpec.requiredPermission);
  }

  const updated: TenancyDealState = {
    ...input.deal,
    chequesCollected: input.evidence?.chequesCollected ?? input.deal.chequesCollected,
    feesCollected: input.evidence?.feesCollected ?? input.deal.feesCollected,
    tenantSigned: input.evidence?.tenantSigned ?? input.deal.tenantSigned,
    paymentCleared: input.evidence?.paymentCleared ?? input.deal.paymentCleared,
    landlordSigned: input.evidence?.landlordSigned ?? input.deal.landlordSigned,
    ejariPdfFileId: input.evidence?.ejariPdfFileId ?? input.deal.ejariPdfFileId,
    dewaProofPdfFileId: input.evidence?.dewaProofPdfFileId ?? input.deal.dewaProofPdfFileId,
    vipProxyActions: [...input.deal.vipProxyActions],
    history: [...input.deal.history],
  };

  if (input.nextStage === 'STAGE_07_CHEQUES_AND_FEES_COLLECTED' && (!updated.chequesCollected || !updated.feesCollected)) {
    throw new Error('Mandatory Gate: Both rent/deposit cheques AND agency fees must be collected first.');
  }
  if (input.nextStage === 'STAGE_08_TENANT_SIGNED_FIRST') {
    if (!updated.chequesCollected || !updated.feesCollected) {
      throw new Error('Mandatory Gate: Collect cheques & fees BEFORE tenant signs.');
    }
    if (!updated.tenantSigned) throw new Error('Mandatory Gate: Confirm tenantSigned=true to complete Stage 8.');
  }
  if (input.nextStage === 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED') {
    if (!updated.tenantSigned) throw new Error('Mandatory Gate: Tenant must sign first before payment clearance stage.');
    if (!updated.paymentCleared) throw new Error('Mandatory Gate: Confirm paymentCleared=true before releasing to Landlord.');
  }
  if (input.nextStage === 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED') {
    if (!updated.paymentCleared) throw new Error('Mandatory Gate: Payment clearance MUST be verified BEFORE Landlord countersigns.');
    if (!updated.landlordSigned) throw new Error('Mandatory Gate: Confirm landlordSigned=true.');
  }
  if (input.nextStage === 'STAGE_11_EJARI_AND_DEWA_REGISTERED') {
    const reqDewa = getRequiredDewaDocumentType(updated.contractMode);
    if (!updated.ejariPdfFileId || !updated.dewaProofPdfFileId) {
      throw new Error(`Mandatory Gate: Both Ejari PDF and ${reqDewa.label} are required.`);
    }
    updated.dewaProofType = reqDewa.type;
  }

  const now = new Date().toISOString();
  updated.currentStage = input.nextStage;
  updated.history.push({
    stage: input.nextStage,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    note: input.note,
    at: now,
  });
  if (input.vipProxyOnBehalfOfClient) {
    updated.vipProxyActions.push({
      stage: input.nextStage,
      byRole: input.actorRole,
      byUserId: input.actorUserId,
      note: input.note || 'VIP white-glove proxy submission via Managing Director',
      at: now,
    });
  }

  const nextSpecAfter = LEASING_12_STAGE_FORMULA.find(s => s.order === nextSpec.order + 1);
  const driveStagePath = `${updated.area}/${updated.project}/${updated.unitNumber}/${nextSpec.driveSubfolder}`;

  return {
    deal: updated,
    driveStagePath,
    nextRecommendedStage: nextSpecAfter ? nextSpecAfter.stage : null,
  };
}
