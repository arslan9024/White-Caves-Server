import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import whatsappChatsRouter from './whatsappChats';

describe('whatsappChats Router Integration Tests', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/whatsapp/chats', whatsappChatsRouter);

  it('POST /api/whatsapp/chats/:jid/takeover activates human takeover and pauses AI', async () => {
    const res = await request(app)
      .post('/api/whatsapp/chats/971501234567@s.whatsapp.net/takeover')
      .send({ humanAgent: 'Arslan Malik', reason: 'High-Value VIP Escalation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aiPaused).toBe(true);
    expect(res.body.data.humanAgent).toBe('Arslan Malik');
    expect(res.body.data.status).toBe('HUMAN_TAKEOVER_ACTIVE');
  });

  it('POST /api/whatsapp/chats/:jid/ai-draft generates English tone draft', async () => {
    const res = await request(app)
      .post('/api/whatsapp/chats/971501234567@s.whatsapp.net/ai-draft')
      .send({ language: 'EN', tone: 'luxury' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.language).toBe('EN');
    expect(res.body.data.draft).toContain('White Caves');
  });

  it('POST /api/whatsapp/chats/:jid/ai-draft generates Arabic tone draft', async () => {
    const res = await request(app)
      .post('/api/whatsapp/chats/971501234567@s.whatsapp.net/ai-draft')
      .send({ language: 'AR', tone: 'luxury' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.language).toBe('AR');
    expect(res.body.data.draft).toContain('وايت كيفز');
  });
});
