import type { WhatsAppMessage } from './whatsAppEngineTypes.js';

/**
 * Detect message type from MIME type or hasMedia flag.
 */
export function detectMessageType(message: {
  hasMedia?: boolean;
  mimetype?: string;
}): WhatsAppMessage['type'] {
  if (!message.hasMedia) return 'text';
  const mime: string = message.mimetype ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('pdf') || mime.includes('document') || mime.startsWith('application/')) {
    return 'document';
  }
  return 'text';
}

/**
 * Normalise raw whatsapp-web.js message object into our standardized WhatsAppMessage shape.
 */
export function normalizeIncomingMessage(rawMessage: unknown): WhatsAppMessage {
  const msg = rawMessage as {
    id?: { id: string };
    from?: string;
    to?: string;
    body?: string;
    timestamp?: number;
    fromMe?: boolean;
    hasMedia?: boolean;
    mimetype?: string;
  };

  return {
    id: msg?.id?.id ?? `msg_${Date.now()}`,
    from: msg?.from ?? '',
    to: msg?.to,
    body: msg?.body ?? '',
    timestamp: new Date((msg?.timestamp ?? Date.now() / 1000) * 1000),
    isFromMe: msg?.fromMe ?? false,
    hasMedia: msg?.hasMedia ?? false,
    type: detectMessageType(msg ?? {}),
  };
}

/**
 * Format chatId according to WhatsApp web specifications.
 */
export function formatChatId(phoneNumber: string): string {
  return phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
}

/**
 * Sanitize E.164 phone numbers (digits only).
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^0-9]/g, '');
}

/**
 * Generate fallback simulated pairing code when native generation is not available.
 */
export function generateFallbackPairingCode(sanitizedNumber: string): string {
  const suffix = sanitizedNumber.slice(-4);
  const randomPin = Math.floor(1000 + Math.random() * 9000);
  return `WC-${suffix}-${randomPin}`;
}
