import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import ninaRoutes from './nina.js';
import {
  buildIntentKeywords,
  buildSentimentLexicon,
  normalizeMessage,
} from '../services/nadia/ninaPatterns.js';
import { Intent, ninaEngine } from '../services/nadia/ninaEngine.js';

function createNinaApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/nina', ninaRoutes);
  return app;
}

describe('nina patterns, engine integration & /api/nina routes', () => {
  it('normalizes messages and preserves critical HEAD intent keywords', () => {
    expect(normalizeMessage('  Hello!! Ready to Buy   a 3BR Villa?  ')).toBe(
      'hello ready to buy a 3br villa'
    );

    const keywords = buildIntentKeywords();
    expect(keywords.get(Intent.PURCHASE_INTEREST_READY)).toEqual(
      expect.arrayContaining(['ready to buy', 'serious', 'cash ready'])
    );
    expect(keywords.get(Intent.PURCHASE_INTEREST_1_3_MONTHS)).toEqual(
      expect.arrayContaining(['1 month', '2 months', '3 months', 'next quarter'])
    );
    expect(keywords.get(Intent.PURCHASE_INTEREST_3_12_MONTHS)).toEqual(
      expect.arrayContaining(['6 months', '9 months', 'year', 'next year'])
    );
    expect(keywords.get(Intent.PURCHASE_INTEREST_FUTURE)).toEqual(
      expect.arrayContaining(['maybe', 'consider', 'thinking'])
    );
    expect(keywords.get(Intent.COMPLAINT)).toEqual(
      expect.arrayContaining(['disappointed', 'wrong'])
    );
    expect(keywords.get(Intent.INFORMATION_REQUEST)).toEqual(
      expect.arrayContaining(['what', 'explain'])
    );
    expect(keywords.get(Intent.INFORMATION_REQUEST_LOCATION)).toEqual(
      expect.arrayContaining(['district', 'neighborhood'])
    );
    expect(keywords.get(Intent.NEGOTIATION_TERMS)).toEqual(
      expect.arrayContaining(['payment', 'installment', 'options'])
    );
    expect(keywords.get(Intent.GREETING)).toEqual(
      expect.arrayContaining(['good', 'morning', 'afternoon', 'evening'])
    );
    expect(keywords.get(Intent.ASSISTANCE_NEEDED)).toEqual(
      expect.arrayContaining(['assist', 'need', 'please', 'can you'])
    );

    const sentiment = buildSentimentLexicon();
    expect(sentiment.get('excellent')).toBeGreaterThan(0);
    expect(sentiment.get('terrible')).toBeLessThan(0);
  });

  it('scores ready-to-buy villa inquiry above confidence threshold 40', () => {
    const result = ninaEngine.processMessage(
      'I want to view a 3BR villa in Dubai Marina. I am ready to buy.',
      {
        conversationId: 'nina-test-ready',
        recentIntents: [],
        recentTopics: [],
        mentionedProperties: [],
        needsAssistance: false,
        lastMessageTimestamp: new Date(),
      }
    );

    expect(result.primary.intent).toBe(Intent.PURCHASE_INTEREST_READY);
    expect(result.primary.confidence).toBeGreaterThan(40);
  });

  it('serves /api/nina/projects, /phone/validate, and /templates/greeting/current', async () => {
    const app = createNinaApp();

    const projectsRes = await request(app).get('/api/nina/projects');
    expect(projectsRes.status).toBe(200);
    expect(projectsRes.body.success).toBe(true);
    expect(Array.isArray(projectsRes.body.projects)).toBe(true);

    const phoneRes = await request(app)
      .post('/api/nina/phone/validate')
      .send({ numbers: ['0505760056', 'invalid'] });
    expect(phoneRes.status).toBe(200);
    expect(phoneRes.body.success).toBe(true);
    expect(phoneRes.body.summary.total).toBe(2);

    const greetingRes = await request(app).get('/api/nina/templates/greeting/current');
    expect(greetingRes.status).toBe(200);
    expect(greetingRes.body.success).toBe(true);
    expect(typeof greetingRes.body.greeting).toBe('string');
  });
});
