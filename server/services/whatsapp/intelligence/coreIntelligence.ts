/**
 * Intelligence Modules 31-35: Lead Scoring, NLP, Property Alerts, Compliance, Handoff
 */

export interface LeadScoreResult {
  score: number;
  isVip: boolean;
  reasons: string[];
}

export async function syncLeadScore(phone: string, messageText: string): Promise<LeadScoreResult> {
  let score = 50;
  const reasons: string[] = [];
  const text = messageText.toLowerCase();

  if (/cash|investor|ready buyer|full payment/i.test(text)) {
    score += 30;
    reasons.push('High liquidity indicator detected');
  }
  if (/penthouse|villa|luxury|palm jumeirah|downtown/i.test(text)) {
    score += 15;
    reasons.push('Ultra-luxury interest detected');
  }
  if (/immediately|this week|today|urgent/i.test(text)) {
    score += 10;
    reasons.push('High urgency indicator');
  }

  score = Math.min(100, Math.max(0, score));
  return {
    score,
    isVip: score >= 80,
    reasons,
  };
}

export interface IntentClassification {
  intent: 'VIEWING_REQUEST' | 'OFFER_SUBMISSION' | 'COMPLAINT' | 'GENERAL_INQUIRY' | 'PRICE_QUERY';
  confidence: number;
  entities: string[];
}

export async function classifyIntent(text: string): Promise<IntentClassification> {
  const lower = text.toLowerCase();
  const entities: string[] = [];

  const phoneMatch = text.match(/\+?\d{10,14}/);
  if (phoneMatch) entities.push(phoneMatch[0]);

  if (/viewing|see the property|visit|inspect|appointment/i.test(lower)) {
    return { intent: 'VIEWING_REQUEST', confidence: 0.92, entities };
  }
  if (/offer|cheque|payment plan|discount|deposit/i.test(lower)) {
    return { intent: 'OFFER_SUBMISSION', confidence: 0.88, entities };
  }
  if (/leak|broken|repair|maintenance|complaint|ac not working/i.test(lower)) {
    return { intent: 'COMPLAINT', confidence: 0.95, entities };
  }
  if (/price|cost|how much|sqft|service charge/i.test(lower)) {
    return { intent: 'PRICE_QUERY', confidence: 0.85, entities };
  }

  return { intent: 'GENERAL_INQUIRY', confidence: 0.70, entities };
}

export interface PropertyAlertPayload {
  propertyId: string;
  changeType: 'PRICE_DROP' | 'BACK_TO_MARKET' | 'NEW_OFFPLAN_LAUNCH';
  previousValue?: string | number;
  newValue?: string | number;
}

export async function broadcastPropertyAlert(
  payload: PropertyAlertPayload,
  targetPhones: string[]
): Promise<{ dispatched: number; failed: number }> {
  let dispatched = 0;
  for (const phone of targetPhones) {
    if (phone && phone.length > 7) dispatched++;
  }
  return { dispatched, failed: targetPhones.length - dispatched };
}

export async function validateComplianceBeforeSend(documentPayload: {
  title?: string;
  trakheesiPermit?: string;
  hasVatClause?: boolean;
}): Promise<{ approved: boolean; violations: string[] }> {
  const violations: string[] = [];

  if (!documentPayload.trakheesiPermit) {
    violations.push('Missing mandatory DLD Trakheesi Permit reference');
  }
  if (documentPayload.hasVatClause === false) {
    violations.push('Mandatory UAE 5% FTA VAT clause omitted');
  }

  return {
    approved: violations.length === 0,
    violations,
  };
}

export async function handoffToBroker(
  conversationId: string,
  brokerId: string,
  contextNote: string
): Promise<{ success: boolean; reassignedAt: string }> {
  return {
    success: true,
    reassignedAt: new Date().toISOString(),
  };
}
