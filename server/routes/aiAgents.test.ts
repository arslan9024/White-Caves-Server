import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import authMiddleware from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import aiAgentsRoutes from './aiAgents.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai/agents', authMiddleware, aiAgentsRoutes);
  app.use(errorHandler);
  return app;
}

function signTestJwt(): string {
  const secret = process.env.JWT_SECRET || 'white-caves-dev-only-secret-DO-NOT-USE-IN-PRODUCTION';
  return jwt.sign(
    {
      id: 'test-md-01',
      email: 'md@whitecaves.test',
      role: 'managing_director',
    },
    secret,
    { expiresIn: '1h' }
  );
}

describe('/api/ai/agents (authMiddleware + aiAgentsRoutes)', () => {
  it('returns 401 when Authorization Bearer token is missing', async () => {
    const app = createTestApp();

    const telemetryRes = await request(app).get('/api/ai/agents/telemetry');
    expect(telemetryRes.status).toBe(401);

    const dispatchRes = await request(app)
      .post('/api/ai/agents/dispatch')
      .send({ deptCode: 'DEPT-08', taskType: 'send_campaign', payload: {} });
    expect(dispatchRes.status).toBe(401);
  });

  it('returns 200 and live telemetry snapshot with a signed test JWT', async () => {
    const app = createTestApp();
    const token = signTestJwt();

    const res = await request(app)
      .get('/api/ai/agents/telemetry')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.telemetry['DEPT-08']).toBeDefined();
    expect(res.body.telemetry['DEPT-03']).toBeDefined();
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 400 when deptCode or taskType is missing and 404 for unknown deptCode', async () => {
    const app = createTestApp();
    const token = signTestJwt();

    const missingFields = await request(app)
      .post('/api/ai/agents/dispatch')
      .set('Authorization', `Bearer ${token}`)
      .send({ deptCode: 'DEPT-08' });
    expect(missingFields.status).toBe(400);
    expect(missingFields.body.ok).toBe(false);

    const unknownDept = await request(app)
      .post('/api/ai/agents/dispatch')
      .set('Authorization', `Bearer ${token}`)
      .send({ deptCode: 'DEPT-99', taskType: 'noop' });
    expect(unknownDept.status).toBe(404);
    expect(unknownDept.body.ok).toBe(false);
  });

  it('returns 400 for non-string or blank deptCode and taskType instead of 500 or retries', async () => {
    const app = createTestApp();
    const token = signTestJwt();

    const invalidPayloads = [
      { deptCode: 123, taskType: 'send_campaign' },
      { deptCode: ['DEPT-08'], taskType: 'send_campaign' },
      { deptCode: {}, taskType: 'send_campaign' },
      { deptCode: '   ', taskType: 'send_campaign' },
      { deptCode: 'DEPT-08', taskType: {} },
      { deptCode: 'DEPT-08', taskType: '   ' },
    ];

    for (const body of invalidPayloads) {
      const res = await request(app)
        .post('/api/ai/agents/dispatch')
        .set('Authorization', `Bearer ${token}`)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'deptCode and taskType must be non-empty strings',
      });
    }
  });

  it('dispatches DEPT-08 (Linda) and DEPT-03 (Daisy) tasks and increments telemetry', async () => {
    const app = createTestApp();
    const token = signTestJwt();

    const beforeRes = await request(app)
      .get('/api/ai/agents/telemetry')
      .set('Authorization', `Bearer ${token}`);
    const beforeLinda = beforeRes.body.telemetry['DEPT-08'].tasksExecuted as number;
    const beforeDaisy = beforeRes.body.telemetry['DEPT-03'].tasksExecuted as number;

    const lindaRes = await request(app)
      .post('/api/ai/agents/dispatch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deptCode: 'DEPT-08',
        taskType: 'send_campaign',
        payload: {
          campaignId: 'cmp-m1-test',
          recipients: ['+971501234567'],
          templateName: 'dh2_intro',
        },
      });
    expect(lindaRes.status).toBe(200);
    expect(lindaRes.body.ok).toBe(true);
    expect(lindaRes.body.identity.id).toBe('linda-whatsapp-agent');
    expect(lindaRes.body.telemetry.tasksExecuted).toBe(beforeLinda + 1);

    const daisyRes = await request(app)
      .post('/api/ai/agents/dispatch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deptCode: 'DEPT-03',
        taskType: 'match_tenant',
        payload: {
          tenantId: 'tenant-m1-test',
          budgetAed: 160000,
          bedrooms: 2,
          community: 'DAMAC Hills 2',
        },
      });
    expect(daisyRes.status).toBe(200);
    expect(daisyRes.body.ok).toBe(true);
    expect(daisyRes.body.identity.id).toBe('daisy-leasing-agent');
    expect(daisyRes.body.telemetry.tasksExecuted).toBe(beforeDaisy + 1);
  });
});
