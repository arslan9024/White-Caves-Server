/**
 * Public Leasing Sanitizer & Seed Fallback Service
 * Strictly enforces the Public Listing Privacy Rule:
 * NEVER exposes unitNumber, plotNumber, municipalityNumber, unitDoorNotation,
 * dewaPremiseNumber, or landlord personal contact details on public endpoints.
 */

export interface PublicRentalPropertyDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  purpose: 'RENT';
  status: 'AVAILABLE' | 'RESERVED' | 'LEASED';
  type: string;
  community: string;
  subCommunity: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  areaSqFt: number;
  annualRentAed: number;
  chequesCount: number;
  securityDepositAed: number;
  furnished: boolean;
  reraPermitNumber: string;
  amenities: string[];
  images: string[];
  assignedBroker: {
    id: string;
    name: string;
    brnNumber: string;
    phone: string;
    whatsappDeepLink: string;
  };
}

const PRIVATE_UNIT_REGEX =
  /\b(?:unit|villa|plot|apt|apartment|door|house)\s*(?:no\.?|number|#)?\s*[a-z0-9-]+\b/gi;

export function sanitizePublicTitle(rawTitle: string, community?: string, bedrooms?: number, type?: string): string {
  const cleaned = rawTitle.replace(PRIVATE_UNIT_REGEX, '').replace(/\s{2,}/g, ' ').trim();
  if (cleaned.length >= 6) return cleaned;
  return `${bedrooms || 3}BR ${type || 'Villa'} in ${community || 'DAMAC Hills 2'}`;
}

export function buildPropertySlug(raw: {
  id: string;
  slug?: string | null;
  title?: string | null;
  community?: string | null;
  subCommunity?: string | null;
  location?: string | null;
  bedrooms?: number | null;
}): string {
  if (raw.slug && raw.slug.trim().length > 0) {
    return raw.slug.trim().toLowerCase();
  }
  const base = `${raw.bedrooms || 3}br-${raw.subCommunity || ''}-${raw.community || raw.location || 'dubai'}-${raw.title || ''}`
    .toLowerCase()
    .replace(PRIVATE_UNIT_REGEX, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const suffix = String(raw.id || 'wc').slice(-6).toLowerCase();
  return `${base || 'dubai-rental'}-${suffix}`;
}

export function normalizeE164Phone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '+971505760056';
  if (digits.startsWith('971')) return `+${digits}`;
  if (digits.startsWith('05') && digits.length === 10) return `+971${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('5')) return `+971${digits}`;
  return `+${digits}`;
}

export function toPublicRentalDto(raw: Record<string, any>): PublicRentalPropertyDto {
  const community = String(raw.community || raw.area || raw.location || 'DAMAC Hills 2');
  const subCommunity = String(raw.subCommunity || raw.clusterName || raw.cluster || 'Camelia');
  const bedrooms = Number(raw.bedrooms ?? 3);
  const bathrooms = Number(raw.bathrooms ?? 4);
  const areaSqFt = Number(raw.areaSqFt ?? raw.sqft ?? 2200);
  const annualRentAed = Number(raw.annualRentAed ?? raw.rentalPrice ?? raw.price ?? 95000);
  const chequesCount = Number(raw.chequesCount ?? 4);
  const securityDepositAed = Number(raw.securityDepositAed ?? Math.round(annualRentAed * 0.05));
  const rawStatus = String(raw.status || 'AVAILABLE').toUpperCase();
  const status: 'AVAILABLE' | 'RESERVED' | 'LEASED' =
    rawStatus === 'LEASED' || rawStatus === 'RENTED' || rawStatus === 'SOLD'
      ? 'LEASED'
      : rawStatus === 'RESERVED' || rawStatus === 'UNDER_OFFER'
        ? 'RESERVED'
        : 'AVAILABLE';

  const safeTitle = sanitizePublicTitle(
    String(raw.title || `${bedrooms}BR Villa in ${subCommunity}, ${community}`),
    community,
    bedrooms,
    String(raw.type || 'Villa')
  );

  const slug = buildPropertySlug({
    id: String(raw.id || 'wc-101'),
    slug: raw.slug,
    title: safeTitle,
    community,
    subCommunity,
    location: raw.location,
    bedrooms,
  });

  const brokerPhone = '971505760056';
  const brokerName = String(raw.agentName || raw.user?.name || 'Arslan Malik (White Caves Leasing Desk)');
  const waText = encodeURIComponent(
    `Hi Linda (White Caves), I am interested in renting "${safeTitle}" in ${subCommunity}, ${community} (AED ${annualRentAed.toLocaleString()}/yr, ${chequesCount} cheques). Please share available viewing slots.`
  );

  return {
    id: String(raw.id || slug),
    slug,
    title: safeTitle,
    description: sanitizePublicTitle(
      String(
        raw.description ||
          `Verified ${bedrooms}-bedroom residential property in ${subCommunity}, ${community}. DLD Trakheesi & Ejari ready with flexible ${chequesCount}-cheque payment terms.`
      ),
      community,
      bedrooms
    ),
    purpose: 'RENT',
    status,
    type: String(raw.type || 'villa'),
    community,
    subCommunity,
    location: `${subCommunity}, ${community}, Dubai`,
    bedrooms,
    bathrooms,
    areaSqFt,
    annualRentAed,
    chequesCount,
    securityDepositAed,
    furnished: Boolean(raw.furnished ?? false),
    reraPermitNumber: String(raw.reraPermitNumber || '7148920194'),
    amenities:
      Array.isArray(raw.amenities) && raw.amenities.length > 0
        ? raw.amenities.map(String)
        : ['Covered Parking', 'Community Pool & Gym', '24/7 Security', 'Private Garden', 'Pet Friendly'],
    images:
      Array.isArray(raw.images) && raw.images.length > 0
        ? raw.images.map(String)
        : ['/images/dubai-skyline.jpg'],
    assignedBroker: {
      id: String(raw.assignedAgentId || raw.userId || 'wc-agent-arslan'),
      name: brokerName,
      brnNumber: 'BRN-62841',
      phone: `+${brokerPhone}`,
      whatsappDeepLink: `https://wa.me/${brokerPhone}?text=${waText}`,
    },
  };
}

