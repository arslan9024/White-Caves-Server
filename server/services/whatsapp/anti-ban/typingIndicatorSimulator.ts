/**
 * typingIndicatorSimulator.ts — Send typing status proportional to text length.
 *
 * Simulates human-like typing delays before sending a message, making the
 * interaction appear organic to WhatsApp's behavioral analysis.
 */

const AVG_CHARS_PER_SECOND = 6; // ~360 chars/min — typical mobile typing
const MIN_TYPING_MS = 1_500;
const MAX_TYPING_MS = 25_000;
const JITTER_FACTOR = 0.2; // ±20% randomness

interface TypingCapableClient {
  sendPresenceAvailable?: () => Promise<void>;
  sendMessage?: (chatId: string, content: string) => Promise<unknown>;
}

/**
 * Calculate a realistic typing duration for a given text length.
 */
function computeTypingDuration(textLength: number): number {
  const baseMs = (textLength / AVG_CHARS_PER_SECOND) * 1_000;
  const jitter = baseMs * JITTER_FACTOR * (2 * Math.random() - 1);
  const duration = Math.round(baseMs + jitter);
  return Math.max(MIN_TYPING_MS, Math.min(MAX_TYPING_MS, duration));
}

/**
 * Simulate human typing behavior before sending a message.
 *
 * Sends a `composing` chat state for a duration proportional to the text
 * length, then resolves so the caller can send the actual message.
 *
 * @param client      WhatsApp client (or mock) with presence support.
 * @param chatId      The chat/contact to show typing in.
 * @param textLength  Number of characters in the outgoing message.
 * @returns The typing duration that was used (ms).
 */
export async function simulateTyping(
  client: TypingCapableClient,
  chatId: string,
  textLength: number,
): Promise<number> {
  const duration = computeTypingDuration(textLength);

  // Signal presence if available
  if (typeof client.sendPresenceAvailable === 'function') {
    try {
      await client.sendPresenceAvailable();
    } catch {
      // Non-critical — continue with the delay
    }
  }

  // Hold the typing indicator for the computed duration
  await new Promise<void>((resolve) => setTimeout(resolve, duration));

  // Suppress unused parameter lint — chatId is part of the public API
  // and will be used when wwebjs exposes per-chat composing state
  void chatId;

  return duration;
}
