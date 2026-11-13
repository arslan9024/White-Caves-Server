/**
 * pairingCodeProvider.ts — Phone-number-based 8-char pairing code fallback.
 *
 * When QR scanning is unavailable (e.g. remote headless deployment), this
 * module requests a numeric pairing code from whatsapp-web.js and returns it
 * so the user can type it on their phone.
 */

export interface PairingResult {
  code: string;
  phoneNumber: string;
  expiresAt: Date;
}

interface PairableEngine {
  requestPairingCode?: (phoneNumber: string) => Promise<string>;
}

const PAIRING_CODE_TTL_MS = 60_000; // codes expire ~60 s
const PHONE_NUMBER_RE = /^\d{10,15}$/;

/**
 * Validate and normalize a phone number to the E.164-ish digit-only format
 * that whatsapp-web.js expects.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!PHONE_NUMBER_RE.test(digits)) {
    throw new Error(
      `Invalid phone number "${raw}": must be 10–15 digits (E.164 without +).`,
    );
  }
  return digits;
}

/**
 * Request an 8-character pairing code for the given phone number.
 *
 * @param engine       A whatsapp-web.js `Client` (or any object exposing
 *                     `requestPairingCode`).
 * @param phoneNumber  Target phone number (digits only or with `+` prefix).
 * @returns The pairing code and its approximate expiry.
 * @throws  If the engine does not support pairing codes or the number is invalid.
 */
export async function requestPairingCode(
  engine: PairableEngine,
  phoneNumber: string,
): Promise<PairingResult> {
  if (typeof engine.requestPairingCode !== 'function') {
    throw new Error(
      'This engine does not support pairing codes. Update whatsapp-web.js to >= 1.23.',
    );
  }

  const normalized = normalizePhone(phoneNumber);
  const code = await engine.requestPairingCode(normalized);

  return {
    code,
    phoneNumber: normalized,
    expiresAt: new Date(Date.now() + PAIRING_CODE_TTL_MS),
  };
}
