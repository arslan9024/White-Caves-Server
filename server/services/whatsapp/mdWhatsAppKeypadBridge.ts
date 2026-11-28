import { getAgentOutputSnapshot, getServerStatusSnapshot } from '../../scripts/lindaInteractiveTerminal.js';
import type { WhatsAppEngine } from './engine/whatsAppEngineCore.js';

const MD_AUTHORIZED_DIGITS = new Set(['971589969886']);

function normalizeDigits(phone: string): string {
  const digits = phone.replace(/@.*/, '').replace(/\D/g, '');
  if (digits.startsWith('05') && digits.length === 10) {
    return `971${digits.slice(1)}`;
  }
  return digits;
}

function buildKeypadMenu(): string {
  return [
    '*WHITE CAVES — MD KEYPAD*',
    '[1] Server Status & Health',
    '[2] AI Linda Output',
    '[3] AI Zoe Output',
    '[4] AI Henry Output',
    '[5] AI Daisy Output',
    '[6] AI Diana Output',
    '[0] Menu / Help',
    '',
    '_Chat:_ `@zoe <msg>`, `@linda <msg>`, `@henry <msg>`, `@daisy <msg>`, `@diana <msg>`',
  ].join('\n');
}

/**
 * Handles inbound WhatsApp messages from the MD's personal number (971589969886)
 * to the primary Linda number, providing a mobile keypad & agent chat bridge.
 * Returns true if the message was handled by the MD bridge.
 */
export async function handleMdWhatsAppCommand(
  engine: WhatsAppEngine,
  fromPhone: string,
  body: string
): Promise<boolean> {
  const senderDigits = normalizeDigits(fromPhone);
  if (!MD_AUTHORIZED_DIGITS.has(senderDigits)) {
    return false;
  }

  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();
  let reply: string | null = null;

  if (lower === '0' || lower === 'menu' || lower === 'help' || lower === 'keypad') {
    reply = buildKeypadMenu();
  } else if (lower === '1' || lower === 'status') {
    reply = `${getServerStatusSnapshot()}\n\n_Reply 0 for keypad_`;
  } else if (lower === '2') {
    reply = `${getAgentOutputSnapshot('linda')}\n\n_Reply 0 for keypad_`;
  } else if (lower === '3') {
    reply = `${getAgentOutputSnapshot('zoe')}\n\n_Reply 0 for keypad_`;
  } else if (lower === '4') {
    reply = `${getAgentOutputSnapshot('henry')}\n\n_Reply 0 for keypad_`;
  } else if (lower === '5') {
    reply = `${getAgentOutputSnapshot('daisy')}\n\n_Reply 0 for keypad_`;
  } else if (lower === '6') {
    reply = `${getAgentOutputSnapshot('diana')}\n\n_Reply 0 for keypad_`;
  } else {
    const agentMatch = trimmed.match(/^@(linda|zoe|henry|daisy|diana)\s+([\s\S]+)$/i);
    if (agentMatch) {
      const agentName = agentMatch[1].toLowerCase() as 'linda' | 'zoe' | 'henry' | 'daisy' | 'diana';
      const prompt = agentMatch[2].trim();
      console.log(`[AI ${agentName.toUpperCase()}] MD WhatsApp (@${agentName}): ${prompt}`);
      reply = `*AI ${agentName.toUpperCase()}* received: "${prompt}"\n\n${getAgentOutputSnapshot(agentName)}\n\n_Reply 0 for keypad_`;
    }
  }

  if (!reply) {
    return false;
  }

  await engine.sendMessage(fromPhone, reply);
  return true;
}
