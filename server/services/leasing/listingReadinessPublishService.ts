/**
 * listingReadinessPublishService.ts
 * White Caves Real Estate LLC — Zero-Touch Inventory Vault Readiness Gate,
 * White-Caves-Web Auto-Publish & Bayut/Property Finder XML/CSV Feed Generator
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { queryPropertyUnit } from '../henry/driveInventoryManager.js';

const log = createLogger('ListingReadinessPublish');
const defaultDb = prisma as any;

export interface ListingReadinessCheckInput {
  propertyId: string;
  mdApproved: boolean;
  approvedAnnualRentAed?: number;
  approvedChequesCount?: number;
  approvedByUserId?: string;
  photoUrlsOverride?: string[];
  skipDriveLookup?: boolean;
  dbOverride?: any;
}

export interface ListingReadinessReport {
  propertyId: string;
  ready: boolean;
  previousStage: string;
  newStage: string;
  gates: {
    vaultConfirmed: boolean;
    drivePhotosPresent: boolean;
    mdPriceTermsApproved: boolean;
  };
  missingRequirements: string[];
  photoCount: number;
  webListingUrl: string;
  publishedAt: string | null;
}

export function slugifyCluster(cluster: string): string {
  return String(cluster || 'damac-hills-2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function evaluateAndAutoPublishListing(
  input: ListingReadinessCheckInput
): Promise<ListingReadinessReport> {
  const db = input.dbOverride || defaultDb;
  const property = await db.property?.findUnique?.({ where: { id: input.propertyId } });
  if (!property) {
    throw new Error(`Property "${input.propertyId}" not found in Mary Inventory Vault`);
  }

  const effectiveRent = Number(input.approvedAnnualRentAed || property.annualRentAed || property.price || 0);
  const vaultConfirmed = Boolean(
    property.subCommunity && property.unitNumber && effectiveRent > 0 && Number(property.bedrooms || 0) > 0
  );

  let photoUrls: string[] = Array.isArray(input.photoUrlsOverride)
    ? input.photoUrlsOverride
    : Array.isArray(property.images)
      ? property.images
      : [];

  if (photoUrls.length === 0 && !input.skipDriveLookup && property.subCommunity && property.unitNumber) {
    try {
      const driveResult = await queryPropertyUnit({
        area: property.area || 'Damac Hills 2',
        project: property.subCommunity,
        unitNumber: property.unitNumber,
      });
      if (driveResult.found && Array.isArray(driveResult.photoUrls)) {
        photoUrls = driveResult.photoUrls;
      }
    } catch (err) {
      log.warn('Drive photo check skipped:', err instanceof Error ? err.message : err);
    }
  }

  const drivePhotosPresent = photoUrls.length > 0;
  const mdPriceTermsApproved = input.mdApproved === true && effectiveRent > 0;

  const missingRequirements: string[] = [];
  if (!vaultConfirmed) missingRequirements.push('Confirm cluster, unitNumber, bedrooms, and rent in Mary Vault');
  if (!drivePhotosPresent) missingRequirements.push('Upload unit photos to Henry Drive House Pictures folder');
  if (!mdPriceTermsApproved) missingRequirements.push('Managing Director approval of negotiated rent & cheque terms');

  const ready = vaultConfirmed && drivePhotosPresent && mdPriceTermsApproved;
  const previousStage = String(property.inventoryStage || 'draft_collected');
  const newStage = ready ? 'verified_active' : previousStage;
  const clusterSlug = slugifyCluster(property.subCommunity || 'damac-hills-2');
  const webListingUrl = `/rent/damac-hills-2/${clusterSlug}`;
  const publishedAt = ready ? new Date().toISOString() : null;

  if (ready && db.property?.update) {
    await db.property.update({
      where: { id: property.id },
      data: {
        inventoryStage: 'verified_active',
        status: 'AVAILABLE',
        price: effectiveRent,
        annualRentAed: effectiveRent,
        rentalPrice: effectiveRent,
        images: photoUrls,
        featured: true,
      },
    });
  }

  return {
    propertyId: property.id,
    ready,
    previousStage,
    newStage,
    gates: { vaultConfirmed, drivePhotosPresent, mdPriceTermsApproved },
    missingRequirements,
    photoCount: photoUrls.length,
    webListingUrl,
    publishedAt,
  };
}

function escapeXml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface PortalFeedProperty {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  annualRentAed?: number;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  community?: string;
  subCommunity?: string;
  unitNumber?: string;
  type?: string;
  images?: string[];
  updatedAt?: Date | string;
}

/**
 * Standards-compliant Bayut & Property Finder Residential Rental XML Feed.
 */
