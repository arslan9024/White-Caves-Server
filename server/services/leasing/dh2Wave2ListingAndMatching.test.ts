import { describe, expect, it, vi } from 'vitest';
import {
  evaluateAndAutoPublishListing,
  generateBayutPropertyFinderXmlFeed,
  generatePortalCsvFeed,
} from './listingReadinessPublishService.js';
import {
  bookViewingWithMdCalendarAndReminder,
  captureQualifyAndMatchTenantLead,
} from './tenantMatchingViewingService.js';

describe('Wave 2 — Listing Readiness Gate, Portal Feeds & Tenant Qualification/Matching', () => {
  it('blocks auto-publish when photos or MD approval are missing, and promotes to verified_active when all 3 gates pass', async () => {
    const updateMock = vi.fn().mockResolvedValue({ id: 'prop-1', inventoryStage: 'verified_active' });
    const mockDb = {
      property: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'prop-1',
          area: 'Damac Hills 2',
          subCommunity: 'Camelia',
          unitNumber: '343',
          bedrooms: 3,
          annualRentAed: 95000,
          inventoryStage: 'draft_collected',
          images: [],
        }),
        update: updateMock,
      },
    };

    const blocked = await evaluateAndAutoPublishListing({
      propertyId: 'prop-1',
      mdApproved: false,
      skipDriveLookup: true,
      dbOverride: mockDb,
    });
    expect(blocked.ready).toBe(false);
    expect(blocked.newStage).toBe('draft_collected');
    expect(blocked.missingRequirements.length).toBeGreaterThanOrEqual(2);
    expect(updateMock).not.toHaveBeenCalled();

    const published = await evaluateAndAutoPublishListing({
      propertyId: 'prop-1',
      mdApproved: true,
      approvedAnnualRentAed: 98000,
      photoUrlsOverride: ['https://drive.google.com/uc?export=view&id=img1'],
      skipDriveLookup: true,
      dbOverride: mockDb,
    });
    expect(published.ready).toBe(true);
    expect(published.newStage).toBe('verified_active');
    expect(published.webListingUrl).toBe('/rent/damac-hills-2/camelia');
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('generates valid Bayut/Property Finder XML and CSV feeds', () => {
    const props = [
      {
        id: 'prop-camelia-343',
        title: '3BR Townhouse in Camelia, DAMAC Hills 2',
        subCommunity: 'Camelia',
        unitNumber: '343',
        bedrooms: 3,
        bathrooms: 3,
        sqft: 1881,
        annualRentAed: 98000,
        images: ['https://whitecaves.com/img/camelia-343.jpg'],
      },
    ];
    const xml = generateBayutPropertyFinderXmlFeed(props);
    expect(xml).toContain('<offering_type>RR</offering_type>');
    expect(xml).toContain('<sub_community>Camelia</sub_community>');
    expect(xml).toContain('<price>98000</price>');
    expect(xml).toContain('+971505760056');

    const csv = generatePortalCsvFeed(props);
    expect(csv).toContain('reference_number,purpose,type,community');
    expect(csv).toContain('WC-DH2-343');
    expect(csv).toContain('https://whitecaves.com/rent/damac-hills-2/camelia');
  });

  it('auto-qualifies tenant leads, ranks top 3 AVAILABLE units, and books MD viewing with T-2h reminder', async () => {
    const mockDb = {
      lead: { create: vi.fn().mockResolvedValue({ id: 'lead-101' }) },
      property: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', subCommunity: 'Camelia', unitNumber: '343', bedrooms: 3, annualRentAed: 95000, status: 'AVAILABLE', inventoryStage: 'verified_active' },
          { id: 'p2', subCommunity: 'Pacifica', unitNumber: '112', bedrooms: 3, annualRentAed: 92000, status: 'AVAILABLE', inventoryStage: 'verified_active' },
          { id: 'p3', subCommunity: 'Albizia', unitNumber: '205', bedrooms: 4, annualRentAed: 125000, status: 'AVAILABLE', inventoryStage: 'draft_collected' },
          { id: 'p4', subCommunity: 'Basswood', unitNumber: '99', bedrooms: 3, annualRentAed: 90000, status: 'RENTED', inventoryStage: 'verified_active' },
        ]),
      },
      viewingAppointment: { create: vi.fn().mockResolvedValue({ id: 'view-55' }) },
      followUpQueue: { create: vi.fn().mockResolvedValue({ id: 'rem-t2h-55' }) },
    };

    const match = await captureQualifyAndMatchTenantLead({
      name: 'Sarah Johnson',
      phone: '+971501234567',
      source: 'WHITE_CAVES_WEB',
      budgetAed: 100000,
      chequesCount: 4,
      bedrooms: 3,
      moveInDate: '2026-12-01',
      preferredCluster: 'Camelia',
      dbOverride: mockDb,
    });

    expect(match.tier).toBe('HOT');
    expect(match.top3Matches).toHaveLength(3);
    expect(match.top3Matches[0].cluster).toBe('Camelia');
    expect(match.whatsappShortlistMessage).toContain('+971505760056');

    const mockCalendarClient = {
      email: 'gorahabot@white-caves-fb-486818.iam.gserviceaccount.com',
      calendar: {
        events: {
          insert: vi.fn().mockResolvedValue({ data: { id: 'gcal-ev-1', htmlLink: 'https://calendar.google.com/ev1' } }),
        },
      },
    };

    const viewing = await bookViewingWithMdCalendarAndReminder({
      leadId: 'lead-101',
      propertyId: 'p1',
      tenantName: 'Sarah Johnson',
      tenantPhone: '+971501234567',
      cluster: 'Camelia',
      unitNumber: '343',
      scheduledAtIso: '2026-11-25T10:00:00Z',
      calendarClientOverride: mockCalendarClient,
      dbOverride: mockDb,
    });

    expect(viewing.viewingId).toBe('view-55');
    expect(viewing.reminderQueueId).toBe('rem-t2h-55');
    expect(viewing.reminderAt).toBe('2026-11-25T08:00:00.000Z');
    expect((viewing.calendar as any).scheduled).toBe(true);
  });
});
