/**
 * optOutDetector.ts — Recognize STOP / UNSUBSCRIBE / NO and similar opt-out
 * signals in incoming messages.
 *
 * Ensures compliance with anti-spam regulations by detecting when a recipient
 * wants to stop receiving messages.
 */

const OPT_OUT_KEYWORDS: readonly string[] = [
  'stop', 'unsubscribe', 'remove me', 'opt out', 'opt-out',
  'cancel', 'no more', 'do not contact', 'don\'t contact',
  'leave me alone', 'remove my number', 'block',
  'i don\'t want', 'i do not want', 'please stop',
  'take me off', 'off the list', 'not interested',
] as const;

const ARABIC_OPT_OUT: readonly string[] = [
  'توقف', 'إلغاء الاشتراك', 'لا تتواصل', 'أوقف', 'لا أريد',
] as const;

/**
 * Check if an incoming message text is an opt-out request.
 *
 * Supports English and Arabic keywords, case-insensitive, with
 * normalization of common whitespace/punctuation variations.
 *
 * @param text  The incoming message body.
 * @returns `true` if the message is an opt-out signal.
 */
export function isOptOutMessage(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, '')  // strip trailing punctuation
    .replace(/\s+/g, ' ');       // collapse whitespace

  // Exact single-word match (e.g. just "stop" or "no")
  if (normalized === 'stop' || normalized === 'no') {
    return true;
  }

  // English keywords
  for (const keyword of OPT_OUT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }

  // Arabic keywords
  for (const keyword of ARABIC_OPT_OUT) {
    if (text.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export interface OptOutEvent {
  contactId: string;
  message: string;
  detectedAt: Date;
  keyword: string;
}

/**
 * Stateful opt-out detector that maintains a registry of opted-out contacts.
 */
export class OptOutDetector {
  private readonly registry: Map<string, OptOutEvent> = new Map();

  /**
   * Process an incoming message and register opt-out if detected.
   *
   * @param contactId  The sender's phone number or WhatsApp ID.
   * @param text       The message body.
   * @returns `true` if this message triggered an opt-out.
   */
  process(contactId: string, text: string): boolean {
    if (!isOptOutMessage(text)) return false;

    // Find which keyword matched for audit trail
    const normalized = text.trim().toLowerCase();
    let matchedKeyword = 'unknown';

    for (const kw of OPT_OUT_KEYWORDS) {
      if (normalized.includes(kw)) {
        matchedKeyword = kw;
        break;
      }
    }

    this.registry.set(contactId, {
      contactId,
      message: text,
      detectedAt: new Date(),
      keyword: matchedKeyword,
    });

    return true;
  }

  /** Check if a contact has opted out. */
  isOptedOut(contactId: string): boolean {
    return this.registry.has(contactId);
  }

  /** Re-subscribe a contact (manual override). */
  resubscribe(contactId: string): boolean {
    return this.registry.delete(contactId);
  }

  /** Get all opted-out contacts. */
  getOptedOutContacts(): OptOutEvent[] {
    return [...this.registry.values()];
  }

  /** Number of opted-out contacts. */
  get size(): number {
    return this.registry.size;
  }
}
