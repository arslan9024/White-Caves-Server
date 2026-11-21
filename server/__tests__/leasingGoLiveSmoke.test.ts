import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import publicLeasingRoutes, {
  inMemoryContracts,
  inMemoryLeads,
  inMemoryLeasedIds,
  inMemoryViewings,
} from '../routes/publicLeasing.js';
import leasingOpsRoutes from '../routes/leasingOps.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/public', publicLeasingRoutes);
  app.use('/api/leasing', leasingOpsRoutes);
  return app;
}

describe('End-to-End Leasing Go-Live Pipeline Smoke Test', () => {
  const app = buildTestApp();

  beforeEach(() => {
    inMemoryLeasedIds.clear();
    inMemoryLeads.length = 0;
    inMemoryViewings.length = 0;
    inMemoryContracts.length = 0;
  });

  it('1. GET /api/public/properties/rent returns AVAILABLE sanitized rentals without private unitNumber', async () => {
    const res = await request(app).get('/api/public/properties/rent?community=DAMAC');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const prop of res.body.data) {
      expect(prop).not.toHaveProperty('unitNumber');
      expect(prop).not.toHaveProperty('plotNumber');
      expect(prop).not.toHaveProperty('dewaPremiseNumber');
      expect(prop.status).toBe('AVAILABLE');
      expect(prop.assignedBroker.whatsappDeepLink).toContain('https://wa.me/');
    }
  });

  it('2. GET /api/public/properties/:slug returns sanitized rental detail + broker WhatsApp deep link', async () => {
    const res = await request(app).get(
      '/api/public/properties/3br-townhouse-camelia-damac-hills-2'
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('3br-townhouse-camelia-damac-hills-2');
    expect(res.body.data).not.toHaveProperty('unitNumber');
    expect(res.body.data.annualRentAed).toBe(90000);
  });

  it('3. Full E2E Leasing Lifecycle: Public Inquiry -> Agent Pipeline -> Viewing -> KYC OCR Ingest -> Close Deal (flips property to LEASED)', async () => {
    const targetSlug = '3br-townhouse-camelia-damac-hills-2';
    const targetId = '673a10000000000000000101';

    // Step A: Tenant submits inquiry on White-Caves-Web
    const inquiryRes = await request(app).post('/api/public/leads/inquiry').send({
      tenantName: 'Tariq Al Qasimi',
      tenantPhone: '0501234567',
      tenantEmail: 'tariq@example.ae',
      propertyId: targetId,
      propertySlug: targetSlug,
      preferredViewingAt: '2026-12-01T16:00:00.000Z',
      notes: 'Looking for 4 cheques in Camelia',
    });

    expect(inquiryRes.status).toBe(201);
    expect(inquiryRes.body.success).toBe(true);
    expect(inquiryRes.body.data.lead.tenantPhone).toBe('+971501234567');
    expect(inquiryRes.body.data.lead.status).toBe('NEW');
    const leadId = inquiryRes.body.data.lead.id;

    // Step B: Agent transitions lead & schedules/completes viewing
    const patchLeadRes = await request(app)
      .patch(`/api/leasing/leads/${leadId}`)
      .send({ status: 'CONTACTED' });
    expect(patchLeadRes.status).toBe(200);
    expect(patchLeadRes.body.data.status).toBe('CONTACTED');

    const scheduleViewRes = await request(app).post('/api/leasing/viewings').send({
      leadId,
      propertyId: targetId,
      scheduledAt: '2026-12-02T14:00:00.000Z',
    });
    expect(scheduleViewRes.status).toBe(201);
    const viewingId = scheduleViewRes.body.data.id;

    // Mobile Field Check-In / Complete Viewing
    const completeViewRes = await request(app)
      .patch(`/api/leasing/viewings/${viewingId}`)
      .send({ status: 'COMPLETED', feedback: 'Tenant approved layout on-site' });
    expect(completeViewRes.status).toBe(200);
    expect(completeViewRes.body.data.status).toBe('COMPLETED');

    // Step C: Henry KYC Document Ingest (PENDING_OCR) + Linda Slash Commands + 30m Takeover
    const kycRes = await request(app).post('/api/leasing/kyc/ingest-media').send({
      docType: 'EMIRATES_ID',
      fileName: 'tariq-eid.jpg',
      leadId,
    });
    expect(kycRes.status).toBe(201);
    expect(kycRes.body.data.status).toBe('PENDING_OCR');

    const takeoverRes = await request(app).post('/api/leasing/linda/takeover').send({
      conversationId: '+971501234567',
      active: true,
    });
    expect(takeoverRes.status).toBe(200);
    expect(takeoverRes.body.data.takeoverActive).toBe(true);
    expect(takeoverRes.body.data.durationMinutes).toBe(30);

    const slashRes = await request(app).post('/api/leasing/linda/slash').send({
      command: '/property',
      conversationId: '+971501234567',
    });
    expect(slashRes.status).toBe(200);
    expect(slashRes.body.data.replyText).toContain('VERIFIED AVAILABLE RENTALS');

    // Step D: Agent closes the leasing deal -> generates TenancyContract & flips Property to LEASED
    const closeRes = await request(app).post('/api/leasing/contracts/close').send({
      leadId,
      propertyId: targetId,
      tenantName: 'Tariq Al Qasimi',
      tenantPhone: '+971501234567',
      annualRentAed: 90000,
      chequesCount: 4,
      startDate: '2026-12-01',
    });

    expect(closeRes.status).toBe(201);
    expect(closeRes.body.data.propertyStatus).toBe('LEASED');
    expect(closeRes.body.data.leadStatus).toBe('CLOSED_WON');
    expect(closeRes.body.data.contract.status).toBe('ACTIVE');
    expect(closeRes.body.data.contract.chequesSchedule).toHaveLength(4);
    expect(closeRes.body.data.contract.chequesSchedule[0].amountAed).toBe(22500);

    // Step E: Verify property is immediately removed from public rental search & slug lookup
    const publicSearchAfterClose = await request(app).get('/api/public/properties/rent');
    const slugsRemaining = publicSearchAfterClose.body.data.map((p: any) => p.slug);
    expect(slugsRemaining).not.toContain(targetSlug);

    const slugLookupAfterClose = await request(app).get(
      `/api/public/properties/${targetSlug}`
    );
    expect(slugLookupAfterClose.status).toBe(404);
  });
});
