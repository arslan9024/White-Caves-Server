/**
 * Seed data & helpers for Internal Leasing Operations
 */

import { inMemoryLeads, inMemoryViewings } from '../../routes/publicLeasing.js';

export const VALID_LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'VIEWING_SCHEDULED',
  'VIEWING_COMPLETED',
  'OFFER_MADE',
  'CONTRACT_DRAFTED',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export const VALID_VIEWING_STATUSES = [
  'REQUESTED',
  'CONFIRMED',
  'RESCHEDULED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export const humanTakeoverLocks = new Map<string, { agentName: string; expiresAt: number }>();

const SEED_LEADS: Array<Record<string, any>> = [
  {
    id: 'lead-seed-101',
    tenantName: 'Sophie Bernard',
    name: 'Sophie Bernard',
    tenantPhone: '+971529876543',
    phone: '+971529876543',
    tenantEmail: 'sophie.bernard@example.ae',
    propertyId: '673a10000000000000000101',
    propertyTitle: '3BR Corner Townhouse with Private Garden in Camelia',
    community: 'DAMAC Hills 2',
    subCommunity: 'Camelia',
    annualRentAed: 90000,
    chequesCount: 4,
    assignedAgentId: 'wc-agent-arslan',
    source: 'WEB_INQUIRY',
    status: 'VIEWING_COMPLETED',
    notes: 'Ready to make 4-cheque offer; Emirates ID verified via browser OCR.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'lead-seed-102',
    tenantName: 'Liam O’Connor',
    name: 'Liam O’Connor',
    tenantPhone: '+971585112233',
    phone: '+971585112233',
    tenantEmail: 'liam.oconnor@example.ae',
    propertyId: '673a10000000000000000102',
    propertyTitle: '4BR Independent Family Villa with Roof Terrace in Pacifica',
    community: 'DAMAC Hills 2',
    subCommunity: 'Pacifica',
    annualRentAed: 115000,
    chequesCount: 4,
    assignedAgentId: 'wc-agent-arslan',
    source: 'WHATSAPP_LINDA',
    status: 'VIEWING_SCHEDULED',
    notes: 'Relocating family; requested afternoon viewing in Pacifica.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'lead-seed-103',
    tenantName: 'Amira Al Mansoori',
    name: 'Amira Al Mansoori',
    tenantPhone: '+971504449988',
    phone: '+971504449988',
    tenantEmail: 'amira.m@example.ae',
    propertyId: '673a10000000000000000103',
    propertyTitle: '3BR Park-Backing Eco Villa in Vardon',
    community: 'DAMAC Hills 2',
    subCommunity: 'Vardon',
    annualRentAed: 82000,
    chequesCount: 2,
    assignedAgentId: 'wc-agent-arslan',
    source: 'MOBILE_FIELD',
    status: 'NEW',
    notes: 'Walk-in inquiry captured on-site at DAMAC Hills 2 Community Center.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const SEED_VIEWINGS: Array<Record<string, any>> = [
  {
    id: 'view-seed-201',
    leadId: 'lead-seed-102',
    propertyId: '673a10000000000000000102',
    propertyTitle: '4BR Independent Family Villa in Pacifica',
    community: 'DAMAC Hills 2',
    subCommunity: 'Pacifica',
    tenantName: 'Liam O’Connor',
    tenantPhone: '+971585112233',
    agentId: 'wc-agent-arslan',
    scheduledAt: new Date(Date.now() + 3600000 * 3).toISOString(),
    status: 'CONFIRMED',
    directions: 'Al Qudra Road (D63) -> DAMAC Hills 2 Main Gate -> Pacifica Security Gate',
    feedback: '',
  },
  {
    id: 'view-seed-202',
    leadId: 'lead-seed-101',
    propertyId: '673a10000000000000000101',
    propertyTitle: '3BR Corner Townhouse in Camelia',
    community: 'DAMAC Hills 2',
    subCommunity: 'Camelia',
    tenantName: 'Sophie Bernard',
    tenantPhone: '+971529876543',
    agentId: 'wc-agent-arslan',
    scheduledAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'COMPLETED',
    directions: 'Emirates Road (E611) Exit -> DAMAC Hills 2 North Gate -> Camelia Cluster Entrance',
    feedback: 'Tenant loved the corner garden layout; proceeding to 4-cheque offer.',
  },
];

export function ensureSeedsLoaded() {
  if (inMemoryLeads.length === 0) {
    inMemoryLeads.push(...SEED_LEADS);
  }
  if (inMemoryViewings.length === 0) {
    inMemoryViewings.push(...SEED_VIEWINGS);
  }
}

export function buildChequeSchedule(
  annualRentAed: number,
  chequesCount: number,
  startDateIso: string
) {
  const count = [1, 2, 4, 6, 12].includes(chequesCount) ? chequesCount : 4;
  const amountPerCheque = Math.round(annualRentAed / count);
  const start = new Date(startDateIso);
  const baseDate = Number.isNaN(start.getTime()) ? new Date() : start;
  const monthInterval = Math.floor(12 / count);

  return Array.from({ length: count }, (_, idx) => {
    const due = new Date(baseDate);
    due.setMonth(due.getMonth() + idx * monthInterval);
    return {
      installment: idx + 1,
      chequeNumber: `CHQ-${due.getFullYear()}-${String(idx + 1).padStart(2, '0')}`,
      amountAed:
        idx === count - 1 ? annualRentAed - amountPerCheque * (count - 1) : amountPerCheque,
      dueDate: due.toISOString().split('T')[0],
      status: idx === 0 ? 'CLEARED' : 'PENDING',
    };
  });
}
