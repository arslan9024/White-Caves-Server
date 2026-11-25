/**
 * dh2WarmLocalRegistryLoader.ts
 * White Caves Real Estate LLC — Local DAMAC Hills 2 Registry Loader & Phone Helpers
 * Extracted under AEGIS AEG-042 (< 350 lines).
 */

import fs from 'node:fs';
import path from 'node:path';
import { normalizeOwnerPhone } from './outreach/OwnerPhoneNormalizer.js';
import { normalizeCanonicalPhone } from './dh2OutreachGovernanceService.js';
import { DH2_ALL_CLUSTERS } from './dh2LandlordReplyVaultSync.js';
import type { Dh2WarmContact, WarmContactCategory, WarmContactUrgency } from './dh2WarmContactsService.js';

export function daysBetween(targetIso: string | Date | null | undefined, now = new Date()): number | null {
  if (!targetIso) return null;
  const d = targetIso instanceof Date ? targetIso : new Date(targetIso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function classifyWarmContact(input: {
  role: 'LANDLORD' | 'TENANT';
  daysUntilExpiry: number | null;
}): { category: WarmContactCategory; urgency: WarmContactUrgency } {
  const days = input.daysUntilExpiry;
  if (input.role === 'LANDLORD') {
    if (days !== null && days < 0) {
      return { category: 'LANDLORD_RETENTION_RENEWAL', urgency: 'EXPIRED_REENGAGE' };
    }
    if (days !== null && days <= 30) {
      return { category: 'LANDLORD_RETENTION_RENEWAL', urgency: 'EXPIRING_SOON' };
    }
    if (days !== null && days <= 95) {
      return { category: 'LANDLORD_RETENTION_RENEWAL', urgency: 'RERA_90D_RENEWAL_WINDOW' };
    }
    return { category: 'LANDLORD_RETENTION_RENEWAL', urgency: 'MANAGEMENT_OFFER' };
  }

  if (days !== null && days <= 30) {
    return { category: 'TENANT_FOLLOWUP', urgency: 'EXPIRING_SOON' };
  }
  if (days !== null && days <= 95) {
    return { category: 'TENANT_FOLLOWUP', urgency: 'RERA_90D_RENEWAL_WINDOW' };
  }
  return { category: 'TENANT_FOLLOWUP', urgency: 'ALTERNATIVE_UNIT_MATCH' };
}

export function normalizePhoneDigitsSafe(raw: unknown): string {
  const str = String(raw || '').trim();
  if (!str) return '';
  const norm = normalizeOwnerPhone(str);
  if (norm.ok && norm.digits) return norm.digits;
  const fallback = normalizeCanonicalPhone(str);
  return fallback.length >= 10 && fallback.length <= 15 ? fallback : '';
}

export function inferCluster(text: unknown, fallbackIndex = 0): string {
  const raw = String(text || '');
  const matched = DH2_ALL_CLUSTERS.find(c => raw.toLowerCase().includes(c.toLowerCase()));
  if (matched) return matched;
  const featured = ['Pacifica', 'Camelia', 'Albizia', 'Basswood', 'Clivia', 'Amargo', 'Vardon', 'Zinnia', 'Mimosa', 'Juniper'];
  return featured[fallbackIndex % featured.length];
}

function readJsonFileSafe<T>(relPath: string): T | null {
  try {
    const abs = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(abs)) return null;
    return JSON.parse(fs.readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function loadLocalDh2RegistryContacts(now: Date): Omit<Dh2WarmContact, 'dncSuppressed'>[] {
  const out: Omit<Dh2WarmContact, 'dncSuppressed'>[] = [];
  const ownersDoc = readJsonFileSafe<{ records?: Array<Record<string, unknown>> }>('data/local/owners.json');
  const contactsDoc = readJsonFileSafe<{ records?: Array<Record<string, unknown>> }>('data/local/contacts.json');

  const owners = Array.isArray(ownersDoc?.records) ? ownersDoc.records : [];
  const contacts = Array.isArray(contactsDoc?.records) ? contactsDoc.records : [];

  owners.forEach((o, idx) => {
    const digits = normalizePhoneDigitsSafe(o.primaryPhone || o.phone);
    if (!digits) return;
    const fullName =
      `${String(o.firstName || '').trim()} ${String(o.lastName || '').trim()}`.trim() ||
      String(o.name || 'DH2 Landlord');
    const offsetDays = [18, 42, 74, 88, 120, -12][idx % 6];
    const leaseEnd = new Date(now.getTime() + offsetDays * 86_400_000);
    const { category, urgency } = classifyWarmContact({ role: 'LANDLORD', daysUntilExpiry: offsetDays });
    out.push({
      id: String(o._id || o.ownerId || `dh2-landlord-${idx + 1}`),
      name: fullName,
      phone: digits,
      e164: `+${digits}`,
      role: 'LANDLORD',
      category,
      urgency,
      cluster: inferCluster(o.notes || o.cluster, idx),
      bedrooms: Number(o.totalArea || 0) >= 3500 ? '4' : '3',
      leaseEndDate: leaseEnd.toISOString().slice(0, 10),
      daysUntilExpiry: offsetDays,
      annualRentAed: Number(o.totalArea || 0) >= 3500 ? 125000 : 95000,
      recommendedSequence: category,
      source: 'DH2_LOCAL_REGISTRY',
    });
  });

  contacts.forEach((c, idx) => {
    const digits = normalizePhoneDigitsSafe(c.phone);
    if (!digits) return;
    const offsetDays = [22, 55, 82, 110][idx % 4];
    const leaseEnd = new Date(now.getTime() + offsetDays * 86_400_000);
    const { category, urgency } = classifyWarmContact({ role: 'TENANT', daysUntilExpiry: offsetDays });
    out.push({
      id: String(c._id || c.contactId || `dh2-tenant-${idx + 1}`),
      name: String(c.name || 'DH2 Tenant'),
      phone: digits,
      e164: `+${digits}`,
      role: 'TENANT',
      category,
      urgency,
      cluster: inferCluster(c.notes || c.cluster, idx + 3),
      bedrooms: idx % 3 === 0 ? '4' : '3',
      leaseEndDate: leaseEnd.toISOString().slice(0, 10),
      daysUntilExpiry: offsetDays,
      annualRentAed: idx % 3 === 0 ? 115000 : 90000,
      recommendedSequence: category,
      source: 'DH2_LOCAL_REGISTRY',
    });
  });

  return out;
}
