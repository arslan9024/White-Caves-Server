import type { WhatsAppEngine } from './engine/whatsAppEngineCore.js';
import { routeMdAgentOrKeypadCommand } from './mdWhatsAppAgentRouter.js';
import { handleMdPairingRequest, normalizeMdPhoneDigits } from './mdWhatsAppPairingHandler.js';

const MD_AUTHORIZED_DIGITS = new Set([
  '971589969886',
  '971503869886',
  '971505110636',
  '971553633595',
]);

/**
 * Handles inbound WhatsApp messages from authorized MD master accounts
 * to the primary Linda number, delegating to pairing & agent/keypad handlers.
 */
export async function handleMdWhatsAppCommand(
  engine: WhatsAppEngine,
  fromPhone: string,
  body: string
): Promise<boolean> {
  const senderDigits = normalizeMdPhoneDigits(fromPhone);
  if (!MD_AUTHORIZED_DIGITS.has(senderDigits)) {
    return false;
  }

  const trimmed = body.trim();
  const reply = trimmed.toLowerCase().startsWith('pair ')
    ? await handleMdPairingRequest(trimmed.slice(5).trim())
    : await routeMdAgentOrKeypadCommand(trimmed);

  if (!reply) {
    return false;
  }

  try {
    await engine.sendMessage(fromPhone, reply);
  } catch (err) {
    console.error(`[MD_BRIDGE] Failed to send reply to ${fromPhone}:`, err instanceof Error ? err.message : err);
  }
  return true;
}