export function generateBayutPropertyFinderXmlFeed(properties: PortalFeedProperty[]): string {
  const timestamp = new Date().toISOString();
  const itemsXml = properties
    .map(p => {
      const ref = escapeXml(`WC-DH2-${p.unitNumber || p.id.slice(-6)}`);
      const rent = Number(p.annualRentAed || p.price || 0);
      const photos = (p.images || [])
        .map(url => `      <url last_updated="${escapeXml(timestamp)}">${escapeXml(url)}</url>`)
        .join('\n');
      return `  <property last_update="${escapeXml(timestamp)}">
    <reference_number>${ref}</reference_number>
    <permit_number>RERA-WC-ORN-VERIFIED</permit_number>
    <offering_type>RR</offering_type>
    <property_type>${p.type === 'villa' ? 'VH' : 'TH'}</property_type>
    <price_on_application>No</price_on_application>
    <price>${rent}</price>
    <rental_period>Y</rental_period>
    <city>Dubai</city>
    <community>${escapeXml(p.community || 'DAMAC Hills 2')}</community>
    <sub_community>${escapeXml(p.subCommunity || 'DAMAC Hills 2')}</sub_community>
    <title_en>${escapeXml(p.title)}</title_en>
    <description_en>${escapeXml(p.description || `${p.bedrooms || 3}BR Townhouse for rent in ${p.subCommunity || 'DAMAC Hills 2'}`)}</description_en>
    <bedroom>${Number(p.bedrooms || 3)}</bedroom>
    <bathroom>${Number(p.bathrooms || 3)}</bathroom>
    <size>${Number(p.sqft || 1881)}</size>
    <agent>
      <name>Arslan Malik — White Caves Real Estate LLC</name>
      <phone>+971505760056</phone>
      <email>arslanmalikgoraha@gmail.com</email>
    </agent>
    <photo>
${photos}
    </photo>
  </property>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<list last_update="${escapeXml(timestamp)}" listing_count="${properties.length}">
${itemsXml}
</list>`;
}

export function generatePortalCsvFeed(properties: PortalFeedProperty[]): string {
  const header = 'reference_number,purpose,type,community,sub_community,unit_number,bedrooms,bathrooms,sqft,annual_rent_aed,title,primary_photo,web_url';
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = properties.map(p =>
    [
      `WC-DH2-${p.unitNumber || p.id.slice(-6)}`,
      'RENT',
      p.type || 'townhouse',
      p.community || 'DAMAC Hills 2',
      p.subCommunity || 'DAMAC Hills 2',
      p.unitNumber || '',
      p.bedrooms || 3,
      p.bathrooms || 3,
      p.sqft || 1881,
      Number(p.annualRentAed || p.price || 0),
      p.title,
      p.images?.[0] || '',
      `https://whitecaves.com/rent/damac-hills-2/${slugifyCluster(p.subCommunity || '')}`,
    ]
      .map(esc)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

export async function listVerifiedActivePortalProperties(dbOverride?: any): Promise<PortalFeedProperty[]> {
  const db = dbOverride || defaultDb;
  try {
    return (
      (await db.property?.findMany?.({
        where: {
          purpose: 'RENT',
          status: 'AVAILABLE',
          inventoryStage: 'verified_active',
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
      })) || []
    );
  } catch (err) {
    log.warn('Verified active listing query skipped:', err instanceof Error ? err.message : err);
    return [];
  }
}
