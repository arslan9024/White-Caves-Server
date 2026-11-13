/**
 * autoRelinkAlertWebhook.ts — Push notification on master session disconnect.
 *
 * Fires an HTTP webhook (and optional in-app event) when a WhatsApp session
 * disconnects unexpectedly, prompting ops to re-scan the QR code.
 */

import { EventEmitter } from 'events';

export interface RelinkAlertPayload {
  clientId: string;
  reason: string;
  timestamp: string;
  severity: 'warning' | 'critical';
}

interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

// Module-level event bus for in-process subscribers
const alertBus = new EventEmitter();

/** Subscribe to relink alerts in-process. */
export function onRelinkAlert(
  handler: (payload: RelinkAlertPayload) => void,
): void {
  alertBus.on('relink', handler);
}

/** Remove a previously registered handler. */
export function offRelinkAlert(
  handler: (payload: RelinkAlertPayload) => void,
): void {
  alertBus.off('relink', handler);
}

// Registered webhook endpoints (set via `registerWebhook`)
const webhooks: WebhookConfig[] = [];

/** Register an external webhook URL to receive relink alerts. */
export function registerWebhook(config: WebhookConfig): void {
  webhooks.push(config);
}

/**
 * Fire a relink alert for the given client.
 *
 * Emits to both in-process listeners and all registered webhooks.
 * Webhook failures are caught and logged — they never throw.
 *
 * @param clientId  The disconnected session identifier.
 * @param reason    Human-readable disconnect reason.
 */
export async function triggerRelinkAlert(
  clientId: string,
  reason: string,
): Promise<void> {
  const payload: RelinkAlertPayload = {
    clientId,
    reason,
    timestamp: new Date().toISOString(),
    severity: reason.includes('banned') || reason.includes('logout')
      ? 'critical'
      : 'warning',
  };

  // In-process notification
  alertBus.emit('relink', payload);

  // External webhooks — fire-and-forget with error swallowing
  const requests = webhooks.map(async (wh) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        wh.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );

      await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...wh.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);
    } catch (err) {
      // Log but never propagate — the alert itself is best-effort
      console.error(
        `[AutoRelinkAlert] Webhook ${wh.url} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  });

  await Promise.allSettled(requests);
}
