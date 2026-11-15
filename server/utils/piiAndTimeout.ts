/**
 * UAE PII Masking & Government API Timeout Utilities (AEG-011 / Point 19 & 24)
 */

export function maskEmiratesId(eid: string): string {
  const digits = eid.replace(/\D/g, '');
  if (digits.length < 7) return '***-****-*******-*';
  return `${digits.slice(0, 3)}-****-*****${digits.slice(-2, -1)}-${digits.slice(-1)}`;
}

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, '');
  if (clean.length < 8) return '****';
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

export function maskPassport(passport: string): string {
  if (passport.length < 4) return '****';
  return `${passport.slice(0, 2)}****${passport.slice(-2)}`;
}

/** Enforces AEG-011 1,500ms timeout on third-party UAE government/bank APIs. */
export async function fetchWithGovTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 1500
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
