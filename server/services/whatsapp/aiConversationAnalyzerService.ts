/**
 * aiConversationAnalyzerService.ts
 * White Caves Real Estate LLC — Multi-Turn WhatsApp Thread Persistence,
 * Structured Unit Fact Extraction & Persisted Mission 2 MD Follow-Up Queue (+971505760056)
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import { normalizeCanonicalPhone } from './dh2OutreachGovernanceService.js';

const log = createLogger('AiConversationAnalyzer');
const defaultDb = prisma as any;

export interface ExtractedUnitFacts {
  askingRentAed: number | null;
  chequesCount: number | null;
  vacantDate: string | null;
  furnishing: 'FURNISHED' | 'UNFURNISHED' | 'SEMI_FURNISHED' | null;
  keyStatus: 'WITH_LANDLORD' | 'WITH_AGENT' | 'WITH_TENANT' | 'VACANT_KEY_READY' | 'ACCESS_CARD_NEEDED' | null;
  hasTitleDeedMedia: boolean;
  hasPropertyPhotos: boolean;
  hasVoiceNote: boolean;
  confidenceScore: number;
}

export interface WhatsAppMediaAttachment {
  mimeType?: string;
  fileName?: string;
  caption?: string;
  isVoiceNote?: boolean;
  transcript?: string;
}

export function extractStructuredUnitFacts(input: {
  text: string;
  attachments?: WhatsAppMediaAttachment[];
}): ExtractedUnitFacts {
  const combinedParts = [input.text || ''];
  let hasTitleDeedMedia = false;
  let hasPropertyPhotos = false;
  let hasVoiceNote = false;

  for (const att of input.attachments || []) {
    const mime = String(att.mimeType || '').toLowerCase();
    const fname = String(att.fileName || '').toLowerCase();
    const cap = String(att.caption || '');
    if (att.isVoiceNote || mime.startsWith('audio/')) {
      hasVoiceNote = true;
      if (att.transcript) combinedParts.push(att.transcript);
    }
    if (cap) combinedParts.push(cap);
    if (
      mime.includes('pdf') ||
      /(title\s*deed|oqood|dld|ownership|mulkiya)/i.test(`${fname} ${cap}`)
    ) {
      hasTitleDeedMedia = true;
    }
    if (mime.startsWith('image/') && !/(title\s*deed|passport|emirates\s*id|eid)/i.test(`${fname} ${cap}`)) {
      hasPropertyPhotos = true;
    }
  }

  const text = combinedParts.join(' ').trim();

  // Rent extraction (AED)
  let askingRentAed: number | null = null;
  const commaMatch = text.match(/\b(\d{2,3},\d{3})\b/);
  const kMatch = text.match(/\b(\d{2,3}(?:\.\d+)?)\s*k\b/i);
  const fullMatch = text.match(/\b([4-9]\d{4}|[1-4]\d{5})\b/);
  if (commaMatch) askingRentAed = Number(commaMatch[1].replace(/,/g, ''));
  else if (kMatch) askingRentAed = Math.round(Number(kMatch[1]) * 1000);
  else if (fullMatch) askingRentAed = Number(fullMatch[1]);

  // Cheques count (1–12 cheques)
  let chequesCount: number | null = null;
  const chqMatch = text.match(/\b(1[0-2]|[1-9])\s*(?:cheques?|chqs?|payments?|installments?)\b/i);
  if (chqMatch) chequesCount = Number(chqMatch[1]);

  // Vacant / availability date
  let vacantDate: string | null = null;
  if (/\b(vacant now|empty now|ready now|ready to move|immediately|available now)\b/i.test(text)) {
    vacantDate = 'IMMEDIATE';
  } else {
    const dateMatch = text.match(
      /\b(?:vacant|available|ready|free)\s*(?:from|by|on|in|after)?\s*([a-z]{3,9}\s+\d{1,2}|\d{1,2}\s+[a-z]{3,9}|\d{4}-\d{2}-\d{2}|next\s+month|end\s+of\s+(?:this\s+)?month)\b/i
    );
    if (dateMatch) vacantDate = dateMatch[1].trim();
  }

  // Furnishing status
  let furnishing: ExtractedUnitFacts['furnishing'] = null;
  if (/\b(semi[-\s]?furnished|kitchen\s+appliances)\b/i.test(text)) furnishing = 'SEMI_FURNISHED';
  else if (/\b(unfurnished|not\s+furnished|empty\s+villa)\b/i.test(text)) furnishing = 'UNFURNISHED';
  else if (/\b(fully\s+furnished|furnished)\b/i.test(text)) furnishing = 'FURNISHED';

  // Key status
  let keyStatus: ExtractedUnitFacts['keyStatus'] = null;
  if (/\b(keys?\s+(?:are\s+)?with\s+me|i\s+have\s+(?:the\s+)?keys?|landlord\s+has\s+keys?)\b/i.test(text)) {
    keyStatus = 'WITH_LANDLORD';
  } else if (/\b(keys?\s+with\s+(?:agent|broker|security|office))\b/i.test(text)) {
    keyStatus = 'WITH_AGENT';
  } else if (/\b(tenant\s+(?:is\s+)?(?:inside|staying|has\s+keys?)|notice\s+needed)\b/i.test(text)) {
    keyStatus = 'WITH_TENANT';
  } else if (/\b(keys?\s+ready|vacant\s+with\s+keys?|lockbox)\b/i.test(text)) {
    keyStatus = 'VACANT_KEY_READY';
  } else if (/\b(access\s+card|gate\s+pass)\b/i.test(text)) {
    keyStatus = 'ACCESS_CARD_NEEDED';
  }

  if (/(title\s*deed|dld\s+deed)/i.test(text)) hasTitleDeedMedia = true;

  const filledFields = [askingRentAed, chequesCount, vacantDate, furnishing, keyStatus].filter(Boolean).length;
  const confidenceScore = Math.min(100, 35 + filledFields * 12 + (hasTitleDeedMedia ? 10 : 0) + (hasPropertyPhotos ? 5 : 0));

  return {
    askingRentAed,
    chequesCount,
    vacantDate,
    furnishing,
    keyStatus,
    hasTitleDeedMedia,
    hasPropertyPhotos,
    hasVoiceNote,
    confidenceScore,
  };
}

export async function recordWhatsAppConversationTurn(input: {
  contactPhone: string;
  simPhone: string;
  direction: 'INBOUND' | 'OUTBOUND';
  text: string;
  attachments?: WhatsAppMediaAttachment[];
  dbOverride?: any;
}) {
  const cleanPhone = normalizeCanonicalPhone(input.contactPhone);
  const sessionId = `dh2-wa-${cleanPhone}`;
  const db = input.dbOverride || defaultDb;
  const extracted = extractStructuredUnitFacts({ text: input.text, attachments: input.attachments });

  const turn = {
    at: new Date().toISOString(),
    direction: input.direction,
    simPhone: input.simPhone,
    text: input.text,
    attachments: input.attachments || [],
    extracted,
  };

  let turnCount = 1;
  try {
    if (db.aIConversation?.findFirst) {
      const existing = await db.aIConversation.findFirst({ where: { sessionId } });
      const prevMessages = Array.isArray(existing?.messages) ? existing.messages : [];
      const updatedMessages = [...prevMessages, turn];
      turnCount = updatedMessages.length;

      if (existing?.id) {
        await db.aIConversation.update({
          where: { id: existing.id },
          data: {
            messages: updatedMessages,
            context: {
              ...(existing.context || {}),
              contactPhone: `+${cleanPhone}`,
              lastSimPhone: input.simPhone,
              latestFacts: { ...(existing.context?.latestFacts || {}), ...Object.fromEntries(Object.entries(extracted).filter(([, v]) => v !== null && v !== false)) },
            },
          },
        });
      } else if (db.aIConversation?.create) {
        await db.aIConversation.create({
          data: {
            sessionId,
            messages: updatedMessages,
            context: { contactPhone: `+${cleanPhone}`, lastSimPhone: input.simPhone, latestFacts: extracted },
          },
        });
      }
    }
  } catch (err) {
    log.warn('AIConversation turn persistence skipped:', err instanceof Error ? err.message : err);
  }

  return { sessionId, turnCount, extracted };
}

export interface MdFollowUpQueueItemInput {
  landlordPhone: string;
  landlordName: string;
  hunterSimPhone: string;
  cluster: string;
  unitNumber: string;
  bedrooms: number;
  vaultPropertyId?: string | null;
  facts: ExtractedUnitFacts;
  lastMessage: string;
  priority?: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

export async function enqueueMdPrimaryMasterFollowUp(input: MdFollowUpQueueItemInput, dbOverride?: any) {
  const cleanPhone = normalizeCanonicalPhone(input.landlordPhone);
  const db = dbOverride || defaultDb;
  const priority =
    input.priority || (input.facts.hasTitleDeedMedia || input.facts.askingRentAed ? 'HIGH' : 'MEDIUM');

  const payload = {
    mission: 'MISSION_2_MD_NEGOTIATION',
    primaryMasterPhone: PRIMARY_MASTER_PHONE,
    hunterSimPhone: input.hunterSimPhone,
    landlordPhone: `+${cleanPhone}`,
    landlordName: input.landlordName,
    cluster: input.cluster,
    unitNumber: input.unitNumber,
    bedrooms: input.bedrooms,
    vaultPropertyId: input.vaultPropertyId || null,
    facts: input.facts,
    lastMessage: input.lastMessage.slice(0, 300),
    priority,
    mdNotes: null,
  };

  let queueId = `mdq-${cleanPhone.slice(-6)}-${Date.now()}`;
  try {
    if (db.followUpQueue?.create) {
      const created = await db.followUpQueue.create({
        data: {
          entityId: cleanPhone,
          entityType: 'MD_PRIMARY_MASTER_QUEUE',
          sequenceId: 'MISSION_2_MD_CLOSER',
          actionType: 'MD_NEGOTIATION_CALL',
          scheduledAt: new Date(),
          status: 'pending',
          payload,
        },
      });
      if (created?.id) queueId = created.id;
    }
  } catch (err) {
    log.warn('MD Follow-Up Queue persistence skipped:', err instanceof Error ? err.message : err);
  }

  return { queueId, status: 'pending', ...payload };
}

export async function listMdPrimaryMasterQueue(status = 'pending', dbOverride?: any) {
  const db = dbOverride || defaultDb;
  try {
    const where: Record<string, unknown> = { entityType: 'MD_PRIMARY_MASTER_QUEUE' };
    if (status && status !== 'all') where.status = status;
    const rows = (await db.followUpQueue?.findMany?.({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })) || [];
    return rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      scheduledAt: r.scheduledAt,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      ...(r.payload || {}),
    }));
  } catch (err) {
    log.warn('MD Follow-Up Queue list skipped:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function updateMdFollowUpQueueItem(
  id: string,
  update: { status: 'pending' | 'processed' | 'paused'; mdNotes?: string },
  dbOverride?: any
) {
  const db = dbOverride || defaultDb;
  const existing = await db.followUpQueue?.findUnique?.({ where: { id } });
  const mergedPayload = { ...(existing?.payload || {}), mdNotes: update.mdNotes ?? existing?.payload?.mdNotes ?? null };
  return db.followUpQueue.update({
    where: { id },
    data: {
      status: update.status,
      processedAt: update.status === 'processed' ? new Date() : null,
      payload: mergedPayload,
    },
  });
}
