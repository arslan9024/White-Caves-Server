/**
 * batteryTelemetry.ts — Read phone battery level & network status from
 * a connected WhatsApp client.
 *
 * Useful for monitoring the health of the physical device running the
 * WhatsApp session (especially for business accounts on real phones).
 */

export interface BatteryInfo {
  level: number;       // 0–100 %
  charging: boolean;
}

export interface NetworkInfo {
  type: string;        // e.g. 'wifi', 'cellular', 'unknown'
  connected: boolean;
}

export interface BatteryTelemetryResult {
  clientId: string;
  battery: BatteryInfo;
  network: NetworkInfo;
  timestamp: Date;
}

interface TelemetryCapableClient {
  info?: {
    phone?: {
      device_manufacturer?: string;
      os_version?: string;
      wa_version?: string;
    };
    platform?: string;
    pushname?: string;
  };
  /**
   * whatsapp-web.js exposes battery info through different APIs
   * depending on version.
   */
  getBatteryStatus?: () => Promise<{ battery: number; plugged: boolean }>;
  getState?: () => Promise<string>;
  pupPage?: {
    evaluate: <T>(fn: () => T) => Promise<T>;
  };
}

/**
 * Retrieve battery and network telemetry from a whatsapp-web.js client.
 *
 * Falls back to Puppeteer page evaluation if the native API is unavailable.
 */
export async function getBatteryTelemetry(
  client: TelemetryCapableClient,
  clientId: string = 'default',
): Promise<BatteryTelemetryResult> {
  let battery: BatteryInfo = { level: -1, charging: false };
  let network: NetworkInfo = { type: 'unknown', connected: true };

  // Strategy 1: Native getBatteryStatus
  if (typeof client.getBatteryStatus === 'function') {
    try {
      const status = await client.getBatteryStatus();
      battery = {
        level: Math.max(0, Math.min(100, status.battery)),
        charging: status.plugged,
      };
    } catch {
      // fall through to strategy 2
    }
  }

  // Strategy 2: Puppeteer page evaluation
  if (battery.level === -1 && client.pupPage) {
    try {
      const data = await client.pupPage.evaluate(() => {
        const nav = globalThis.navigator as Navigator & {
          getBattery?: () => Promise<{
            level: number;
            charging: boolean;
          }>;
          connection?: { type?: string };
        };

        const result: {
          batteryLevel: number;
          charging: boolean;
          networkType: string;
          online: boolean;
        } = {
          batteryLevel: -1,
          charging: false,
          networkType: 'unknown',
          online: nav.onLine ?? true,
        };

        if (nav.connection?.type) {
          result.networkType = nav.connection.type;
        }

        return result;
      });

      if (data.batteryLevel >= 0) {
        battery = {
          level: Math.round(data.batteryLevel * 100),
          charging: data.charging,
        };
      }

      network = {
        type: data.networkType,
        connected: data.online,
      };
    } catch {
      // telemetry unavailable — return defaults
    }
  }

  return {
    clientId,
    battery,
    network,
    timestamp: new Date(),
  };
}
