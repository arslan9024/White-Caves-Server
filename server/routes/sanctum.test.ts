import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import sanctumRoutes from './sanctum.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sanctum', sanctumRoutes);
  return app;
}

describe('AICC-Sanctum Hierarchy Governance, CRUD & Manager Swapping', () => {
  it('enforces 12 Locked Departments and 1-12-108 topology health', async () => {
    const res = await request(createApp()).get('/api/sanctum/health');
    expect(res.status).toBe(200);
    expect(res.body.topology).toBe('1-12-108');
    expect(res.body.departments).toBe(12);
    expect(res.body.coo).toContain('Zoe');
  });

  it('rejects Aegis engineering names and non-Henry male agents per standing rules', async () => {
    const app = createApp();
    const aegisAttempt = await request(app).post('/api/sanctum/managers').send({
      departmentCode: 'DEPT-01',
      name: 'AI Orion Builder',
      roleTitle: 'DevOps Engineer',
      gender: 'Female',
    });
    expect(aegisAttempt.status).toBe(400);
    expect(aegisAttempt.body.error).toContain('Zoe');

    const maleAttempt = await request(app).post('/api/sanctum/managers').send({
      departmentCode: 'DEPT-01',
      name: 'AI Marcus Concierge',
      roleTitle: 'Concierge Manager',
      gender: 'Male',
    });
    expect(maleAttempt.status).toBe(400);
    expect(maleAttempt.body.error).toContain('Henry');
  });

  it('supports manager CRUD and drag-and-drop manager slot swapping', async () => {
    const app = createApp();
    const created = await request(app).post('/api/sanctum/managers').send({
      departmentCode: 'DEPT-05',
      name: 'AI Leila Leasing',
      roleTitle: 'DAMAC Hills 2 Cluster Specialist',
      capabilities: ['DH2 Leasing', 'Ejari Intake'],
    });
    expect(created.status).toBe(201);
    const id = created.body.manager.id;

    const updated = await request(app).patch(`/api/sanctum/managers/${id}`).send({
      roleTitle: 'DAMAC Hills 2 Senior Cluster Specialist',
      slaResponseMinutes: 10,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.manager.slaResponseMinutes).toBe(10);

    const swapped = await request(app).post('/api/sanctum/managers/swap').send({
      sourceAgentId: 'corinne-frontline',
      targetAgentId: 'layla-mobility',
    });
    expect(swapped.status).toBe(200);
    expect(swapped.body.swapped).toBe(true);

    // Swap back to keep singleton clean
    await request(app).post('/api/sanctum/managers/swap').send({
      sourceAgentId: 'corinne-frontline',
      targetAgentId: 'layla-mobility',
    });

    const deleted = await request(app).delete(`/api/sanctum/managers/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.movedToStandby).toBe(true);
  });
});
