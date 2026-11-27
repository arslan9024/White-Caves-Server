/**
 * dh2PmsCampaignSync.ts
 * White Caves Real Estate LLC — DH2 Akoya-Oxygen-PMS & Henry Tenancy Sync + Segmentation
 * Standard: AEGIS Canonical Single Purpose (< 350 lines, AEG-042).
 */

import { AKOYA_PMS_SHEET_ID } from '../google/aiSaritaSheetsService.js';
import { createAkoyaSheetsClient } from './dh2AkoyaSheetIngestor.js';
import { normalizeOwnerPhone } from './outreach/OwnerPhoneNormalizer.js';

export type Dh2CampaignSegment = 'LANDLORD_RETENTION_RENEWAL' | 'TENANT_FOLLOW_UP';

export interface Dh2SegmentedContact {
  segment: Dh2CampaignSegment;
  phone: string;
  e164: string;
  name: string;
  cluster: string;
  bedrooms?: string;
  leaseExpiryDate?: string;
  daysToExpiry?: number;
  source: 'DB_Owners' | 'DB_Properties' | 'Henry_DH2_Tenancy';
  optedOut: boolean;
}

export interface Dh2SyncSummary {
  spreadsheetId: string;
  landlords: Dh2SegmentedContact[];
  tenants: Dh2SegmentedContact[];
  skippedInvalid: number;
  skippedOptOut: number;
}

const OPT_OUT_PATTERN = /\b(stop|unsubscribe|opt[\s-]?out|do not contact|dnc|remove me)\b/i;
const PRIVATE_UNIT_PATTERN = /\b(?:unit|villa|plot|apt|apartment|house)\s*(?:no\.?|number|#)?\s*[-:]?\s*[a-z0-9-]+\b/gi;

/**
 * Enforce Public Listing Privacy: strip private unit/villa/plot numbers from broadcast copy.
 */
export function sanitizePublicListingMessage(message: string): string {
  return message
    .replace(PRIVATE_UNIT_PATTERN, 'DH2 Residence')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Append DLD compliance footer and conversion CTA routing to whitecaves.ae + Arslan Malik (MD).
 */
export function buildCompliantDh2BroadcastMessage(
  segment: Dh2CampaignSegment,
  contact: Pick<Dh2SegmentedContact, 'name' | 'cluster' | 'daysToExpiry'>
): string {
  const clusterLabel = contact.cluster || 'DAMAC Hills 2';
  const greeting = contact.name ? `Hello ${contact.name}` : 'Hello';

  const body =
    segment === 'LANDLORD_RETENTION_RENEWAL'
      ? `${greeting}, this is White Caves Real Estate LLC regarding your ${clusterLabel} property. ` +
        `Under Dubai RERA Law No. 33/2008 (90-day renewal notice window), we offer end-to-end lease renewal, ` +
        `Ejari registration, and full property management.`
      : `${greeting}, this is White Caves Real Estate LLC. Your ${clusterLabel} tenancy is approaching renewal` +
        `${typeof contact.daysToExpiry === 'number' ? ` (${contact.daysToExpiry} days remaining)` : ''}. ` +
        `Reply RENEW to lock in your renewal or explore alternative DAMAC Hills 2 units.`;

  const raw =
    `${body} Connect with Arslan Malik (MD / Leasing Agent) via https://whitecaves.ae ` +
    `| RERA/DLD Compliant. Reply STOP to opt out.`;

  return sanitizePublicListingMessage(raw);
}

function daysUntil(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return undefined;
  return Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24));
}

export function segmentDh2Rows(input: {
  ownersRows: string[][];
  propertiesRows: string[][];
  henryTenancyRows?: string[][];
  optedOutPhones?: Set<string>;
}): Omit<Dh2SyncSummary, 'spreadsheetId'> {
  const optedOutSet = input.optedOutPhones ?? new Set<string>();
  const seen = new Set<string>();
  const landlords: Dh2SegmentedContact[] = [];
  const tenants: Dh2SegmentedContact[] = [];
  let skippedInvalid = 0;
  let skippedOptOut = 0;

  const ingest = (
    rows: string[][],
    segment: Dh2CampaignSegment,
    source: Dh2SegmentedContact['source']
  ) => {
    for (const row of rows.slice(1)) {
      const [name = '', rawPhone = '', cluster = 'DAMAC Hills 2', bedrooms = '', leaseExpiryDate = '', status = ''] = row;
      if (OPT_OUT_PATTERN.test(status)) {
        skippedOptOut += 1;
        continue;
      }
      const norm = normalizeOwnerPhone(rawPhone);
      if (!norm.ok || !norm.digits) {
        skippedInvalid += 1;
        continue;
      }
      if (optedOutSet.has(norm.digits)) {
        skippedOptOut += 1;
        continue;
      }
      const key = `${segment}:${norm.digits}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const contact: Dh2SegmentedContact = {
        segment,
        phone: norm.digits,
        e164: `+${norm.digits}`,
        name: name.trim() || (segment === 'LANDLORD_RETENTION_RENEWAL' ? 'Landlord' : 'Tenant'),
        cluster: cluster.trim() || 'DAMAC Hills 2',
        bedrooms: bedrooms.trim() || undefined,
        leaseExpiryDate: leaseExpiryDate.trim() || undefined,
        daysToExpiry: daysUntil(leaseExpiryDate.trim()),
        source,
        optedOut: false,
      };

      if (segment === 'LANDLORD_RETENTION_RENEWAL') landlords.push(contact);
      else tenants.push(contact);
    }
  };

  ingest(input.ownersRows, 'LANDLORD_RETENTION_RENEWAL', 'DB_Owners');
  ingest(input.propertiesRows, 'TENANT_FOLLOW_UP', 'DB_Properties');
  if (input.henryTenancyRows?.length) {
    ingest(input.henryTenancyRows, 'TENANT_FOLLOW_UP', 'Henry_DH2_Tenancy');
  }

  return { landlords, tenants, skippedInvalid, skippedOptOut };
}

/**
 * Fetch live Akoya-Oxygen-PMS (DB_Owners & DB_Properties) + optional Henry DH2 tenancy rows.
 */
export async function syncDh2PmsAndTenancyContacts(
  spreadsheetId: string = AKOYA_PMS_SHEET_ID,
  optedOutPhones?: Set<string>
): Promise<Dh2SyncSummary> {
  const sheets = createAkoyaSheetsClient(true);
  const [ownersRes, propsRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'DB_Owners!A1:F500' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'DB_Properties!A1:F500' }),
  ]);

  const segmented = segmentDh2Rows({
    ownersRows: (ownersRes.data.values as string[][]) || [],
    propertiesRows: (propsRes.data.values as string[][]) || [],
    optedOutPhones,
  });

  return { spreadsheetId, ...segmented };
}
