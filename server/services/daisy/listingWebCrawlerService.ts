import { queryPropertyUnit } from '../henry/driveInventoryManager.js';

export interface CrawledListingSpecs {
  sourceUrl?: string;
  blockedByPortal?: boolean;
  blockReason?: string;
  community: string;
  cluster: string;
  unitNumber?: string;
  propertyType: string;
  listingType: 'rent' | 'sale';
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  priceAed: number;
  cheques: number;
  furnished: boolean;
  amenities: string[];
  rawTitle?: string;
  rawSnippet?: string;
  externalImages: string[];
}

export interface GeneratedWhiteCavesListing {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  headline: string;
  description: string;
  highlights: string[];
  specs: CrawledListingSpecs;
  drivePhotos: string[];
  whatsappCtaUrl: string;
  aiEngine: 'ollama' | 'deterministic_luxury_copywriter';
  jsonLd: Record<string, unknown>;
}

const KNOWN_CLUSTERS = [
  'Pacifica', 'Camelia', 'Albizia', 'Basswood', 'Clivia', 'Amargo', 'Vardon', 'Zinnia',
  'Mimosa', 'Juniper', 'Odora', 'Aster', 'Victoria', 'Avencia', 'Coursetia', 'Claret',
  'Janusia', 'Amazonia', 'Acuna', 'Aquilegia', 'Centaury', 'Hawthorn', 'Mulberry',
  'Primrose', 'Sycamore', 'Verona', 'Viridis',
];

const KNOWN_AMENITIES = [
  'Malibu Beach', 'Water Town', 'Sports Town', 'Lazy River', 'Private Garden',
  'Covered Parking', 'Single Row', 'Corner Plot', 'Maid Room', 'Walk-in Closet',
  'Community Pool', '24/7 Security', 'Pet Friendly', 'Upgraded Kitchen', 'Near Carrefour',
];

const LINDA_WHATSAPP = '971505760056';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html: string, name: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = re.exec(html);
  return m?.[1]?.trim();
}

export function parseListingTextToSpecs(
  text: string,
  hints?: { area?: string; project?: string; unitNumber?: string; sourceUrl?: string; externalImages?: string[]; rawTitle?: string }
): CrawledListingSpecs {
  const normalized = text.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  const cluster =
    hints?.project ||
    KNOWN_CLUSTERS.find(c => lower.includes(c.toLowerCase())) ||
    'Pacifica';
  const community =
    hints?.area ||
    (/damac hills 2|akoya|dh2/i.test(normalized) ? 'DAMAC Hills 2' : 'DAMAC Hills 2');

  const bedMatch = normalized.match(/(\d)\s*(?:bed(?:room)?s?|br|bhk)/i);
  const bathMatch = normalized.match(/(\d)\s*(?:bath(?:room)?s?|ba)/i);
  const sqftMatch = normalized.match(/([\d,]{3,6})\s*(?:sq\.?\s*ft|sqft|ft²)/i);
  const priceMatch = normalized.match(/(?:aed|dhs\.?)\s*([\d,]{4,9})/i) || normalized.match(/([\d,]{5,9})\s*(?:aed|\/?\s*(?:year|yr|pa))/i);
  const chequeMatch = normalized.match(/(\d)\s*(?:cheques?|chqs?)/i);

  const priceRaw = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 90000;
  const isRent = /rent|lease|yearly|per year|cheque|ejari|\/yr/i.test(normalized) || priceRaw < 350000;
  const propertyType = /villa/i.test(normalized)
    ? 'Villa'
    : /apartment|studio/i.test(normalized)
      ? 'Apartment'
      : 'Townhouse';
  const amenities = KNOWN_AMENITIES.filter(a => lower.includes(a.toLowerCase()));
  if (amenities.length < 3) {
    for (const fallback of ['Water Town & Malibu Beach Access', 'Private Landscaped Garden', '2 Covered Parking Bays', '24/7 Gated Community Security']) {
      if (!amenities.includes(fallback)) amenities.push(fallback);
    }
  }

  return {
    sourceUrl: hints?.sourceUrl,
    community,
    cluster,
    unitNumber: hints?.unitNumber,
    propertyType,
    listingType: isRent ? 'rent' : 'sale',
    bedrooms: bedMatch ? Number(bedMatch[1]) : 3,
    bathrooms: bathMatch ? Number(bathMatch[1]) : 4,
    sqft: sqftMatch ? Number(sqftMatch[1].replace(/,/g, '')) : 1880,
    priceAed: priceRaw,
    cheques: chequeMatch ? Number(chequeMatch[1]) : 4,
    furnished: /\bfurnished\b/i.test(normalized) && !/\bunfurnished\b/i.test(normalized),
    amenities,
    rawTitle: hints?.rawTitle,
    rawSnippet: normalized.slice(0, 600),
    externalImages: hints?.externalImages || [],
  };
}

