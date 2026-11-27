/**
 * dh2ReplyTriage.ts
 * White Caves Real Estate LLC — Incoming Webhook / Message Triage & Hot-Lead Escalation
 * Standard: AEGIS Canonical Single Purpose (< 350 lines, AEG-042).
 */

export type ReplyIntent = 'HOT_LEAD' | 'RENEWAL_INTEREST' | 'OPT_OUT' | 'GENERAL_INQUIRY';
export type ReplySentiment = 'positive' | 'neutral' | 'negative';

export interface ReplyTriageResult {
  phone: string;
  intent: ReplyIntent;
  sentiment: ReplySentiment;
  escalateToMaster: boolean;
  escalationTarget: 'sim-01-master' | null;
  optedOut: boolean;
  ctaUrl: string;
}

const OPT_OUT_RE = /\b(stop|unsubscribe|opt[\s-]?out|remove|do not contact|cancel)\b/i;
const HOT_LEAD_RE = /\b(interested|viewing|book|call me|send details|available|price|rent|renew|contract|ejari|yes)\b/i;
const NEGATIVE_RE = /\b(no|not interested|wrong|spam|busy|stop|angry)\b/i;

export function triageIncomingDh2Reply(phone: string, messageText: string): ReplyTriageResult {
  const text = String(messageText || '').trim();

  if (OPT_OUT_RE.test(text)) {
    return {
      phone,
      intent: 'OPT_OUT',
      sentiment: 'negative',
      escalateToMaster: false,
      escalationTarget: null,
      optedOut: true,
      ctaUrl: 'https://whitecaves.ae',
    };
  }

  if (HOT_LEAD_RE.test(text)) {
    const isRenewal = /\b(renew|ejari|contract)/i.test(text);
    return {
      phone,
      intent: isRenewal ? 'RENEWAL_INTEREST' : 'HOT_LEAD',
      sentiment: 'positive',
      escalateToMaster: true,
      escalationTarget: 'sim-01-master',
      optedOut: false,
      ctaUrl: 'https://whitecaves.ae',
    };
  }

  return {
    phone,
    intent: 'GENERAL_INQUIRY',
    sentiment: NEGATIVE_RE.test(text) ? 'negative' : 'neutral',
    escalateToMaster: false,
    escalationTarget: null,
    optedOut: false,
    ctaUrl: 'https://whitecaves.ae',
  };
}
