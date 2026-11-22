/**
 * anti-ban/index.ts — Barrel export for WhatsApp Anti-Ban Defense modules.
 */

export { gaussianDelay, scheduleWithJitter } from './gaussianJitterScheduler.js';

export { isDubaiBusinessHours, isFridayPrayerPause, DubaiBusinessHoursGuard } from './dubaiBusinessHoursGuard.js';

export { getWeekendMultiplier, isDubaiWeekend, applyWeekendPacing } from './weekendPacingProfile.js';

export { simulateTyping } from './typingIndicatorSimulator.js';

export { emulateReadDelay } from './readReceiptEmulator.js';
export type { ReadableMessage } from './readReceiptEmulator.js';

export { injectMicroTypo } from './microTypoInjector.js';
export type { TypoResult } from './microTypoInjector.js';

export { InboundOutboundRatioGuard } from './inboundOutboundRatioGuard.js';
export type { RatioStatus } from './inboundOutboundRatioGuard.js';

export { AntiVelocityBurstBrake } from './antiVelocityBurstBrake.js';
export type { BrakeStatus } from './antiVelocityBurstBrake.js';

export { scanForSpamKeywords } from './spamKeywordSanitizer.js';
export type { SpamScanResult } from './spamKeywordSanitizer.js';

export { isOptOutMessage, OptOutDetector } from './optOutDetector.js';
export type { OptOutEvent } from './optOutDetector.js';

export { GlobalDndRegistry } from './globalDndRegistry.js';
export type { DndEntry, DndCheckResult } from './globalDndRegistry.js';

export { classifyContactWarmth } from './contactWarmthClassifier.js';
export type { ContactProfile, WarmthResult, WarmthLevel } from './contactWarmthClassifier.js';

export { rotateTemplate, TemplateRotatorSingleton } from './templateVariationRotator.js';

export { injectMouseMovement } from './simulatedMouseMovement.js';

export { AccountQuarantineIsolation } from './accountQuarantineIsolation.js';
export type { QuarantineEvent, QuarantineOptions } from './accountQuarantineIsolation.js';
