import { describe, expect, it, vi } from 'vitest';
import {
  filterInventoryByActorScope,
  hasTaskPermission,
} from '../rbac/leasingRoleClearanceMatrix.js';
import {
  createHunterToPrimaryMasterHandoff,
  enforceSimDispatchPolicy,
  getAllSimLines,
  PRIMARY_MASTER_PHONE,
  registerEmployeeHunterSim,
} from '../whatsapp/leasingSimOutreachFormula.js';
import {
  advanceTenancyStage,
  getRequiredDewaDocumentType,
  type TenancyDealState,
} from './tenancyLifecycleFormula.js';
import { buildStageCareNotifications } from './leasingCareNotificationService.js';
import {
  scheduleMdLeasingAppointment,
  scheduleTenancyRenewalCalendarMilestones,
} from '../google/googleCalendarServiceAccount.js';

describe('White Caves 10-SIM Hunter/Closer, RBAC & 12-Stage Tenancy Formula', () => {
  it('enforces 10-SIM Hunter/Closer separation and future employee SIM onboarding', () => {
    expect(getAllSimLines().length).toBeGreaterThanOrEqual(10);

    // Hunter SIM allowed for Mission 1 outreach
    expect(
      enforceSimDispatchPolicy({
        simPhone: '+971503869886',
        mission: 'MISSION_1_LANDLORD_AVAILABILITY_OUTREACH',
        actorRole: 'LEASING_AGENT',
      }).allowed
    ).toBe(true);

    // Hunter SIM BLOCKED from Mission 2 follow-up/negotiation
    expect(() =>
      enforceSimDispatchPolicy({
        simPhone: '+971503869886',
        mission: 'MISSION_2_PRIMARY_FOLLOWUP_AND_NEGOTIATION',
        actorRole: 'MANAGING_DIRECTOR',
      })
    ).toThrow(/Only Primary Master Closer/);

    // Primary Master SIM BLOCKED from cold outreach blasts
    expect(() =>
      enforceSimDispatchPolicy({
        simPhone: PRIMARY_MASTER_PHONE,
        mission: 'MISSION_1_LANDLORD_AVAILABILITY_OUTREACH',
        actorRole: 'MANAGING_DIRECTOR',
      })
    ).toThrow(/protected from cold outreach/);

    // Leasing Agent BLOCKED from Primary Master follow-up
    expect(() =>
      enforceSimDispatchPolicy({
        simPhone: PRIMARY_MASTER_PHONE,
        mission: 'MISSION_2_PRIMARY_FOLLOWUP_AND_NEGOTIATION',
        actorRole: 'LEASING_AGENT',
      })
    ).toThrow(/RBAC Clearance Denied/);

    // Future human leasing agent registers their own Hunter SIM
    const agentSim = registerEmployeeHunterSim({
      phoneNumber: '+971541234567',
      displayName: 'Agent Tariq Hunter Line',
      assignedUserId: 'agent-tariq',
      actorRole: 'LEASING_AGENT',
    });
    expect(agentSim.tier).toBe('HUNTER_OUTREACH');

    const handoff = createHunterToPrimaryMasterHandoff({
      hunterSimPhone: '+971541234567',
      discoveredByUserId: 'agent-tariq',
      discoveredByRole: 'LEASING_AGENT',
      landlordName: 'Mr. Khalid',
      landlordPhone: '+971509876543',
      area: 'Damac Hills 2',
      project: 'Pacifica',
      unitNumber: '343',
      askingRentAed: 115000,
    });
    expect(handoff.assignedCloser.phoneNumber).toBe(PRIMARY_MASTER_PHONE);
    expect(handoff.inventoryFormulaPath).toBe('Damac Hills 2/Pacifica/343');
  });

  it('scopes Mary Inventory Vault: MD sees ALL, Leasing Agents see ONLY own discovered units', () => {
    const sample = [
      { id: 'u1', title: 'Pacifica 343', discoveredByUserId: 'agent-tariq' },
      { id: 'u2', title: 'Camelia 102', discoveredByUserId: 'md-arslan-malik' },
    ];
    const mdView = filterInventoryByActorScope(sample, { userId: 'md-arslan-malik', role: 'MANAGING_DIRECTOR' });
    expect(mdView.scope).toBe('ALL_COMPANY_INVENTORY');
    expect(mdView.total).toBe(2);

    const agentView = filterInventoryByActorScope(sample, { userId: 'agent-tariq', role: 'LEASING_AGENT' });
    expect(agentView.scope).toBe('AGENT_DISCOVERED_ONLY');
    expect(agentView.total).toBe(1);
    expect(agentView.items[0].id).toBe('u1');
    expect(hasTaskPermission('MANAGING_DIRECTOR', 'VIP_PROXY_UPLOAD_ON_BEHALF')).toBe(true);
    expect(hasTaskPermission('LEASING_AGENT', 'VIP_PROXY_UPLOAD_ON_BEHALF')).toBe(false);
  });

  it('enforces exact sequential tenancy closing gates + VIP MD proxy upload + DEWA New vs Renewal rules', () => {
    let deal: TenancyDealState = {
      dealId: 'deal-343',
      contractMode: 'NEW_TENANCY',
      area: 'Damac Hills 2',
      project: 'Pacifica',
      unitNumber: '343',
      landlordName: 'Mr. Khalid',
      landlordPhone: '+971509876543',
      tenantName: 'Ms. Nadia',
      tenantPhone: '+971521112233',
      annualRentAed: 115000,
      chequesCount: 4,
      currentStage: 'STAGE_06_OFFER_SUBMITTED_AND_APPROVED',
      chequesCollected: false,
      feesCollected: false,
      tenantSigned: false,
      paymentCleared: false,
      landlordSigned: false,
      vipProxyActions: [],
      history: [],
    };

    // Cannot jump directly to Tenant Signed before Stage 7 Cheques & Fees
    expect(() =>
      advanceTenancyStage({
        deal,
        nextStage: 'STAGE_08_TENANT_SIGNED_FIRST',
        actorRole: 'MANAGING_DIRECTOR',
        actorUserId: 'md-arslan-malik',
        evidence: { tenantSigned: true },
      })
    ).toThrow(/Stage Sequence Violation/);

    // Stage 7: Collect cheques & fees FIRST
    deal = advanceTenancyStage({
      deal,
      nextStage: 'STAGE_07_CHEQUES_AND_FEES_COLLECTED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan-malik',
      evidence: { chequesCollected: true, feesCollected: true },
    }).deal;

    // Stage 8: Tenant signs FIRST
    deal = advanceTenancyStage({
      deal,
      nextStage: 'STAGE_08_TENANT_SIGNED_FIRST',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan-malik',
      vipProxyOnBehalfOfClient: true,
      evidence: { tenantSigned: true },
    }).deal;

    // Stage 9: Payment clearance verified
    deal = advanceTenancyStage({
      deal,
      nextStage: 'STAGE_09_PAYMENT_CLEARANCE_VERIFIED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan-malik',
      evidence: { paymentCleared: true },
    }).deal;

    // Stage 10: Landlord countersigns AFTER clearance
    deal = advanceTenancyStage({
      deal,
      nextStage: 'STAGE_10_LANDLORD_SIGNED_COUNTERSIGNED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan-malik',
      evidence: { landlordSigned: true },
    }).deal;

    // Stage 11: MD VIP Proxy uploads Ejari + DEWA Deposit Receipt PDF
    const step11 = advanceTenancyStage({
      deal,
      nextStage: 'STAGE_11_EJARI_AND_DEWA_REGISTERED',
      actorRole: 'MANAGING_DIRECTOR',
      actorUserId: 'md-arslan-malik',
      vipProxyOnBehalfOfClient: true,
      note: 'Client shared PDFs on WhatsApp; uploaded by MD VIP concierge',
      evidence: { ejariPdfFileId: 'drive-ejari-pdf', dewaProofPdfFileId: 'drive-dewa-deposit-pdf' },
    });
    expect(step11.deal.dewaProofType).toBe('DEWA_DEPOSIT_RECEIPT_NEW');
    expect(step11.deal.vipProxyActions.length).toBe(2);
    expect(step11.driveStagePath).toBe('Damac Hills 2/Pacifica/343/Tenancy Contract/04_Ejari_&_DEWA');

    expect(getRequiredDewaDocumentType('RENEWAL_TENANCY').type).toBe('DEWA_LATEST_BILL_RENEWAL');

    const notifications = buildStageCareNotifications({
      stage: 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED',
      contractMode: 'NEW_TENANCY',
      area: 'Damac Hills 2',
      project: 'Pacifica',
      unitNumber: '343',
      landlordName: 'Mr. Khalid',
      landlordPhone: '+971509876543',
      tenantName: 'Ms. Nadia',
      tenantPhone: '+971521112233',
      contractEndDateIso: '2027-11-30',
    });
    expect(notifications.length).toBe(2);
    expect(notifications.every(n => n.senderWhatsApp === PRIMARY_MASTER_PHONE)).toBe(true);
  });

  it('schedules MD Google Calendar appointments & 90-day RERA renewal milestones', async () => {
    const insert = vi.fn(async ({ requestBody }: any) => ({
      data: { id: `evt-${Math.random().toString(36).slice(2, 6)}`, htmlLink: 'https://calendar.google.com/event' },
    }));
    const mockClient = { calendar: { events: { insert } } as any, email: 'gorahabot@white-caves-fb-486818.iam.gserviceaccount.com' };

    const appt = await scheduleMdLeasingAppointment({
      kind: 'LANDLORD_PRICE_NEGOTIATION',
      contactName: 'Mr. Khalid',
      contactPhone: '+971509876543',
      project: 'Pacifica',
      unitNumber: '343',
      startIso: '2026-11-22T11:00:00+04:00',
      channel: 'GOOGLE_MEET',
      clientOverride: mockClient,
    });
    expect(appt.scheduled).toBe(true);

    const milestones = await scheduleTenancyRenewalCalendarMilestones({
      project: 'Pacifica',
      unitNumber: '343',
      landlordName: 'Mr. Khalid',
      tenantName: 'Ms. Nadia',
      contractEndDateIso: '2027-11-30',
      annualRentAed: 115000,
      clientOverride: mockClient,
    });
    expect(milestones.notice90DayDate).toBe('2027-09-01');
    expect(milestones.final30DayDate).toBe('2027-10-31');
    expect(insert).toHaveBeenCalledTimes(3);
  });
});
