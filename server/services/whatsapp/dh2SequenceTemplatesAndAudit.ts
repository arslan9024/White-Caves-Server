/**
 * dh2SequenceTemplatesAndAudit.ts
 * White Caves Real Estate LLC — DLD-Compliant, Privacy-Safe WhatsApp Templates & Compliance Auditor
 * Extracted under AEGIS AEG-042 (< 350 lines).
 */

import { scanForSpamKeywords } from './anti-ban/index.js';

export type CampaignSequenceKey = 'LANDLORD_RETENTION_RENEWAL' | 'TENANT_FOLLOWUP' | 'DH2_LANDLORD_DISCOVERY';

export interface SequenceStepTemplate {
  stepNumber: 1 | 2 | 3;
  dayOffset: number;
  label: string;
  body: string;
}

export interface CampaignDeliveryLogEntry {
  id: string;
  timestamp: string;
  sequenceKey: CampaignSequenceKey;
  to: string;
  contactName: string;
  cluster: string;
  assignedSim: string;
  simTier: 'PRIMARY_MASTER_CLOSER' | 'HUNTER_OUTREACH';
  delayMs: number;
  message: string;
  status:
    | 'sent'
    | 'dry_run'
    | 'queued_outside_hours'
    | 'no_connected_sim'
    | 'dnc_suppressed'
    | 'blocked_compliance'
    | 'error';
  privacyAuditPassed: boolean;
  spamRiskScore: number;
  error?: string;
}

export interface ComplianceAuditResult {
  passed: boolean;
  sanitizedMessage: string;
  strippedPrivateTokens: string[];
  hasWhiteCavesAeCta: boolean;
  hasArslanBookingCta: boolean;
  spamRiskScore: number;
  spamFlaggedWords: string[];
  violations: string[];
}

