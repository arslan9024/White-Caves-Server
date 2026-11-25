import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_10_SIM_FLEET, PRIMARY_MASTER_PHONE, type SimTier } from './leasingSimOutreachFormula.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('LindaPoolConfig');

export interface PoolAccountConfig {
  id: string;
  phoneNumber: string;
  sessionId: string;
  displayName: string;
  role: 'master' | 'employee' | 'servant';
  simTier: SimTier;
  hourlyLimit: number;
}

export const normalizePhoneDigits = (phone: string): string => String(phone || '').replace(/\D/g, '');

export const isPrimaryMasterAccount = (account: Pick<PoolAccountConfig, 'phoneNumber' | 'simTier'>): boolean =>
  account.simTier === 'PRIMARY_MASTER_CLOSER' ||
  normalizePhoneDigits(account.phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE);

const DEFAULT_10_SIM_ACCOUNTS: PoolAccountConfig[] = CANONICAL_10_SIM_FLEET.map(s => ({
  id: s.id,
  phoneNumber: s.phoneNumber,
  sessionId: s.sessionId,
  displayName: s.displayName,
  role: s.tier === 'PRIMARY_MASTER_CLOSER' ? 'master' : 'servant',
  simTier: s.tier,
  hourlyLimit: s.hourlyCap,
}));

export function loadPoolAccountsConfig(): PoolAccountConfig[] {
  try {
    const configPath = path.resolve(process.cwd(), 'data/app/whatsapp-accounts.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(parsed?.accounts) && parsed.accounts.length > 0) {
        return parsed.accounts.map((a: any, idx: number) => {
          const phoneNumber = String(a.phoneNumber);
          const isMaster =
            a.simTier === 'PRIMARY_MASTER_CLOSER' ||
            normalizePhoneDigits(phoneNumber) === normalizePhoneDigits(PRIMARY_MASTER_PHONE);
          return {
            id: String(a.id || `sim-${String(idx + 1).padStart(2, '0')}`),
            phoneNumber,
            sessionId: String(a.sessionId || `session-${normalizePhoneDigits(phoneNumber)}`),
            displayName: String(a.displayName || phoneNumber),
            role: (isMaster ? 'master' : a.role === 'employee' ? 'employee' : 'servant') as PoolAccountConfig['role'],
            simTier: (isMaster ? 'PRIMARY_MASTER_CLOSER' : 'HUNTER_OUTREACH') as SimTier,
            hourlyLimit: Number(a.hourlyLimit || (isMaster ? 25 : 18)),
          };
        });
      }
    }
  } catch (err) {
    log.warn('Failed reading whatsapp-accounts.json, using canonical 10-SIM defaults', err);
  }
  return DEFAULT_10_SIM_ACCOUNTS;
}
