/**
 * dh2TenantViewingRouter.ts
 * White Caves Real Estate LLC — Inbound WhatsApp Tenant Inquiry -> Mary Vault Top-3 Matching -> Daisy Viewing Slot
 * Extracted under AEGIS Single Purpose File Law (< 350 lines, AEG-042).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { rankAvailableUnitsForTenant } from '../leasing/tenantMatchingViewingService.js';

const log = createLogger('Dh2TenantViewingRouter');
const defaultDb = prisma as any;

export const DH2_ALL_CLUSTERS = [
  'Pacifica', 'Camelia', 'Albizia', 'Basswood', 'Clivia', 'Amargo', 'Zinnia', 'Mimosa',
  'Vardon', 'Juniper', 'Sycamore', 'Coursetia', 'Centauri', 'Sanctuary', 'Mulberry',
  'Acuna', 'Aknan', 'Aster', 'Avencia', 'Centaury', 'Dahlia', 'Elo', 'Fiora', 'Flamingo',
  'Hawthorn', 'Janusia', 'Just Cavalli', 'Navitas', 'Odora', 'Paloverde', 'Park Greens',
  'Primrose', 'Trixis', 'Verona', 'Virdis', 'Violet', 'Water Town', 'Victoria',
];

export async function routeInboundTenantViewingInquiry(input: {
  fromPhone: string;
  message: string;
  tenantName?: string;
  receivedOnLine?: string;
  preferredDate?: string;
  primaryMasterPhone?: string;
  dbOverride?: any;
}) {
  const text = input.message.toLowerCase();
  const isRentalViewingIntent =
    /(rent|lease|view|viewing|visit|damac|hills 2|dh2|akoya|camelia|albizia|basswood|pacifica|clivia|amargo|townhouse|villa|bedroom|br)/i.test(text);
  const matchedCluster = DH2_ALL_CLUSTERS.find(c => text.includes(c.toLowerCase())) || 'DAMAC Hills 2';
  const bedMatch = text.match(/(\d)\s*(?:br|bed|bhk|bedroom)/i);
  const bedrooms = bedMatch ? Number(bedMatch[1]) : 3;
  const cleanPhone = String(input.fromPhone || '').replace(/\D/g, '');
  if (!isRentalViewingIntent) return { routed: false, reason: 'No rental/viewing intent detected', cleanPhone };

  const db = input.dbOverride || defaultDb;
  let leadId: string | null = null;
  try {
    const existing = await db.lead?.findFirst?.({
      where: { phone: { contains: cleanPhone.slice(-9) } },
      select: { id: true },
    });
    if (existing?.id) leadId = existing.id;
    else if (db.lead?.create) {
      const created = await db.lead.create({
        data: {
          name: input.tenantName || `DH2 Tenant (${cleanPhone})`,
          phone: `+${cleanPhone}`,
          email: `tenant-${cleanPhone}@whitecaves.local`,
          source: 'WHATSAPP_LINDA',
          status: 'VIEWING_SCHEDULED',
          notes: `Auto-routed by AI Linda (SUP-08-1-01-1 / ${input.receivedOnLine || input.primaryMasterPhone || '+971505760056'}) -> AI Daisy (SUP-05-2-01-1): ${matchedCluster} ${bedrooms}BR. Msg: ${input.message.slice(0, 240)}`,
        },
      });
      leadId = created.id;
    }
  } catch (err) {
    log.warn('Lead persistence skipped during inbound viewing routing:', err instanceof Error ? err.message : err);
  }

  let matchedUnits: ReturnType<typeof rankAvailableUnitsForTenant> = [];
  try {
    const budgetMatch = text.match(/\b(\d{2,3})\s*k\b/i) || text.match(/\b([5-9]\d{4}|[1-3]\d{5})\b/);
    const inferredBudget = budgetMatch
      ? Number(budgetMatch[1]) < 1000
        ? Number(budgetMatch[1]) * 1000
        : Number(budgetMatch[1])
      : 140_000;
    const availableProps =
      (await db.property?.findMany?.({ where: { purpose: 'RENT', status: 'AVAILABLE' }, take: 50 })) || [];
    matchedUnits = rankAvailableUnitsForTenant(
      { budgetAed: inferredBudget, bedrooms, preferredCluster: matchedCluster === 'DAMAC Hills 2' ? undefined : matchedCluster },
      availableProps
    );
  } catch (err) {
    log.warn('Mary Vault tenant match lookup skipped:', err instanceof Error ? err.message : err);
  }

  const scheduledAt = input.preferredDate ? new Date(input.preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const topUnitNote = matchedUnits.length
    ? ` Mary matched ${matchedUnits.length} verified option(s) starting from AED ${matchedUnits[0].annualRentAed.toLocaleString()}/yr in ${matchedUnits[0].cluster}.`
    : '';
  return {
    routed: true,
    delegatedTo: { id: 'MGR-05-2', supervisorCode: 'SUP-05-2-01-1', name: 'Daisy', department: 'Leasing & Tenancy' },
    leadId,
    tenantPhone: `+${cleanPhone}`,
    cluster: matchedCluster,
    bedrooms,
    matchedUnits,
    proposedViewingAt: scheduledAt.toISOString(),
    suggestedReply: `Thank you for contacting White Caves Real Estate LLC! Our DAMAC Hills 2 leasing specialist Daisy has reserved a ${bedrooms}BR viewing slot in ${matchedCluster} for ${scheduledAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}.${topUnitNote} Reply YES to confirm or share your preferred time.`,
  };
}
