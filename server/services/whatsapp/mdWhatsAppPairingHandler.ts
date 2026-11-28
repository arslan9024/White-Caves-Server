import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';

export function normalizeMdPhoneDigits(phone: string): string {
  const digits = phone.replace(/[:@].*/, '').replace(/\D/g, '');
  if (digits.startsWith('05') && digits.length === 10) {
    return `971${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Handles `pair <phone>` requests from authorized MD master accounts.
 */
export async function handleMdPairingRequest(rawTarget: string): Promise<string> {
  const targetDigits = normalizeMdPhoneDigits(rawTarget);
  if (!targetDigits || targetDigits.length < 9) {
    return `Invalid phone number "${rawTarget}". Example: \`pair 0589969886\``;
  }

  try {
    const res = await lindaMultiSimPool.requestAccountPairingCode(targetDigits);
    return `*PAIRING CODE (+${targetDigits})*\nCode: *${res.pairingCode}*\nEnter in WhatsApp → Linked Devices → Link with phone number.\n\n_Reply 0 for keypad_`;
  } catch (err) {
    return `Pairing failed for +${targetDigits}: ${err instanceof Error ? err.message : String(err)}`;
  }
}
