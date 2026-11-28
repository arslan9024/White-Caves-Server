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
  const parts = rawTarget.trim().split(/\s+/);
  const rawPhone = parts[0] || '';
  const rawRole = (parts[1] || 'master').toLowerCase();
  const targetDigits = normalizeMdPhoneDigits(rawPhone);
  if (!targetDigits || targetDigits.length < 9) {
    return `Invalid phone number "${rawTarget}". Example: \`pair 0563616136 master\` or \`pair 0589969886 hunter\``;
  }

  const role = rawRole.startsWith('emp') ? 'employee' : rawRole.startsWith('ser') || rawRole.startsWith('hunt') ? 'servant' : 'master';
  lindaMultiSimPool.addAccount({
    phoneNumber: targetDigits,
    role,
  });

  try {
    const res = await lindaMultiSimPool.requestAccountPairingCode(targetDigits);
    return `*PAIRING CODE (+${targetDigits})* [Role: ${role.toUpperCase()}]\nCode: *${res.pairingCode}*\nEnter in WhatsApp → Linked Devices → Link with phone number.\n\n_Reply 0 for keypad_`;
  } catch (err) {
    return `Pairing failed for +${targetDigits}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Handles adding an account directly from WhatsApp message:
 * `add master 0563616136` or `add hunter 0503869886`
 */
export async function handleMdAddAccountRequest(body: string): Promise<string | null> {
  const parts = body.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== 'add') return null;
  const rawRole = (parts[1] || 'master').toLowerCase();
  const rawPhone = parts[2] || '';
  const digits = normalizeMdPhoneDigits(rawPhone || rawRole);
  const role = parts.length >= 3 && rawRole.startsWith('emp') ? 'employee'
    : parts.length >= 3 && (rawRole.startsWith('ser') || rawRole.startsWith('hunt')) ? 'servant'
    : 'master';

  if (!digits || digits.length < 9) {
    return 'Usage: `add master <phone>` | `add employee <phone>` | `add hunter <phone>`\nExample: `add master 0563616136`';
  }

  const acc = lindaMultiSimPool.addAccount({
    phoneNumber: digits,
    role,
    displayName: `${role === 'master' ? 'Master' : role === 'employee' ? 'Employee' : 'Hunter'} (+${digits})`,
  });

  try {
    const res = await lindaMultiSimPool.requestAccountPairingCode(digits);
    return `✓ Added ${acc.id} (+${digits}) [${role.toUpperCase()}].\n*PAIRING CODE*: *${res.pairingCode}*\nEnter in WhatsApp → Linked Devices → Link with phone number.`;
  } catch (err) {
    return `✓ Added ${acc.id} (+${digits}) [${role.toUpperCase()}]. Pairing code pending: ${err instanceof Error ? err.message : String(err)}`;
  }
}
