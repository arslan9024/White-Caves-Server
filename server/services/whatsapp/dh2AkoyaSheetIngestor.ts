/**
 * dh2AkoyaSheetIngestor.ts
 * White Caves Real Estate LLC — Live Google Sheets Ingestor for Akoya-Oxygen-2023-Arslan-only
 *
 * Reads landlord phone numbers & unit details from the canonical DAMAC Hills 2 (Akoya Oxygen)
 * Google Sheet via the GorahaBot service account in CENTRAL_SECRETS_DIR, normalizes UAE/intl
 * mobile numbers via OwnerPhoneNormalizer, filters DO_NOT_CONTACT / rented rows, and outputs
 * deduplicated Mission 1 recipients for the 9 Hunter SIMs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { google, type sheets_v4 } from 'googleapis';
import { CENTRAL_SECRETS_DIR } from '../../config/env.js';
import { DO_NOT_CONTACT, normalizeOwnerPhone } from './outreach/OwnerPhoneNormalizer.js';

export const DEFAULT_AKOYA_SHEET_ID =
  process.env.AKOYA_OWNERS_SHEET_ID || '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04';

export const AKOYA_SKIP_TABS = new Set([
  'd2magic',
  'contracts',
  'agents deals',
  'projectsind2',
  'propertystatus',
  'layoutsind2',
  'tempcheck',
]);

export interface Dh2LandlordRecipient {
  phone: string;
  e164: string;
  ownerName: string;
  cluster: string;
  unitRef: string;
  bedrooms: string;
  propertyStatus: string;
  sourceTab: string;
  sourceRow: number;
}

export interface AkoyaIngestionResult {
  spreadsheetId: string;
  spreadsheetTitle: string;
  tabsScanned: number;
  rowsScanned: number;
  validLandlords: number;
  skippedInvalid: number;
  skippedDuplicates: number;
  clustersSummary: Record<string, number>;
  recipients: Dh2LandlordRecipient[];
}

interface RawKey {
  type?: string;
  client_email?: string;
  private_key?: string;
}

function loadGorahaServiceAccountKey(): RawKey {
  const candidates = [
    path.join(CENTRAL_SECRETS_DIR, 'google', 'goraha-key.json'),
    path.join(CENTRAL_SECRETS_DIR, 'goraha-key.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as RawKey;
      if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    }
  }
  const b64 = process.env.GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64;
  if (b64) {
    const parsed = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8')) as RawKey;
    if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) return parsed;
  }
  throw new Error(`GorahaBot service account key not found in ${CENTRAL_SECRETS_DIR}`);
}

export function createAkoyaSheetsClient(readOnly = false): sheets_v4.Sheets {
  const credentials = loadGorahaServiceAccountKey();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      readOnly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  return google.sheets({ version: 'v4', auth });
}

function canonicalClusterName(raw: string, fallbackTab: string): string {
  const base = String(raw || '').split('@')[0].trim();
  const cleaned = base.includes(' - ') ? base.split(' - ').pop()!.trim() : base;
  if (cleaned && /[a-zA-Z]{2,}/.test(cleaned)) {
    return cleaned
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  return fallbackTab.trim() || 'DAMAC Hills 2';
}

function findCol(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex(h => patterns.some(re => re.test(h)));
}

function cell(row: unknown[], idx: number): string {
  return idx >= 0 ? String(row[idx] ?? '').trim() : '';
}

export async function ingestAkoyaOxygenLandlords(options?: {
  spreadsheetId?: string;
  cluster?: string;
  limit?: number;
  excludeRented?: boolean;
  sheetsClientOverride?: sheets_v4.Sheets;
}): Promise<AkoyaIngestionResult> {
  const spreadsheetId = options?.spreadsheetId || DEFAULT_AKOYA_SHEET_ID;
  const clusterFilter = options?.cluster?.trim().toLowerCase() || '';
  const limit = Math.max(1, Math.min(options?.limit || 250, 2000));
  const excludeRented = options?.excludeRented !== false;
  const sheets = options?.sheetsClientOverride || createAkoyaSheetsClient();

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties(title)',
  });

  const spreadsheetTitle = meta.data.properties?.title || 'Akoya-Oxygen-2023-Arslan-only';
  const allTabs = (meta.data.sheets || [])
    .map(s => s.properties?.title || '')
    .filter(t => t && !AKOYA_SKIP_TABS.has(t.trim().toLowerCase()));

  const seenDigits = new Set<string>();
  const recipients: Dh2LandlordRecipient[] = [];
  const clustersSummary: Record<string, number> = {};
  let rowsScanned = 0;
  let skippedInvalid = 0;
  let skippedDuplicates = 0;
  let tabsScanned = 0;

  for (const tabTitle of allTabs) {
    if (recipients.length >= limit) break;
    tabsScanned++;

    const escaped = tabTitle.replace(/'/g, "''");
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${escaped}'!A1:P2500`,
    });

    const rows = res.data.values || [];
    if (rows.length < 2) continue;

    const headers = rows[0].map(c => String(c ?? '').trim().toLowerCase().replace(/\s+/g, ' '));
    const idx = {
      project: findCol(headers, [/^project$/, /^cluster$/, /^community$/]),
      name: findCol(headers, [/^name$/, /^nameen$/, /^owner name$/, /^landlord$/]),
      mobile: findCol(headers, [/^mobile$/, /^primary mobile$/]),
      secondary: findCol(headers, [/^secondary mobile$/, /^mobile 2$/]),
      phone: findCol(headers, [/^phone$/, /^contact$/]),
      unit: findCol(headers, [/^unit/, /^plot number$/, /^villa/, /^p-number$/]),
      beds: findCol(headers, [/^bed/, /^br$/, /^type$/]),
      status: findCol(headers, [/^property\s*status$/, /^status$/]),
      responses: findCol(headers, [/^responses?\s*status$/]),
    };

    const hasPhoneCol = idx.mobile >= 0 || idx.secondary >= 0 || idx.phone >= 0;
    if (!hasPhoneCol) continue;

    for (let r = 1; r < rows.length; r++) {
      if (recipients.length >= limit) break;
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;
      rowsScanned++;

      const statusText = cell(row, idx.status);
      const responseText = cell(row, idx.responses);
      if (DO_NOT_CONTACT.test(statusText) || DO_NOT_CONTACT.test(responseText)) {
        skippedInvalid++;
        continue;
      }
      if (excludeRented && /\b(rented|occupied|sold)\b/i.test(statusText)) {
        skippedInvalid++;
        continue;
      }

      const cluster = canonicalClusterName(cell(row, idx.project), tabTitle);
      if (clusterFilter && !cluster.toLowerCase().includes(clusterFilter)) continue;

      const rawPhones = [cell(row, idx.mobile), cell(row, idx.secondary), cell(row, idx.phone)].filter(Boolean);
      let matchedDigits = '';
      for (const raw of rawPhones) {
        const norm = normalizeOwnerPhone(raw);
        if (norm.ok && norm.digits) {
          matchedDigits = norm.digits;
          break;
        }
      }

      if (!matchedDigits) {
        skippedInvalid++;
        continue;
      }
      if (seenDigits.has(matchedDigits)) {
        skippedDuplicates++;
        continue;
      }
      seenDigits.add(matchedDigits);

      const unitRef = cell(row, idx.unit) || `${cluster} Villa`;
      const bedMatch = cell(row, idx.beds).match(/(\d)/);
      const bedrooms = bedMatch ? bedMatch[1] : '3';

      recipients.push({
        phone: matchedDigits,
        e164: `+${matchedDigits}`,
        ownerName: cell(row, idx.name) || 'Valued Owner',
        cluster,
        unitRef,
        bedrooms,
        propertyStatus: statusText || 'Unverified',
        sourceTab: tabTitle,
        sourceRow: r + 1,
      });
      clustersSummary[cluster] = (clustersSummary[cluster] || 0) + 1;
    }
  }

  return {
    spreadsheetId,
    spreadsheetTitle,
    tabsScanned,
    rowsScanned,
    validLandlords: recipients.length,
    skippedInvalid,
    skippedDuplicates,
    clustersSummary,
    recipients,
  };
}
