/**
 * engine/index.ts — Barrel export for WhatsApp Engine Resiliency modules.
 */

export { SessionFailoverMatrix } from './sessionFailoverMatrix.js';
export type { SessionEndpoint } from './sessionFailoverMatrix.js';

export { reapZombieChromium } from './chromiumZombieReaper.js';

export { sanitizeSessionLocks } from './localAuthLockSanitizer.js';

export { AdaptiveBackoff } from './adaptiveReconnectBackoff.js';
export type { BackoffOptions } from './adaptiveReconnectBackoff.js';

export { WebSocketHeartbeat } from './websocketHeartbeat.js';
export type { HeartbeatOptions } from './websocketHeartbeat.js';

export { createQRStream } from './qrEventStream.js';

export { requestPairingCode } from './pairingCodeProvider.js';
export type { PairingResult } from './pairingCodeProvider.js';

export { SessionMemoryCeiling } from './sessionMemoryCeiling.js';
export type { MemoryCeilingOptions, MemorySnapshot } from './sessionMemoryCeiling.js';

export { pruneMediaCache } from './mediaCacheAutoPruner.js';

export { HeadlessToggleManager } from './headlessToggleManager.js';
export type { ToggleState } from './headlessToggleManager.js';

export { getBrowserFingerprint } from './browserFingerprintLock.js';
export type { BrowserFingerprint } from './browserFingerprintLock.js';

export { MultiAccountHealthLedger } from './multiAccountHealthLedger.js';
export type { AccountHealth } from './multiAccountHealthLedger.js';

export { SessionWarmupLifecycle } from './sessionWarmupLifecycle.js';
export type { WarmupStage } from './sessionWarmupLifecycle.js';

export { getBatteryTelemetry } from './batteryTelemetry.js';
export type { BatteryTelemetryResult, BatteryInfo, NetworkInfo } from './batteryTelemetry.js';

export {
  triggerRelinkAlert,
  onRelinkAlert,
  offRelinkAlert,
  registerWebhook,
} from './autoRelinkAlertWebhook.js';
export type { RelinkAlertPayload } from './autoRelinkAlertWebhook.js';
