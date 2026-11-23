/**
 * WhatsAppEngine — Generic WhatsApp LocalAuth Client Entry Point
 *
 * Decomposed under AEGIS V5.1 AEG-042 (< 350 lines, target <= 300 lines).
 * Re-exports subcomponents, helpers, registry, and types for full backward compatibility.
 */

import { WhatsAppEngine } from './engine/whatsAppEngineCore.js';
import {
  getWhatsAppEngine as getFromRegistry,
  resetWhatsAppEngine,
} from './engine/whatsAppEngineRegistry.js';
import type { WhatsAppEngineConfig } from './engine/whatsAppEngineTypes.js';

export {
  type WhatsAppMessage,
  type WhatsAppEngineConfig,
  WhatsAppEngineStatus,
  type WhatsAppEngineStats,
  type WhatsAppChatSummary,
  type WhatsAppBroadcastResult,
  type WhatsAppMessageSentEvent,
} from './engine/whatsAppEngineTypes.js';

export {
  detectMessageType,
  normalizeIncomingMessage,
  formatChatId,
  sanitizePhoneNumber,
  generateFallbackPairingCode,
} from './engine/whatsAppMessageHelpers.js';

export { WhatsAppEngine } from './engine/whatsAppEngineCore.js';
export { resetWhatsAppEngine } from './engine/whatsAppEngineRegistry.js';

/**
 * Return the process-wide WhatsAppEngine singleton for a specific clientId,
 * optionally applying config on first call.
 */
export function getWhatsAppEngine(
  clientId: string,
  config?: Omit<WhatsAppEngineConfig, 'clientId'>
): WhatsAppEngine {
  return getFromRegistry(clientId, config, (cfg) => new WhatsAppEngine(cfg));
}
