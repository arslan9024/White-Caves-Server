/**
 * tenantMatchingViewingService.ts
 * White Caves Real Estate LLC — Tenant Lead Qualification, Instant Top-3 Vault Matching,
 * WhatsApp Shortlist Dispatch & MD Google Calendar Viewing + T-2h Reminder Scheduler
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { PRIMARY_MASTER_PHONE } from '../whatsapp/leasingSimOutreachFormula.js';
import { scheduleMdLeasingAppointment } from '../google/googleCalendarServiceAccount.js';

const log = createLogger('TenantMatchingViewing');
const defaultDb = prisma as any;

export interface TenantLeadQualificationInput {
  name: string;
  phone: string;
  email?: string;
  source: 'WHITE_CAVES_WEB' | 'WHATSAPP_LINDA' | 'BAYUT' | 'PROPERTY_FINDER' | 'DUBIZZLE';
  budgetAed: number;
  chequesCount?: number;
  bedrooms: number;
  moveInDate?: string;
  preferredCluster?: string;
  notes?: string;
  dbOverride?: any;
}

export interface MatchedUnitResult {
  propertyId: string;
  title: string;
  cluster: string;
  unitNumber: string;
  bedrooms: number;
  annualRentAed: number;
  matchScore: number;
  reasons: string[];
  webUrl: string;
}

export function qualifyTenantLead(input: TenantLeadQualificationInput) {
  let score = 30;
  if (input.budgetAed >= 65_000) score += 25;
  if (input.chequesCount && input.chequesCount <= 4) score += 15;
  if (input.bedrooms >= 1 && input.bedrooms <= 6) score += 10;
  if (input.moveInDate) score += 10;
  if (input.preferredCluster) score += 10;
  const clamped = Math.min(100, score);
  const tier: 'HOT' | 'WARM' | 'NURTURE' = clamped >= 75 ? 'HOT' : clamped >= 50 ? 'WARM' : 'NURTURE';
  return { qualificationScore: clamped, tier };
}

export function rankAvailableUnitsForTenant(
  tenant: Pick<TenantLeadQualificationInput, 'budgetAed' | 'bedrooms' | 'preferredCluster'>,
  availableProperties: any[]
): MatchedUnitResult[] {
  const prefCluster = String(tenant.preferredCluster || '').trim().toLowerCase();

  return availableProperties
    .filter(p => String(p.status || '').toUpperCase() === 'AVAILABLE')
    .map(p => {
      const rent = Number(p.annualRentAed || p.price || 0);
      const beds = Number(p.bedrooms || 3);
      const cluster = String(p.subCommunity || 'DAMAC Hills 2');
      let score = 0;
      const reasons: string[] = [];

      if (prefCluster && cluster.toLowerCase().includes(prefCluster)) {
        score += 40;
        reasons.push(`Exact cluster match (${cluster})`);
      } else {
        score += 15;
      }

      if (beds === tenant.bedrooms) {
        score += 30;
        reasons.push(`Exact ${beds}BR match`);
      } else if (Math.abs(beds - tenant.bedrooms) === 1) {
        score += 12;
        reasons.push(`Near bedroom match (${beds}BR)`);
      }

      if (rent > 0 && rent <= tenant.budgetAed) {
        score += 25;
        reasons.push(`Within AED ${tenant.budgetAed.toLocaleString()} budget`);
      } else if (rent > 0 && rent <= tenant.budgetAed * 1.1) {
        score += 12;
        reasons.push('Within +10% negotiable range');
      }

      if (p.inventoryStage === 'verified_active') {
        score += 5;
        reasons.push('Verified active listing');
      }

      const slug = cluster.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return {
        propertyId: p.id,
        title: p.title || `${beds}BR in ${cluster}`,
        cluster,
        unitNumber: p.unitNumber || 'TBD',
        bedrooms: beds,
        annualRentAed: rent,
        matchScore: Math.min(100, score),
        reasons,
        webUrl: `https://whitecaves.com/rent/damac-hills-2/${slug}`,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

export function buildTenantWhatsAppShortlistMessage(input: {
  tenantName: string;
  matches: MatchedUnitResult[];
}): string {
  if (!input.matches.length) {
    return `Hi ${input.tenantName}, thank you for contacting White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}). We are sourcing new DAMAC Hills 2 options matching your exact criteria and will message you shortly.`;
  }
  const lines = input.matches.map(
    (m, i) =>
      `${i + 1}. *${m.cluster} — Unit ${m.unitNumber}* (${m.bedrooms}BR) — AED ${m.annualRentAed.toLocaleString()}/yr\n   ${m.webUrl}`
  );
  return `Hello ${input.tenantName}! This is Arslan Malik from White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}). Here are the top ${input.matches.length} verified AVAILABLE units in DAMAC Hills 2 matching your search:\n\n${lines.join('\n\n')}\n\nReply with the unit number (1, 2, or 3) and your preferred time to confirm your private viewing!`;
}

export async function captureQualifyAndMatchTenantLead(input: TenantLeadQualificationInput) {
  const db = input.dbOverride || defaultDb;
  const qualification = qualifyTenantLead(input);
  const cleanPhone = String(input.phone || '').replace(/\D/g, '');

  let leadId: string | null = null;
  try {
    if (db.lead?.create) {
      const created = await db.lead.create({
        data: {
          name: input.name,
          phone: `+${cleanPhone}`,
          email: input.email || `tenant-${cleanPhone}@whitecaves.local`,
          source: input.source,
          status: qualification.tier === 'HOT' ? 'QUALIFIED' : 'NEW',
          budget: input.budgetAed,
          notes: `Auto-qualified (${qualification.tier}, score ${qualification.qualificationScore}/100): ${input.bedrooms}BR, ${input.chequesCount || 'flexible'} chq, move-in ${input.moveInDate || 'flexible'}, cluster ${input.preferredCluster || 'any'}. ${input.notes || ''}`.trim(),
        },
      });
      leadId = created?.id || null;
    }
  } catch (err) {
    log.warn('Tenant Lead creation skipped:', err instanceof Error ? err.message : err);
  }

  let availableProps: any[] = [];
  try {
    availableProps =
      (await db.property?.findMany?.({
        where: { purpose: 'RENT', status: 'AVAILABLE' },
        take: 100,
      })) || [];
  } catch (err) {
    log.warn('Vault query skipped during tenant match:', err instanceof Error ? err.message : err);
  }

  const top3Matches = rankAvailableUnitsForTenant(input, availableProps);
  const whatsappShortlistMessage = buildTenantWhatsAppShortlistMessage({
    tenantName: input.name,
    matches: top3Matches,
  });

  return {
    leadId,
    ...qualification,
    senderWhatsApp: PRIMARY_MASTER_PHONE,
    top3Matches,
    whatsappShortlistMessage,
  };
}

export async function bookViewingWithMdCalendarAndReminder(input: {
  leadId?: string;
  propertyId?: string;
  tenantName: string;
  tenantPhone: string;
  cluster: string;
  unitNumber: string;
  scheduledAtIso: string;
  notes?: string;
  calendarClientOverride?: any;
  dbOverride?: any;
}) {
  const db = input.dbOverride || defaultDb;
  const scheduledAt = new Date(input.scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid scheduledAtIso');
  const reminderAt = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);

  let calendarResult: Record<string, unknown> = { scheduled: false, fallback: true };
  try {
    calendarResult = await scheduleMdLeasingAppointment({
      kind: 'TENANT_PROPERTY_VIEWING',
      contactName: input.tenantName,
      contactPhone: input.tenantPhone,
      area: 'Damac Hills 2',
      project: input.cluster,
      unitNumber: input.unitNumber,
      startIso: scheduledAt.toISOString(),
      channel: 'IN_PERSON_VIEWING',
      notes: input.notes,
      clientOverride: input.calendarClientOverride,
    });
  } catch (err) {
    calendarResult = {
      scheduled: false,
      error: err instanceof Error ? err.message : 'Calendar unavailable — persisted in CRM queue',
    };
  }

  let viewingId: string | null = null;
  try {
    if (db.viewingAppointment?.create && input.leadId && input.propertyId) {
      const rec = await db.viewingAppointment.create({
        data: {
          leadId: input.leadId,
          propertyId: input.propertyId,
          scheduledAt,
          status: 'CONFIRMED',
          notes: input.notes || `Booked via White Caves Leasing Desk (${PRIMARY_MASTER_PHONE})`,
        },
      });
      viewingId = rec?.id || null;
    }
  } catch (err) {
    log.warn('ViewingAppointment persistence skipped:', err instanceof Error ? err.message : err);
  }

  let reminderQueueId: string | null = null;
  const reminderMessage = `Reminder from White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}): Dear ${input.tenantName}, your private viewing for ${input.cluster} Unit ${input.unitNumber}, DAMAC Hills 2 is in 2 hours (${scheduledAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}). Reply CONFIRM or call ${PRIMARY_MASTER_PHONE} if you need directions.`;
  try {
    if (db.followUpQueue?.create) {
      const rem = await db.followUpQueue.create({
        data: {
          entityId: String(input.tenantPhone).replace(/\D/g, ''),
          entityType: 'VIEWING_T2H_REMINDER',
          sequenceId: 'TENANT_VIEWING_REMINDER',
          actionType: 'WHATSAPP_T2H_REMINDER',
          scheduledAt: reminderAt,
          status: 'pending',
          payload: {
            senderWhatsApp: PRIMARY_MASTER_PHONE,
            tenantName: input.tenantName,
            tenantPhone: input.tenantPhone,
            cluster: input.cluster,
            unitNumber: input.unitNumber,
            viewingAt: scheduledAt.toISOString(),
            viewingId,
            message: reminderMessage,
          },
        },
      });
      reminderQueueId = rem?.id || null;
    }
  } catch (err) {
    log.warn('T-2h viewing reminder persistence skipped:', err instanceof Error ? err.message : err);
  }

  return {
    viewingId,
    scheduledAt: scheduledAt.toISOString(),
    reminderAt: reminderAt.toISOString(),
    reminderQueueId,
    reminderMessage,
    senderWhatsApp: PRIMARY_MASTER_PHONE,
    calendar: calendarResult,
  };
}
