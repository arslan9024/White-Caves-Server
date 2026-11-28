import type { WhatsAppEngine } from './whatsAppEngineCore.js';
import type { WhatsAppEngineConfig } from './whatsAppEngineTypes.js';

const engines = new Map<string, WhatsAppEngine>();

/**
 * Return the process-wide WhatsAppEngine singleton for a specific clientId,
 * optionally applying config on first call.
 */
export function getWhatsAppEngine(
  clientId: string,
  config?: Omit<WhatsAppEngineConfig, 'clientId'>,
  factory?: (cfg: WhatsAppEngineConfig) => WhatsAppEngine
): WhatsAppEngine {
  if (!engines.has(clientId)) {
    if (!factory) {
      throw new Error(
        `WhatsAppEngine factory not initialized for ${clientId}. Call registerWhatsAppEngineFactory or use WhatsAppEngine entry point.`
      );
    }
    engines.set(clientId, factory({ clientId, ...config }));
  }
  return engines.get(clientId)!;
}

/**
 * Reset the singleton (primarily for tests).
 */
export function resetWhatsAppEngine(clientId?: string): void {
  if (clientId) {
    engines.delete(clientId);
  } else {
    engines.clear();
  }
}

/**
 * Register an active engine instance directly in the registry.
 */
export function setWhatsAppEngine(clientId: string, engine: WhatsAppEngine): void {
  engines.set(clientId, engine);
}

/**
 * Return all registered WhatsAppEngine instances.
 */
export function getAllWhatsAppEngines(): WhatsAppEngine[] {
  return Array.from(engines.values());
}

/**
 * Gracefully disconnect and flush Chromium LocalAuth state for all engines.
 */
export async function shutdownAllWhatsAppEngines(timeoutMs = 8_000): Promise<void> {
  const list = getAllWhatsAppEngines();
  if (list.length === 0) return;
  await Promise.race([
    Promise.allSettled(list.map(engine => engine.disconnect())),
    new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
  ]);
}