export const FALLBACK_PUBLIC_RENTALS: PublicRentalPropertyDto[] = [
  toPublicRentalDto({
    id: '673a10000000000000000101',
    slug: '3br-townhouse-camelia-damac-hills-2',
    title: '3BR Corner Townhouse with Private Garden in Camelia',
    type: 'townhouse',
    status: 'AVAILABLE',
    community: 'DAMAC Hills 2',
    subCommunity: 'Camelia',
    bedrooms: 3,
    bathrooms: 4,
    areaSqFt: 1882,
    annualRentAed: 90000,
    chequesCount: 4,
    securityDepositAed: 4500,
    furnished: false,
    amenities: ['Malibu Beach Access', 'Lazy River & Wave Pool', 'Covered Parking (2 Cars)', 'Private Garden', '24/7 Gated Security'],
    images: ['/images/dubai-skyline.jpg'],
  }),
  toPublicRentalDto({
    id: '673a10000000000000000102',
    slug: '4br-villa-pacifica-damac-hills-2',
    title: '4BR Independent Family Villa with Roof Terrace in Pacifica',
    type: 'villa',
    status: 'AVAILABLE',
    community: 'DAMAC Hills 2',
    subCommunity: 'Pacifica',
    bedrooms: 4,
    bathrooms: 5,
    areaSqFt: 2450,
    annualRentAed: 115000,
    chequesCount: 4,
    securityDepositAed: 5750,
    furnished: false,
    amenities: ['Sports Town Access', 'Private Landscaped Garden', 'Maid Room', 'Covered Parking', 'Community Pool'],
    images: ['/images/dubai-skyline.jpg'],
  }),
  toPublicRentalDto({
    id: '673a10000000000000000103',
    slug: '3br-villa-vardon-damac-hills-2',
    title: '3BR Park-Backing Eco Villa in Vardon',
    type: 'townhouse',
    status: 'AVAILABLE',
    community: 'DAMAC Hills 2',
    subCommunity: 'Vardon',
    bedrooms: 3,
    bathrooms: 3,
    areaSqFt: 1750,
    annualRentAed: 82000,
    chequesCount: 2,
    securityDepositAed: 4100,
    furnished: false,
    amenities: ['Green Park Backing', 'Carrefour Supermarket Nearby', 'Kids Play Area', '24/7 Security', 'Covered Parking'],
    images: ['/images/dubai-skyline.jpg'],
  }),
  toPublicRentalDto({
    id: '673a10000000000000000104',
    slug: '2br-apartment-downtown-dubai-boulevard',
    title: '2BR Burj View Residence on Sheikh Mohammed Bin Rashid Blvd',
    type: 'apartment',
    status: 'AVAILABLE',
    community: 'Downtown Dubai',
    subCommunity: 'Boulevard Point',
    bedrooms: 2,
    bathrooms: 3,
    areaSqFt: 1420,
    annualRentAed: 195000,
    chequesCount: 2,
    securityDepositAed: 19500,
    furnished: true,
    amenities: ['Direct Dubai Mall Link', 'Infinity Pool', 'Concierge', 'Gym & Spa', 'Valet Parking'],
    images: ['/images/dubai-skyline.jpg'],
  }),
  toPublicRentalDto({
    id: '673a10000000000000000105',
    slug: '4br-villa-albizia-damac-hills-2',
    title: '4BR Modern Corner Townhouse in Albizia Cluster',
    type: 'townhouse',
    status: 'AVAILABLE',
    community: 'DAMAC Hills 2',
    subCommunity: 'Albizia',
    bedrooms: 4,
    bathrooms: 4,
    areaSqFt: 2150,
    annualRentAed: 105000,
    chequesCount: 4,
    securityDepositAed: 5250,
    furnished: false,
    amenities: ['Water Town Nearby', 'Cycle Track', 'Private Garden', 'Pet Friendly', '24/7 Security'],
    images: ['/images/dubai-skyline.jpg'],
  }),
  toPublicRentalDto({
    id: '673a10000000000000000106',
    slug: '1br-waterfront-apartment-dubai-marina',
    title: '1BR Marina Promenade View Apartment',
    type: 'apartment',
    status: 'AVAILABLE',
    community: 'Dubai Marina',
    subCommunity: 'Marina Gate',
    bedrooms: 1,
    bathrooms: 2,
    areaSqFt: 890,
    annualRentAed: 120000,
    chequesCount: 4,
    securityDepositAed: 6000,
    furnished: true,
    amenities: ['Marina Walk Access', 'Temperature Controlled Pool', 'Paddle Court', 'Gym', 'Covered Parking'],
    images: ['/images/dubai-skyline.jpg'],
  }),
];
