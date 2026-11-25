/**
 * dh2WarmContactsService.ts
 * White Caves Real Estate LLC — DAMAC Hills 2 Historical Warm Contacts Aggregator
 *
 * Connects historical Landlords and Tenants extracted from Henry's Google Drive
 * DAMAC Hills 2 tenancy contracts, Prisma TenancyContract/Lease records, and the
 * local DH2 registry into Linda's categorized warm contact list (< 350 lines, AEG-042).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { isPhoneSuppressed } from './dh2OutreachGovernanceService.js';
import {
  classifyWarmContact,
  daysBetween,
  inferCluster,
  loadLocalDh2RegistryContacts,
  normalizePhoneDigitsSafe,
} from './dh2WarmLocalRegistryLoader.js';

export { classifyWarmContact };

const log = createLogger('Dh2WarmContacts');
const defaultDb = prisma as any;

export type WarmContactCategory = 'LANDLORD_RETENTION_RENEWAL' | 'TENANT_FOLLOWUP';
export type WarmContactUrgency =
  | 'EXPIRING_SOON'
  | 'RERA_90D_RENEWAL_WINDOW'
  | 'EXPIRED_REENGAGE'
  | 'MANAGEMENT_OFFER'
  | 'ALTERNATIVE_UNIT_MATCH';

export interface Dh2WarmContact {
  id: string;
  name: string;
  phone: string;
  e164: string;
  role: 'LANDLORD' | 'TENANT';
  category: WarmContactCategory;
  urgency: WarmContactUrgency;
  cluster: string;
  bedrooms: string;
  leaseEndDate: string | null;
  daysUntilExpiry: number | null;
  annualRentAed: number | null;
  recommendedSequence: WarmContactCategory;
  source: 'HENRY_DRIVE_TENANCY' | 'PRISMA_LEASE' | 'DH2_LOCAL_REGISTRY';
  dncSuppressed: boolean;
}

export interface Dh2WarmContactsSummary {
  total: number;
  landlordRetentionCount: number;
  tenantFollowUpCount: number;
  expiringWithin90DaysCount: number;
  dncSuppressedCount: number;
  sources: Record<string, number>;
  clustersSummary: Record<string, number>;
  contacts: Dh2WarmContact[];
}

async function loadPrismaTenancyWarmContacts(
  db: any,
  now: Date
): Promise<Omit<Dh2WarmContact, 'dncSuppressed'>[]> {
  const extracted: Omit<Dh2WarmContact, 'dncSuppressed'>[] = [];

  try {
    const contracts =
      (await db.tenancyContract?.findMany?.({
        orderBy: { updatedAt: 'desc' },
        take: 150,
        include: { property: true, tenant: true },
      })) || [];

    for (const c of contracts) {
      const state = c.chequesSchedule?.lifecycleState || {};
      const cluster = inferCluster(
        state.project || c.property?.subCommunity || c.property?.location || c.property?.title
      );
      const bedrooms = String(c.property?.bedrooms || state.bedrooms || 3);
      const endDateRaw = c.endDate || c.leaseEnd || state.leaseEndIso;
      const daysUntilExpiry = daysBetween(endDateRaw, now);
      const leaseEndDate = endDateRaw ? new Date(endDateRaw).toISOString().slice(0, 10) : null;
      const annualRentAed = Number(c.annualRentAed || c.annualRentAED || state.annualRentAed || 0) || null;

      const landlordDigits = normalizePhoneDigitsSafe(state.landlordPhone || c.landlordPhone);
      if (landlordDigits) {
        const cls = classifyWarmContact({ role: 'LANDLORD', daysUntilExpiry });
        extracted.push({
          id: `tc-landlord-${c.id}`,
          name: String(state.landlordName || 'DH2 Landlord'),
          phone: landlordDigits,
          e164: `+${landlordDigits}`,
          role: 'LANDLORD',
          category: cls.category,
          urgency: cls.urgency,
          cluster,
          bedrooms,
          leaseEndDate,
          daysUntilExpiry,
          annualRentAed,
          recommendedSequence: cls.category,
          source: 'HENRY_DRIVE_TENANCY',
        });
      }

      const tenantDigits = normalizePhoneDigitsSafe(state.tenantPhone || c.tenant?.phone);
      if (tenantDigits) {
        const cls = classifyWarmContact({ role: 'TENANT', daysUntilExpiry });
        extracted.push({
          id: `tc-tenant-${c.id}`,
          name: String(state.tenantName || c.tenant?.name || 'DH2 Tenant'),
          phone: tenantDigits,
          e164: `+${tenantDigits}`,
          role: 'TENANT',
          category: cls.category,
          urgency: cls.urgency,
          cluster,
          bedrooms,
          leaseEndDate,
          daysUntilExpiry,
          annualRentAed,
          recommendedSequence: cls.category,
          source: 'HENRY_DRIVE_TENANCY',
        });
      }
    }
  } catch (err) {
    log.warn('Prisma TenancyContract lookup skipped:', err instanceof Error ? err.message : err);
  }

  try {
    const leases =
      (await db.lease?.findMany?.({
        orderBy: { endDate: 'asc' },
        take: 150,
        include: { property: true, tenant: true, landlord: true },
      })) || [];

    for (const l of leases) {
      const cluster = inferCluster(l.property?.subCommunity || l.property?.location || l.property?.title);
      const bedrooms = String(l.property?.bedrooms || 3);
      const daysUntilExpiry = daysBetween(l.endDate, now);
      const leaseEndDate = l.endDate ? new Date(l.endDate).toISOString().slice(0, 10) : null;
      const annualRentAed = Number(l.monthlyRent ? l.monthlyRent * 12 : l.annualRent || 0) || null;

      const lDigits = normalizePhoneDigitsSafe(l.landlord?.phone);
      if (lDigits) {
        const cls = classifyWarmContact({ role: 'LANDLORD', daysUntilExpiry });
        extracted.push({
          id: `lease-landlord-${l.id}`,
          name: String(l.landlord?.name || 'DH2 Landlord'),
          phone: lDigits,
          e164: `+${lDigits}`,
          role: 'LANDLORD',
          category: cls.category,
          urgency: cls.urgency,
          cluster,
          bedrooms,
          leaseEndDate,
          daysUntilExpiry,
          annualRentAed,
          recommendedSequence: cls.category,
          source: 'PRISMA_LEASE',
        });
      }

      const tDigits = normalizePhoneDigitsSafe(l.tenant?.phone);
      if (tDigits) {
        const cls = classifyWarmContact({ role: 'TENANT', daysUntilExpiry });
        extracted.push({
          id: `lease-tenant-${l.id}`,
          name: String(l.tenant?.name || 'DH2 Tenant'),
          phone: tDigits,
          e164: `+${tDigits}`,
          role: 'TENANT',
          category: cls.category,
          urgency: cls.urgency,
          cluster,
          bedrooms,
          leaseEndDate,
          daysUntilExpiry,
          annualRentAed,
          recommendedSequence: cls.category,
          source: 'PRISMA_LEASE',
        });
      }
    }
  } catch (err) {
    log.warn('Prisma Lease lookup skipped:', err instanceof Error ? err.message : err);
  }

  return extracted;
}

export async function getDh2WarmContacts(options?: {
  category?: WarmContactCategory | 'ALL';
  cluster?: string;
  limit?: number;
  includeLocalRegistry?: boolean;
  now?: Date;
  dbOverride?: any;
}): Promise<Dh2WarmContactsSummary> {
  const now = options?.now ?? new Date();
  const db = options?.dbOverride || defaultDb;
  const limit = Math.max(1, Math.min(options?.limit ?? 120, 500));
  const categoryFilter = options?.category && options.category !== 'ALL' ? options.category : null;
  const clusterFilter = options?.cluster?.trim().toLowerCase() || '';

  const prismaRecords = await loadPrismaTenancyWarmContacts(db, now);
  const localRecords = options?.includeLocalRegistry !== false ? loadLocalDh2RegistryContacts(now) : [];
  const combined = [...prismaRecords, ...localRecords];

  const seenKey = new Set<string>();
  const contacts: Dh2WarmContact[] = [];
  const sources: Record<string, number> = {};
  const clustersSummary: Record<string, number> = {};

  for (const item of combined) {
    const dedupKey = `${item.phone}:${item.role}`;
    if (seenKey.has(dedupKey)) continue;
    if (categoryFilter && item.category !== categoryFilter) continue;
    if (clusterFilter && !item.cluster.toLowerCase().includes(clusterFilter)) continue;

    seenKey.add(dedupKey);
    const dncSuppressed = await isPhoneSuppressed(item.phone, db);
    contacts.push({ ...item, dncSuppressed });
    sources[item.source] = (sources[item.source] || 0) + 1;
    clustersSummary[item.cluster] = (clustersSummary[item.cluster] || 0) + 1;
    if (contacts.length >= limit) break;
  }

  return {
    total: contacts.length,
    landlordRetentionCount: contacts.filter(c => c.category === 'LANDLORD_RETENTION_RENEWAL').length,
    tenantFollowUpCount: contacts.filter(c => c.category === 'TENANT_FOLLOWUP').length,
    expiringWithin90DaysCount: contacts.filter(
      c => c.daysUntilExpiry !== null && c.daysUntilExpiry >= 0 && c.daysUntilExpiry <= 90
    ).length,
    dncSuppressedCount: contacts.filter(c => c.dncSuppressed).length,
    sources,
    clustersSummary,
    contacts,
  };
}
