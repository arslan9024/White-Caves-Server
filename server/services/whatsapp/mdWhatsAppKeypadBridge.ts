import type { WhatsAppEngine } from './engine/whatsAppEngineCore.js';
import { routeMdAgentOrKeypadCommand } from './mdWhatsAppAgentRouter.js';
import { handleCampaignCommand } from './mdCampaignCommands.js';
import { handleMdPairingRequest, handleMdAddAccountRequest, normalizeMdPhoneDigits } from './mdWhatsAppPairingHandler.js';
import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';

const MD_AUTHORIZED_DIGITS = new Set([
  '971505760056',
  '971589969886',
  '971503869886',
  '971505110636',
  '971553633595',
  '971563616136',
]);

function isAuthorizedMdSender(digits: string): boolean {
  if (MD_AUTHORIZED_DIGITS.has(digits)) return true;
  // Also authorize any account that exists in the pool with role=master or simTier=PRIMARY_MASTER_CLOSER
  const poolAcc = lindaMultiSimPool.findAccount(digits);
  return poolAcc?.role === 'master' || poolAcc?.simTier === 'PRIMARY_MASTER_CLOSER';
}

/**
 * Handles inbound WhatsApp messages from authorized MD master accounts
 * to the primary Linda number, delegating to pairing & agent/keypad handlers.
 */
export async function handleMdWhatsAppCommand(
  engine: WhatsAppEngine,
  fromPhone: string,
  body: string,
  senderPhone?: string
): Promise<boolean> {
  const senderDigits = normalizeMdPhoneDigits(senderPhone || fromPhone);
  if (!isAuthorizedMdSender(senderDigits)) {
    console.log(`[MD_BRIDGE] Inbound message from unauthorized sender: ${senderDigits} (body: ${body.substring(0, 30)})`);
    return false;
  }

  const trimmed = body.trim();
  const reply = trimmed.toLowerCase().startsWith('add ')
    ? await handleMdAddAccountRequest(trimmed)
    : trimmed.toLowerCase().startsWith('pair ')
    ? await handleMdPairingRequest(trimmed.slice(5).trim())
    : (await handleCampaignCommand(trimmed)) ?? (await routeMdAgentOrKeypadCommand(trimmed));

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
