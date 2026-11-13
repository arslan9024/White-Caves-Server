/**
 * readReceiptEmulator.ts — 3–8 s human reading delay before blue ticks.
 *
 * Adds a realistic pause between receiving a message and marking it as read,
 * preventing the instant-read pattern that flags automated accounts.
 */

const MIN_READ_DELAY_MS = 3_000;
const MAX_READ_DELAY_MS = 8_000;
const LONG_MESSAGE_THRESHOLD = 200; // chars
const LONG_MESSAGE_EXTRA_MS = 3_000;

export interface ReadableMessage {
  id: string | { _serialized?: string };
  body?: string;
  from?: string;
  hasMedia?: boolean;
}

/**
 * Compute a realistic reading delay based on message content.
 *
 * Longer messages and media get extra time.
 */
function computeReadDelay(message: ReadableMessage): number {
  const base = MIN_READ_DELAY_MS + Math.random() * (MAX_READ_DELAY_MS - MIN_READ_DELAY_MS);
  let extra = 0;

  const bodyLen = message.body?.length ?? 0;
  if (bodyLen > LONG_MESSAGE_THRESHOLD) {
    extra += LONG_MESSAGE_EXTRA_MS * (bodyLen / 500);
  }

  if (message.hasMedia) {
    extra += 2_000 + Math.random() * 3_000;
  }

  return Math.round(Math.min(base + extra, 15_000)); // hard cap at 15 s
}

/**
 * Wait a human-like duration before the caller marks a message as read.
 *
 * Usage:
 * ```ts
 * await emulateReadDelay(message);
 * await message.markAsRead(); // blue ticks appear after the delay
 * ```
 *
 * @param message  The incoming message to "read".
 * @returns The delay that was applied (ms).
 */
export async function emulateReadDelay(message: ReadableMessage): Promise<number> {
  const delay = computeReadDelay(message);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  return delay;
}
