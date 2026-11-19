/**
 * sanctum.ts — AICC-Sanctum Agent Hierarchy Routes
 *
 * Exposes the 1-12-108 Sanctum agent tree and task delegation engine.
 *
 * Routes:
 *   GET  /api/sanctum/health          — Hierarchy health & topology summary
 *   GET  /api/sanctum/agents          — All 121 agents (flat list)
 *   GET  /api/sanctum/agents/:id      — Single agent by id
 *   GET  /api/sanctum/departments     — Full 12-department tree
 *   POST /api/sanctum/delegate        — Execute a task delegation chain
 *   POST /api/sanctum/bridge/mary     — Quick-bridge to Mary Inventory
 *   POST /api/sanctum/bridge/daisy    — Quick-bridge to Daisy Leasing
 *   POST /api/sanctum/bridge/henry    — Quick-bridge to Henry Vault
 *   POST /api/sanctum/bridge/linda    — Quick-bridge to Linda Channel
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllSanctumAgents,
  getSanctumAgentById,
  SANCTUM_DEPARTMENTS,
  ZOE_COO,
} from '../../src/agents/registry/aiccHierarchy.js';
import {
  agentRunner,
  TaskDelegationRequest,
} from '../../src/agents/engine/AgentRunner.js';

const router = Router();

// ── GET /api/sanctum/health ──────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  const allAgents = getAllSanctumAgents();
  const directors = SANCTUM_DEPARTMENTS.map((d) => ({
    code: d.deptCode,
    name: d.name,
    color: d.color,
    director: d.director.name,
    managerCount: d.managers.length,
  }));

  res.json({
    status: 'OPERATIONAL',
    topology: '1-12-108',
    coo: ZOE_COO.name,
    totalAgents: allAgents.length,
    departments: directors.length,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/sanctum/agents ──────────────────────────────────────────────────
router.get('/agents', (_req: Request, res: Response) => {
  const agents = getAllSanctumAgents().map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    gender: a.gender,
    tier: a.tier,
    roleTitle: a.roleTitle,
    departmentCode: a.departmentCode ?? null,
    reportingTo: a.reportingTo ?? null,
    slot: a.slot ?? null,
    capabilities: a.capabilities,
    slaResponseMinutes: a.slaResponseMinutes,
    allowedTools: a.allowedTools,
  }));

  res.json({ agents, total: agents.length });
});

// ── GET /api/sanctum/agents/:id ──────────────────────────────────────────────
router.get('/agents/:id', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const agent = getSanctumAgentById(agentId);
  if (!agent) {
    return res.status(404).json({ error: `Agent '${agentId}' not found in Sanctum Hierarchy.` });
  }
  return res.json({ agent });
});

// ── GET /api/sanctum/departments ─────────────────────────────────────────────
router.get('/departments', (_req: Request, res: Response) => {
  const tree = SANCTUM_DEPARTMENTS.map((dept) => ({
    deptCode: dept.deptCode,
    name: dept.name,
    color: dept.color,
    director: {
      id: dept.director.id,
      name: dept.director.name,
      roleTitle: dept.director.roleTitle,
      slaResponseMinutes: dept.director.slaResponseMinutes,
    },
    managers: dept.managers.map((m) => ({
      id: m.id,
      name: m.name,
      roleTitle: m.roleTitle,
      slot: m.slot,
      capabilities: m.capabilities,
    })),
  }));

  res.json({ coo: { id: ZOE_COO.id, name: ZOE_COO.name, roleTitle: ZOE_COO.roleTitle }, departments: tree });
});

// ── POST /api/sanctum/delegate ───────────────────────────────────────────────
router.post('/delegate', async (req: Request, res: Response) => {
  const { targetAgentId, taskType, payload, priority, initiatorAgentId } = req.body as Partial<TaskDelegationRequest>;

  if (!targetAgentId || !taskType || !payload) {
    return res.status(400).json({
      error: 'Missing required fields: targetAgentId, taskType, payload',
    });
  }

  const request: TaskDelegationRequest = {
    taskId: uuidv4(),
    initiatorAgentId: initiatorAgentId ?? 'zoe',
    targetAgentId,
    taskType,
    payload,
    priority: priority ?? 'MEDIUM',
  };

  try {
    const result = await agentRunner.executeTask(request);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// ── POST /api/sanctum/bridge/:agentId (Mary / Daisy / Henry / Linda) ─────────
router.post('/bridge/:agentId', async (req: Request, res: Response) => {
  const agentId = String(req.params.agentId);
  const validBridges = ['mary-inventory', 'daisy-leasing', 'henry', 'linda'];

  if (!validBridges.includes(agentId)) {
    return res.status(400).json({
      error: `Invalid bridge target '${agentId}'. Valid targets: ${validBridges.join(', ')}`,
    });
  }

  const { taskType = 'bridge_handoff', payload = {}, priority = 'HIGH' } = req.body as {
    taskType?: string;
    payload?: Record<string, unknown>;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };

  const request: TaskDelegationRequest = {
    taskId: uuidv4(),
    initiatorAgentId: 'linda',
    targetAgentId: agentId,
    taskType,
    payload,
    priority,
  };

  try {
    const result = await agentRunner.executeTask(request);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
