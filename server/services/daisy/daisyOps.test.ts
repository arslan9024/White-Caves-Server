import { describe, expect, it } from 'vitest';
import { generatePerfectListing, parseListingTextToSpecs } from './listingWebCrawlerService.js';
import { generateEjariTenancyDraft, generatePaymentReceipt } from './dh2LeasingOpsService.js';

describe('Daisy Web Crawler & DH2 Leasing Operations', () => {
  it('parses raw Dubai listing copy and synthesizes an original SEO-ready White Caves listing', async () => {
    const rawText =
      'Spacious 4BR Villa for rent in Pacifica, DAMAC Hills 2. 2,450 sq ft, 5 baths, Private Garden, Single Row, AED 115,000 yearly in 2 cheques, unfurnished.';
    const specs = parseListingTextToSpecs(rawText, { unitNumber: '343' });
    expect(specs.cluster).toBe('Pacifica');
    expect(specs.bedrooms).toBe(4);
    expect(specs.priceAed).toBe(115000);
    expect(specs.cheques).toBe(2);

    const listing = await generatePerfectListing({
      rawText,
      area: 'Damac Hills 2',
      project: 'Pacifica',
      unitNumber: '343',
      attachDrivePhotos: false,
      useOllama: false,
    });
    expect(listing.slug).toBe('damac-hills-2-pacifica-4br-villa-rent-unit-343');
    expect(listing.whatsappCtaUrl).toContain('wa.me/971505760056');
    expect(listing.highlights.length).toBeGreaterThanOrEqual(4);
    expect(listing.jsonLd['@type']).toBe('RealEstateListing');
  });

  it('generates Ejari-compliant tenancy draft with 90-day renewal date & PDC schedule', () => {
    const draft = generateEjariTenancyDraft({
      landlordName: 'Arslan Malik',
      landlordPhone: '+971505760056',
      tenantName: 'Sarah Ahmed',
      tenantPhone: '+971521112233',
      cluster: 'Pacifica',
      unitNumber: '343',
      startDate: '2026-12-01',
      annualRentAed: 115000,
      chequesCount: 4,
      furnished: false,
    });
    expect(draft.contractRef).toMatch(/^WC-EJARI-/);
    expect(draft.financials.securityDepositAed).toBe(5750);
    expect(draft.financials.chequeSchedule.length).toBe(4);
    expect(draft.financials.chequeSchedule.reduce((s, c) => s + c.amountAed, 0)).toBe(115000);
    expect(draft.property.driveFormulaPath).toBe('Damac Hills 2/Pacifica/343/Tenancy Contract');
    expect(draft.term.statutory90DayNoticeDate).toBe('2027-09-01');
  });

  it('issues official White Caves payment receipt with 5% VAT on agency commission', () => {
    const receipt = generatePaymentReceipt({
      payerName: 'Sarah Ahmed',
      category: 'AGENCY_COMMISSION',
      amountAed: 5750,
      paymentMethod: 'BANK_TRANSFER',
      cluster: 'Pacifica',
      unitNumber: '343',
    });
    expect(receipt.receiptNumber).toMatch(/^WC-RCP-/);
    expect(receipt.payment.vat5PercentAed).toBe(288);
    expect(receipt.payment.totalReceivedAed).toBe(6038);
    expect(receipt.issuer.bankName).toBe('Mashreq Bank');
  });
});