export const PRIVATE_IDENTIFIER_PATTERNS: RegExp[] = [
  /\b(?:unit|villa|plot|apt|apartment|door|house|flat|p-number)\s*(?:no\.?|number|#)?\s*[a-z0-9-]+\b/gi,
  /\b(?:VRD|JAN|PAC|CAM|ALB|BAS|CLV|AMA|ZIN|MIM|SUN)-\d{2,5}\b/gi,
  /\bdewa\s*(?:premise|account)?\s*#?\s*\d{6,}\b/gi,
];

export const CAMPAIGN_SEQUENCE_LIBRARY: Record<CampaignSequenceKey, SequenceStepTemplate[]> = {
  LANDLORD_RETENTION_RENEWAL: [
    {
      stepNumber: 1,
      dayOffset: 0,
      label: 'Day 0 — Lease Renewal & Market Valuation Check-In',
      body:
        'Hello {{name}}, this is Linda from White Caves Real Estate LLC (RERA Licensed — DAMAC Hills 2 Leasing Desk). Ahead of your upcoming {{bedrooms}}BR {{cluster}}, DAMAC Hills 2 lease milestone, our Managing Director Arslan Malik would be glad to share the latest RERA rental benchmark, handle your 90-day renewal notice, or manage re-leasing seamlessly. Explore our landlord services at https://whitecaves.ae or reply to schedule a brief call with Arslan Malik. Reply STOP anytime to opt out.',
    },
    {
      stepNumber: 2,
      dayOffset: 4,
      label: 'Day 4 — Full Property Management & Verified Corporate Tenants',
      body:
        'Hi {{name}}, quick follow-up from White Caves Real Estate LLC regarding your {{bedrooms}}BR residence in {{cluster}}, DAMAC Hills 2. We have pre-qualified families ready for viewings and can prepare your DLD Unified Tenancy Contract & Ejari end-to-end. Book a direct landlord consultation with Arslan Malik via https://whitecaves.ae or reply YES for an updated rental assessment.',
    },
    {
      stepNumber: 3,
      dayOffset: 14,
      label: 'Day 14 — Polite Concierge Check-In (Opt-Out Safe)',
      body:
        'Greetings {{name}}, final courteous check-in from White Caves Real Estate (DAMAC Hills 2 Specialists). Whenever you plan to renew or lease your {{cluster}} property, Arslan Malik and our desk are ready at https://whitecaves.ae. Reply STOP if you prefer no further updates.',
    },
  ],
  TENANT_FOLLOWUP: [
    {
      stepNumber: 1,
      dayOffset: 0,
      label: 'Day 0 — Renewal Support or Curated DH2 Upgrade Options',
      body:
        'Hello {{name}}, this is Linda from White Caves Real Estate LLC (DAMAC Hills 2 Leasing Desk). As your {{cluster}} tenancy approaches renewal, would you like assistance renewing your Ejari smoothly or exploring verified {{bedrooms}}BR homes in DAMAC Hills 2? Browse live listings at https://whitecaves.ae and reply to schedule a private viewing with Arslan Malik (Leasing Specialist / MD). Reply STOP to opt out.',
    },
    {
      stepNumber: 2,
      dayOffset: 3,
      label: 'Day 3 — Curated DAMAC Hills 2 Availability & Flexible Cheques',
      body:
        'Hi {{name}}, White Caves Real Estate has newly verified {{bedrooms}}BR residences available in {{cluster}} and neighboring DAMAC Hills 2 clusters with flexible cheque plans. View curated options at https://whitecaves.ae and let us know a convenient time for a guided tour with Arslan Malik.',
    },
    {
      stepNumber: 3,
      dayOffset: 7,
      label: 'Day 7 — Direct Viewing Slot Confirmation with Arslan Malik',
      body:
        'Hello {{name}}, polite follow-up from White Caves Real Estate LLC. If you are comparing renewal vs moving within DAMAC Hills 2, Arslan Malik has viewing slots open this week — book anytime at https://whitecaves.ae or reply with your preferred day. Reply STOP to opt out.',
    },
  ],
  DH2_LANDLORD_DISCOVERY: [
    {
      stepNumber: 1,
      dayOffset: 0,
      label: 'Day 0 — Privacy-Safe Hunter Availability Discovery',
      body:
        'Hello {{name}}, this is Linda from White Caves Real Estate LLC (DAMAC Hills 2 Leasing Desk). We have pre-qualified tenants actively seeking {{bedrooms}}BR homes in {{cluster}}, DAMAC Hills 2. Are you planning to lease your property soon? View our platform at https://whitecaves.ae or reply to coordinate a viewing with Arslan Malik. Reply STOP to opt out.',
    },
    {
      stepNumber: 2,
      dayOffset: 4,
      label: 'Day 4 — Verified Tenant Demand Follow-Up',
      body:
        'Hi {{name}}, brief follow-up from White Caves Real Estate LLC regarding {{cluster}}, DAMAC Hills 2. We handle verified viewings, cheque collection, and Ejari registration directly with Arslan Malik. Learn more at https://whitecaves.ae or reply if your {{bedrooms}}BR home will be vacant soon.',
    },
    {
      stepNumber: 3,
      dayOffset: 14,
      label: 'Day 14 — Final Polite Check-In',
      body:
        'Greetings {{name}}, final polite check-in from White Caves Real Estate (DAMAC Hills 2 Desk). Whenever you decide to lease in {{cluster}}, visit https://whitecaves.ae or reply here to connect with Arslan Malik. Reply STOP if you prefer no further messages.',
    },
  ],
};

export function sanitizeAndAuditOutboundMessage(rawMessage: string): ComplianceAuditResult {
  let sanitized = String(rawMessage || '').trim();
  const strippedPrivateTokens: string[] = [];

  for (const regex of PRIVATE_IDENTIFIER_PATTERNS) {
    regex.lastIndex = 0;
    const matches = sanitized.match(regex);
    if (matches) {
      strippedPrivateTokens.push(...matches);
      sanitized = sanitized.replace(regex, 'your residence');
    }
  }
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  const spam = scanForSpamKeywords(sanitized);
  const hasWhiteCavesAeCta = /whitecaves\.ae/i.test(sanitized);
  const hasArslanBookingCta = /arslan\s+malik/i.test(sanitized);
  const violations: string[] = [];

  if (!spam.clean) {
    violations.push(`Spam risk score too high (${spam.riskScore}/100): ${spam.flaggedWords.join(', ')}`);
  }
  if (!hasWhiteCavesAeCta) violations.push('Missing direct conversion CTA link to whitecaves.ae');
  if (!hasArslanBookingCta) violations.push('Missing viewing/consultation CTA with Arslan Malik');

  return {
    passed: spam.clean && hasWhiteCavesAeCta && hasArslanBookingCta,
    sanitizedMessage: sanitized,
    strippedPrivateTokens,
    hasWhiteCavesAeCta,
    hasArslanBookingCta,
    spamRiskScore: spam.riskScore,
    spamFlaggedWords: spam.flaggedWords,
    violations,
  };
}

export function renderSequenceMessage(
  template: string,
  vars: { name?: string; cluster?: string; bedrooms?: string }
): ComplianceAuditResult {
  const rendered = template
    .replace(/\{\{name\}\}/g, vars.name || 'Valued Client')
    .replace(/\{\{ownerName\}\}/g, vars.name || 'Valued Client')
    .replace(/\{\{cluster\}\}/g, vars.cluster || 'DAMAC Hills 2')
    .replace(/\{\{bedrooms\}\}/g, vars.bedrooms || '3');
  return sanitizeAndAuditOutboundMessage(rendered);
}

export function hasNoLeakedPrivateIdentifiers(text: string): boolean {
  return !PRIVATE_IDENTIFIER_PATTERNS.some(re => {
    re.lastIndex = 0;
    return re.test(text);
  });
}
