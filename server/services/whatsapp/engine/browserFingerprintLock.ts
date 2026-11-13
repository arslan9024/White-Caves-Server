/**
 * browserFingerprintLock.ts — Lock user-agent, canvas hash, and viewport
 * per session to maintain consistent browser identity.
 *
 * Each clientId gets a deterministic fingerprint derived from its name so
 * WhatsApp sees a stable "device" across restarts.
 */

import crypto from 'crypto';

export interface BrowserFingerprint {
  clientId: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  platform: string;
  canvasSeed: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
] as const;

const VIEWPORTS = [
  { width: 1920, height: 1080, scale: 1 },
  { width: 1366, height: 768, scale: 1 },
  { width: 1536, height: 864, scale: 1.25 },
  { width: 1440, height: 900, scale: 1 },
  { width: 2560, height: 1440, scale: 1.5 },
] as const;

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'] as const;

/**
 * Deterministic hash of a clientId to an integer within [0, max).
 */
function deterministicIndex(clientId: string, salt: string, max: number): number {
  const hash = crypto
    .createHash('sha256')
    .update(`${clientId}:${salt}`)
    .digest();
  // Use first 4 bytes as a uint32
  const n = hash.readUInt32BE(0);
  return n % max;
}

/**
 * Return a stable, deterministic browser fingerprint for the given clientId.
 *
 * The same `clientId` always produces the same fingerprint, so WhatsApp sees
 * a consistent device identity across session restarts.
 */
export function getBrowserFingerprint(clientId: string): BrowserFingerprint {
  const uaIndex = deterministicIndex(clientId, 'ua', USER_AGENTS.length);
  const vpIndex = deterministicIndex(clientId, 'vp', VIEWPORTS.length);
  const plIndex = deterministicIndex(clientId, 'pl', PLATFORMS.length);

  const viewport = VIEWPORTS[vpIndex];
  const canvasSeed = crypto
    .createHash('sha256')
    .update(`${clientId}:canvas`)
    .digest('hex')
    .slice(0, 16);

  return {
    clientId,
    userAgent: USER_AGENTS[uaIndex],
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    deviceScaleFactor: viewport.scale,
    platform: PLATFORMS[plIndex],
    canvasSeed,
  };
}