/**
 * Politely fetches a public real-estate URL without ever bypassing CAPTCHA or anti-bot walls.
 */
export async function crawlPublicListingUrl(
  url: string,
  hints?: { area?: string; project?: string; unitNumber?: string }
): Promise<CrawledListingSpecs> {
  const parsedUrl = new URL(url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only http/https public listing URLs are supported');
  }

  const response = await fetch(parsedUrl.href, {
    headers: {
      'User-Agent': 'WhiteCavesResearchBot/1.0 (+https://whitecaves.ae; Dubai RERA brokerage research)',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 403 || response.status === 429 || response.status === 503) {
    return {
      ...parseListingTextToSpecs(`${hints?.area || 'DAMAC Hills 2'} ${hints?.project || 'Pacifica'}`, { ...hints, sourceUrl: url }),
      blockedByPortal: true,
      blockReason: `Portal returned HTTP ${response.status} (anti-bot/rate protection). Respecting gate — paste the listing details into rawText instead.`,
    };
  }

  const html = await response.text();
  if (/cf-turnstile|g-recaptcha|h-captcha|verify you are human|captcha-delivery/i.test(html)) {
    return {
      ...parseListingTextToSpecs(`${hints?.area || 'DAMAC Hills 2'} ${hints?.project || 'Pacifica'}`, { ...hints, sourceUrl: url }),
      blockedByPortal: true,
      blockReason: 'Portal presented a CAPTCHA/human verification gate. Respecting gate — paste listing text into rawText instead.',
    };
  }

  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const ogTitle = extractMeta(html, 'og:title') || titleMatch?.[1]?.trim();
  const ogDesc = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  const ogImage = extractMeta(html, 'og:image');
  const plainText = `${ogTitle || ''} ${ogDesc} ${stripHtml(html).slice(0, 6000)}`;

  return parseListingTextToSpecs(plainText, {
    ...hints,
    sourceUrl: url,
    rawTitle: ogTitle,
    externalImages: ogImage ? [ogImage] : [],
  });
}

async function tryOllamaRewrite(specs: CrawledListingSpecs): Promise<{ headline: string; description: string; highlights: string[] } | null> {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.VITE_OLLAMA_MODEL || 'llama3.1:8b-instant';
  try {
    const prompt = `Write a 100% original luxury Dubai real estate listing for White Caves Real Estate LLC (RERA licensed) in JSON format {"headline":"...","description":"...","highlights":["...","...","...","..."]}. Specs: ${specs.bedrooms}BR ${specs.propertyType} in ${specs.cluster}, ${specs.community}, ${specs.sqft} sq.ft, ${specs.listingType === 'rent' ? `AED ${specs.priceAed.toLocaleString()}/year (${specs.cheques} cheques)` : `AED ${specs.priceAed.toLocaleString()}`}, ${specs.furnished ? 'Furnished' : 'Unfurnished'}, Amenities: ${specs.amenities.join(', ')}. Output valid JSON only.`;
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: string };
    const parsed = JSON.parse(json.response || '{}');
    if (typeof parsed.headline === 'string' && typeof parsed.description === 'string' && Array.isArray(parsed.highlights)) {
      return {
        headline: parsed.headline.trim(),
        description: parsed.description.trim(),
        highlights: parsed.highlights.map(String).slice(0, 6),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function buildDeterministicListingCopy(specs: CrawledListingSpecs) {
  const unitTag = specs.unitNumber ? ` | Unit ${specs.unitNumber}` : '';
  const priceLabel = specs.listingType === 'rent'
    ? `AED ${specs.priceAed.toLocaleString()}/Year (${specs.cheques} Cheques)`
    : `AED ${specs.priceAed.toLocaleString()}`;
  const headline = `Verified ${specs.bedrooms}BR ${specs.propertyType} in ${specs.cluster}, ${specs.community}${unitTag}`;
  const description =
    `Presented exclusively by White Caves Real Estate LLC, this bright ${specs.bedrooms}-bedroom, ${specs.bathrooms}-bathroom ${specs.propertyType.toLowerCase()} in ${specs.cluster}, ${specs.community} spans ${specs.sqft.toLocaleString()} sq.ft and is offered ${specs.furnished ? 'fully furnished' : 'unfurnished'} at ${priceLabel}. ` +
    `Designed for modern family living away from city congestion yet connected via Al Qudra Road and Emirates Road (E611), residents enjoy immediate access to Malibu Beach, Water Town, Sports Town, community parks, and Carrefour Market. ` +
    `Direct RERA-compliant tenancy drafting and fast Ejari registration are handled end-to-end by our dedicated DAMAC Hills 2 leasing specialists.`;

  const highlights = [
    `${specs.bedrooms} Bedrooms | ${specs.bathrooms} Bathrooms | ${specs.sqft.toLocaleString()} Sq.Ft`,
    `${priceLabel} — Direct Brokerage, Transparent Terms`,
    `${specs.furnished ? 'Move-in Ready Furnished Residence' : 'Unfurnished Canvas Ready for Immediate Handover'}`,
    `Prime ${specs.cluster} Cluster Location in ${specs.community}`,
    ...specs.amenities.slice(0, 2),
  ];
  return { headline, description, highlights };
}

export async function generatePerfectListing(input: {
  url?: string;
  rawText?: string;
  area?: string;
  project?: string;
  unitNumber?: string;
  attachDrivePhotos?: boolean;
  useOllama?: boolean;
}): Promise<GeneratedWhiteCavesListing> {
  let specs: CrawledListingSpecs;
  if (input.url) {
    specs = await crawlPublicListingUrl(input.url, {
      area: input.area,
      project: input.project,
      unitNumber: input.unitNumber,
    });
    if (specs.blockedByPortal && input.rawText) {
      specs = { ...parseListingTextToSpecs(input.rawText, { area: input.area, project: input.project, unitNumber: input.unitNumber, sourceUrl: input.url }), blockedByPortal: false };
    }
  } else if (input.rawText) {
    specs = parseListingTextToSpecs(input.rawText, {
      area: input.area,
      project: input.project,
      unitNumber: input.unitNumber,
    });
  } else {
    throw new Error('Provide either a public listing url or rawText');
  }

  let drivePhotos: string[] = [];
  if (input.attachDrivePhotos !== false && input.area && input.project && input.unitNumber) {
    try {
      const unitData = await queryPropertyUnit({
        area: input.area,
        project: input.project,
        unitNumber: input.unitNumber,
      });
      if (unitData.found && Array.isArray(unitData.photoUrls)) {
        drivePhotos = unitData.photoUrls;
      }
    } catch {
      // Non-fatal if Drive is unreachable in offline test mode
    }
  }

  const aiCopy = input.useOllama !== false ? await tryOllamaRewrite(specs) : null;
  const copy = aiCopy || buildDeterministicListingCopy(specs);

  const slug = `${specs.community}-${specs.cluster}-${specs.bedrooms}br-${specs.propertyType}-${specs.listingType}${specs.unitNumber ? `-unit-${specs.unitNumber}` : ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const seoTitle = `${specs.bedrooms}BR ${specs.propertyType} for ${specs.listingType === 'rent' ? 'Rent' : 'Sale'} in ${specs.cluster}, ${specs.community} | White Caves Real Estate`;
  const metaDescription = `${specs.bedrooms}BR ${specs.propertyType} in ${specs.cluster}, ${specs.community} (${specs.sqft} sq.ft) — AED ${specs.priceAed.toLocaleString()}${specs.listingType === 'rent' ? `/year (${specs.cheques} cheques)` : ''}. Book a verified viewing via WhatsApp with White Caves Real Estate LLC.`;
  const waText = encodeURIComponent(
    `Hi Linda (White Caves), I'd like to schedule a viewing for the ${specs.bedrooms}BR ${specs.propertyType} in ${specs.cluster}, ${specs.community}${specs.unitNumber ? ` (Unit ${specs.unitNumber})` : ''} listed at AED ${specs.priceAed.toLocaleString()}.`
  );
  const whatsappCtaUrl = `https://wa.me/${LINDA_WHATSAPP}?text=${waText}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: copy.headline,
    description: copy.description,
    url: `https://whitecaves.ae/rent/damac-hills-2/${specs.cluster.toLowerCase().replace(/\s+/g, '-')}`,
    offers: {
      '@type': 'Offer',
      price: specs.priceAed,
      priceCurrency: 'AED',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: `${specs.cluster}, ${specs.community}`,
      addressRegion: 'Dubai',
      addressCountry: 'AE',
    },
    numberOfRooms: specs.bedrooms,
    floorSize: { '@type': 'QuantitativeValue', value: specs.sqft, unitCode: 'FTK' },
    image: drivePhotos.length ? drivePhotos : specs.externalImages,
  };

  return {
    slug,
    seoTitle,
    metaDescription,
    headline: copy.headline,
    description: copy.description,
    highlights: copy.highlights,
    specs,
    drivePhotos,
    whatsappCtaUrl,
    aiEngine: aiCopy ? 'ollama' : 'deterministic_luxury_copywriter',
    jsonLd,
  };
}
