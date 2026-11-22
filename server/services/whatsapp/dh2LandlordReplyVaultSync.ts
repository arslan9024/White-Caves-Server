/**
 * dh2LandlordReplyVaultSync.ts
 * White Caves Real Estate LLC — Hunter SIM Landlord Reply Classifier -> Mary Inventory Vault Auto-Sync
 *
 * When a landlord replies positively to a Mission 1 Hunter SIM outreach campaign:
 * 1. Parses cluster, unit number, bedrooms, and asking annual rent (AED).
 * 2. Upserts the discovered unit directly into Mary's Inventory Vault (Prisma `Property`).
 * 3. Creates a Mission 1 -> Mission 2 Handoff queued exclusively for Primary Master (+971505760056).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { createHunterToPrimaryMasterHandoff } from './leasingSimOutreachFormula.js';
import type { OrgJobRole } from '../rbac/leasingRoleClearanceMatrix.js';
import {
  cancelPendingLandlordCadence,
  detectOptOutIntent,
  suppressPhoneOptOut,
} from './dh2OutreachGovernanceService.js';
import {
  enqueueMdPrimaryMasterFollowUp,
  recordWhatsAppConversationTurn,
  type WhatsAppMediaAttachment,
} from './aiConversationAnalyzerService.js';

const log = createLogger('Dh2LandlordReplyVaultSync');
const defaultDb = prisma as any;

export const DH2_CLUSTERS = [
  'Camelia', 'Albizia', 'Basswood', 'Pacifica', 'Clivia',
  'Amargo', 'Zinnia', 'Mimosa', 'Vardon', 'Juniper',
];

export const DH2_LANDLORD_TEMPLATES = [
  'Hello {{ownerName}}, this is Linda from White Caves Real Estate LLC (DAMAC Hills 2 Leasing Desk). We have pre-qualified tenants looking for {{bedrooms}}BR units in {{cluster}}, DAMAC Hills 2. Is your unit {{unitRef}} available for rent soon?',
  'Hi {{ownerName}}, White Caves Real Estate LLC here. Demand for {{cluster}} in DAMAC Hills 2 is very strong this week — are you considering leasing unit {{unitRef}}? We handle verified viewings and Ejari directly.',
  'Greetings {{ownerName}}! Linda from White Caves Real Estate (DAMAC Hills 2 Specialists). We currently have active corporate tenants searching in {{cluster}}. Would you like us to list {{unitRef}} on whitecaves.com at zero landlord commission?',
];

export const DH2_ALL_CLUSTERS = [
  'Pacifica', 'Camelia', 'Albizia', 'Basswood', 'Clivia', 'Amargo', 'Zinnia', 'Mimosa',
  'Vardon', 'Juniper', 'Sycamore', 'Coursetia', 'Centauri', 'Sanctuary', 'Mulberry',
  'Acuna', 'Aknan', 'Aster', 'Avencia', 'Centaury', 'Dahlia', 'Elo', 'Fiora', 'Flamingo',
  'Hawthorn', 'Janusia', 'Just Cavalli', 'Navitas', 'Odora', 'Paloverde', 'Park Greens',
  'Primrose', 'Trixis', 'Verona', 'Virdis', 'Violet', 'Water Town', 'Victoria',
];

const NEGATIVE_REPLY_RE =
  /\b(not available|unavailable|already rented|rented out|occupied|sold|stop|unsubscribe|do not contact|don't contact|wrong number|no thanks|not for rent)\b/i;

const POSITIVE_AVAILABILITY_RE =
  /\b(yes|available|vacant|ready to move|ready for rent|for rent|open for rent|looking for tenant|need tenant|can rent|asking|lease it|rent it)\b/i;

export interface ParsedLandlordReply {
  matched: boolean;
  available: boolean;
  reason: string;
  cluster: string;
  unitNumber: string;
  bedrooms: number;
  askingRentAed: number | null;
}

export function parseLandlordAvailabilityReply(
  message: string,
  defaults?: { cluster?: string; unitNumber?: string; bedrooms?: number }
): ParsedLandlordReply {
  const text = String(message || '').trim();
  const cluster =
    DH2_ALL_CLUSTERS.find(c => text.toLowerCase().includes(c.toLowerCase())) ||
    defaults?.cluster ||
    'DAMAC Hills 2';

  const unitMatch = text.match(/(?:unit|villa|plot|no\.?|#)\s*([a-z0-9-]{1,12})/i);
  const unitNumber = unitMatch ? unitMatch[1].toUpperCase() : defaults?.unitNumber || 'TBD';

  const bedMatch = text.match(/(\d)\s*(?:br|bed|bhk|bedroom)/i);
  const bedrooms = bedMatch ? Number(bedMatch[1]) : defaults?.bedrooms || 3;

  let askingRentAed: number | null = null;
  const kMatch = text.match(/\b(\d{2,3}(?:\.\d+)?)\s*k\b/i);
  const fullMatch = text.match(/\b([4-9]\d{4}|[1-4]\d{5})\b/);
  const commaMatch = text.match(/\b(\d{2,3},\d{3})\b/);
  if (commaMatch) {
    askingRentAed = Number(commaMatch[1].replace(/,/g, ''));
  } else if (kMatch) {
    askingRentAed = Math.round(Number(kMatch[1]) * 1000);
  } else if (fullMatch) {
    askingRentAed = Number(fullMatch[1]);
  }

  if (!text) {
    return { matched: false, available: false, reason: 'empty_message', cluster, unitNumber, bedrooms, askingRentAed };
  }
  if (NEGATIVE_REPLY_RE.test(text)) {
    return { matched: true, available: false, reason: 'landlord_declined_or_rented', cluster, unitNumber, bedrooms, askingRentAed };
  }
  if (!POSITIVE_AVAILABILITY_RE.test(text) && !askingRentAed) {
    return { matched: false, available: false, reason: 'no_availability_signal', cluster, unitNumber, bedrooms, askingRentAed };
  }

  return {
    matched: true,
    available: true,
    reason: 'landlord_confirmed_available',
    cluster,
    unitNumber,
    bedrooms,
    askingRentAed,
  };
}

export async function processLandlordAvailabilityReply(input: {
  hunterSimPhone: string;
  landlordPhone: string;
  landlordName?: string;
  message: string;
  attachments?: WhatsAppMediaAttachment[];
  cluster?: string;
  unitNumber?: string;
  bedrooms?: number;
  discoveredByUserId?: string;
  discoveredByRole?: OrgJobRole;
  dbOverride?: any;
}) {
  const db = input.dbOverride || defaultDb;
  const thread = await recordWhatsAppConversationTurn({
    contactPhone: input.landlordPhone,
    simPhone: input.hunterSimPhone,
    direction: 'INBOUND',
    text: input.message,
    attachments: input.attachments,
    dbOverride: db,
  });

  const combinedText = [
    input.message,
    ...(input.attachments || []).map(a => a.transcript || a.caption || ''),
  ].filter(Boolean).join(' ');

  const optOut = detectOptOutIntent(combinedText);
  if (optOut.isOptOut) {
    const dnc = await suppressPhoneOptOut({
      phone: input.landlordPhone,
      reason: `landlord_reply:${optOut.matchedTerm || 'opt_out'}`,
      dbOverride: db,
    });
    return {
      syncedToMaryVault: false,
      suppressedDnc: true,
      dncRecord: dnc,
      matched: true,
      available: false,
      reason: 'landlord_opted_out_dnc_persisted',
      cluster: input.cluster || 'DAMAC Hills 2',
      unitNumber: input.unitNumber || 'TBD',
      bedrooms: input.bedrooms || 3,
      askingRentAed: null,
      extractedFacts: thread.extracted,
      vaultPropertyId: null,
      handoff: null,
      mdQueueItem: null,
    };
  }

  const parsed = parseLandlordAvailabilityReply(combinedText, {
    cluster: input.cluster,
    unitNumber: input.unitNumber,
    bedrooms: input.bedrooms,
  });

  if (!parsed.available) {
    return {
      syncedToMaryVault: false,
      suppressedDnc: false,
      ...parsed,
      extractedFacts: thread.extracted,
      vaultPropertyId: null,
      handoff: null,
      mdQueueItem: null,
    };
  }

  await cancelPendingLandlordCadence(input.landlordPhone, 'landlord_replied_available', db);
  const cleanLandlordPhone = String(input.landlordPhone).replace(/\D/g, '');
  const slugCluster = parsed.cluster.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slugUnit = parsed.unitNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slug = `dh2-${slugCluster}-unit-${slugUnit}-${cleanLandlordPhone.slice(-4)}`;
  const rentAed = thread.extracted.askingRentAed || parsed.askingRentAed || 95000;

  let vaultPropertyId: string | null = null;
  try {
    const existing = await db.property?.findFirst?.({
      where: {
        community: 'DAMAC Hills 2',
        subCommunity: parsed.cluster,
        unitNumber: parsed.unitNumber,
      },
      select: { id: true },
    });

    if (existing?.id) {
      await db.property.update({
        where: { id: existing.id },
        data: {
          status: 'AVAILABLE',
          price: rentAed,
          annualRentAed: rentAed,
          rentalPrice: rentAed,
          availabilityDate: new Date(),
          description: `Landlord (+${cleanLandlordPhone}) confirmed available via Hunter SIM ${input.hunterSimPhone}: "${input.message.slice(0, 220)}"`,
        },
      });
      vaultPropertyId = existing.id;
    } else if (db.property?.create) {
      const created = await db.property.create({
        data: {
          slug,
          title: `${parsed.bedrooms}BR Townhouse in ${parsed.cluster}, DAMAC Hills 2 (Unit ${parsed.unitNumber})`,
          description: `Discovered via Hunter SIM ${input.hunterSimPhone} from landlord +${cleanLandlordPhone}. Reply: "${input.message.slice(0, 220)}"`,
          purpose: 'RENT',
          type: 'townhouse',
          status: 'AVAILABLE',
          price: rentAed,
          annualRentAed: rentAed,
          rentalPrice: rentAed,
          currency: 'AED',
          bedrooms: parsed.bedrooms,
          bathrooms: Math.max(2, parsed.bedrooms),
          sqft: parsed.bedrooms >= 4 ? 2250 : 1881,
          location: `${parsed.cluster}, DAMAC Hills 2, Dubai`,
          area: 'DAMAC Hills 2',
          community: 'DAMAC Hills 2',
          subCommunity: parsed.cluster,
          unitNumber: parsed.unitNumber,
          inventoryStage: 'draft_collected',
          availabilityDate: new Date(),
          agentName: 'AI Mary (MGR-06-1) <- Hunter SIM Discovery',
          amenities: ['Community Pool', 'Covered Parking', 'Private Garden', 'Malibu Beach Access'],
          images: [],
        },
      });
      vaultPropertyId = created?.id || null;
    }
  } catch (err) {
    log.warn('Mary Inventory Vault persistence skipped:', err instanceof Error ? err.message : err);
  }

  const handoff = createHunterToPrimaryMasterHandoff({
    hunterSimPhone: input.hunterSimPhone,
    discoveredByUserId: input.discoveredByUserId || 'md-arslan-malik',
    discoveredByRole: input.discoveredByRole || 'MANAGING_DIRECTOR',
    landlordName: input.landlordName || `DH2 Landlord (+${cleanLandlordPhone})`,
    landlordPhone: `+${cleanLandlordPhone}`,
    area: 'Damac Hills 2',
    project: parsed.cluster,
    unitNumber: parsed.unitNumber,
    askingRentAed: parsed.askingRentAed || undefined,
    notes: `Auto-synced to Mary Vault (${vaultPropertyId || 'pending-db'}). Reply: ${input.message.slice(0, 180)}`,
  });

  const mdQueueItem = await enqueueMdPrimaryMasterFollowUp(
    {
      landlordPhone: `+${cleanLandlordPhone}`,
      landlordName: input.landlordName || `DH2 Landlord (+${cleanLandlordPhone})`,
      hunterSimPhone: input.hunterSimPhone,
      cluster: parsed.cluster,
      unitNumber: parsed.unitNumber,
      bedrooms: parsed.bedrooms,
      vaultPropertyId,
      facts: thread.extracted,
      lastMessage: combinedText,
    },
    db
  );

  return {
    syncedToMaryVault: true,
    suppressedDnc: false,
    ...parsed,
    extractedFacts: thread.extracted,
    vaultPropertyId,
    handoff,
    mdQueueItem,
  };
}

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
          notes: `Auto-routed by Linda (${input.receivedOnLine || input.primaryMasterPhone || '+971505760056'}) → Daisy (MGR-05-2): ${matchedCluster} ${bedrooms}BR. Msg: ${input.message.slice(0, 240)}`,
        },
      });
      leadId = created.id;
    }
  } catch (err) {
    log.warn('Lead persistence skipped during inbound viewing routing:', err instanceof Error ? err.message : err);
  }

  const scheduledAt = input.preferredDate ? new Date(input.preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    routed: true,
    delegatedTo: { id: 'MGR-05-2', name: 'Daisy', department: 'Leasing & Tenancy' },
    leadId,
    tenantPhone: `+${cleanPhone}`,
    cluster: matchedCluster,
    bedrooms,
    proposedViewingAt: scheduledAt.toISOString(),
    suggestedReply: `Thank you for contacting White Caves Real Estate LLC! Our DAMAC Hills 2 leasing specialist Daisy has reserved a ${bedrooms}BR viewing slot in ${matchedCluster} for ${scheduledAt.toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}. Reply YES to confirm or share your preferred time.`,
  };
}
