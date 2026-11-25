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
  AgentNode,
  getAllSanctumAgents,
  getSanctumAgentById,
  OPERATIONAL_SUPERVISOR_SUMMARIES,
  SANCTUM_DEPARTMENTS,
  ZOE_COO,
} from '../../src/agents/registry/aiccHierarchy.js';
import {
  agentRunner,
  TaskDelegationRequest,
} from '../../src/agents/engine/AgentRunner.js';

const router = Router();
const standbyManagers: AgentNode[] = [];
const AEGIS_ENGINEERING_NAMES = new Set(['aegis', 'ada', 'nova', 'orion', 'gwynne', 'grace', 'turing', 'sterling']);

function violatesTeamSeparation(name: string): boolean {
  const tokens = name.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return tokens.some(t => AEGIS_ENGINEERING_NAMES.has(t));
}

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

// ── GET /api/sanctum/supervisors (Full Zoe -> Dir -> Mgr -> AM -> Supervisor Chains) ─
router.get('/supervisors', (_req: Request, res: Response) => {
  res.json({
    topology: 'MD -> COO (Zoe) -> 12 Directors -> 108 Managers -> 1,296 Assistant Managers -> 11,664 Supervisors',
    supervisors: OPERATIONAL_SUPERVISOR_SUMMARIES,
    totalOperationalSupervisors: OPERATIONAL_SUPERVISOR_SUMMARIES.length,
  });
});

// ── POST /api/sanctum/bridge/:agentId (Diana / Mary / Daisy / Henry / Linda) ─
router.post('/bridge/:agentId', async (req: Request, res: Response) => {
  const agentId = String(req.params.agentId);
  const validBridges = ['diana-email', 'mary-inventory', 'daisy-leasing', 'henry', 'linda'];

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

// ── GET /api/sanctum/standby ─────────────────────────────────────────────────
router.get('/standby', (_req: Request, res: Response) => {
  res.json({ standby: standbyManagers, total: standbyManagers.length });
});

// ── POST /api/sanctum/managers (AIAMS CRUD — 12 Locked Depts + Female-Except-Henry) ─
router.post('/managers', (req: Request, res: Response) => {
  const { departmentCode, name, roleTitle, gender = 'Female', capabilities = [], slaResponseMinutes = 15 } =
    req.body as Partial<AgentNode> & { departmentCode?: string };

  if (!departmentCode || !name || !roleTitle) {
    return res.status(400).json({ error: 'departmentCode, name, and roleTitle are required' });
  }
  const dept = SANCTUM_DEPARTMENTS.find(d => d.deptCode === departmentCode);
  if (!dept) {
    return res.status(400).json({ error: `Department '${departmentCode}' is invalid — the 12 Sanctum departments are locked.` });
  }
  if (violatesTeamSeparation(name)) {
    return res.status(400).json({ error: "Aegis engineering names cannot be added to Zoe's Team (AICC-Sanctum)." });
  }
  if (gender !== 'Female') {
    return res.status(400).json({ error: 'All AICC-Sanctum agents must be female-named except sole male officer AI Henry Supervisor (SUP-11-1-01-1).' });
  }

  const slot = dept.managers.length + 1;
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36).slice(-4)}`;
  const manager: AgentNode = {
    id,
    code: `MGR-${departmentCode.replace('DEPT-', '')}-${slot}`,
    name: name.trim(),
    gender: 'Female',
    tier: 'MANAGER',
    roleTitle: roleTitle.trim(),
    departmentCode: dept.deptCode,
    slot,
    reportingTo: dept.director.id,
    allowedTools: ['sanctum_task'],
    systemPrompt: `You are ${name.trim()}, ${roleTitle.trim()} in ${dept.name} (AICC-Sanctum).`,
    capabilities: Array.isArray(capabilities) ? capabilities.map(String) : [],
    slaResponseMinutes: Number(slaResponseMinutes) || 15,
  };
  dept.managers.push(manager);
  return res.status(201).json({ manager, departmentCode: dept.deptCode });
});

// ── PATCH /api/sanctum/managers/:id ──────────────────────────────────────────
router.patch('/managers/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as Partial<AgentNode>;

  for (const dept of SANCTUM_DEPARTMENTS) {
    const mgr = dept.managers.find(m => m.id === id);
    if (!mgr) continue;
    if (body.name && violatesTeamSeparation(body.name)) {
      return res.status(400).json({ error: "Aegis engineering names cannot be assigned to Zoe's Team." });
    }
    if (body.gender === 'Male' && mgr.id !== 'henry') {
      return res.status(400).json({ error: 'Only AI Henry Supervisor (SUP-11-1-01-1) may have Male persona in AICC-Sanctum.' });
    }
    if (body.name) mgr.name = body.name.trim();
    if (body.roleTitle) mgr.roleTitle = body.roleTitle.trim();
    if (Array.isArray(body.capabilities)) mgr.capabilities = body.capabilities.map(String);
    if (typeof body.slaResponseMinutes === 'number') mgr.slaResponseMinutes = body.slaResponseMinutes;
    return res.json({ manager: mgr });
  }
  return res.status(404).json({ error: `Manager '${id}' not found` });
});

// ── DELETE /api/sanctum/managers/:id (Zero-Data-Loss Move to Standby) ────────
router.delete('/managers/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (id === 'zoe' || id === 'henry') {
    return res.status(403).json({ error: `Protected sovereign officer '${id}' cannot be removed.` });
  }
  for (const dept of SANCTUM_DEPARTMENTS) {
    const idx = dept.managers.findIndex(m => m.id === id);
    if (idx === -1) continue;
    const [removed] = dept.managers.splice(idx, 1);
    removed.tier = 'STANDBY';
    removed.slot = undefined;
    standbyManagers.push(removed);
    return res.json({ movedToStandby: true, manager: removed });
  }
  return res.status(404).json({ error: `Manager '${id}' not found` });
});

// ── POST /api/sanctum/managers/swap (Intra- or Cross-Department Drag-and-Drop) ─
router.post('/managers/swap', (req: Request, res: Response) => {
  const { sourceAgentId, targetAgentId, targetDepartmentCode } = req.body as {
    sourceAgentId?: string;
    targetAgentId?: string;
    targetDepartmentCode?: string;
  };
  if (!sourceAgentId) return res.status(400).json({ error: 'sourceAgentId is required' });

  let srcDept = SANCTUM_DEPARTMENTS.find(d => d.managers.some(m => m.id === sourceAgentId));
  if (!srcDept) return res.status(404).json({ error: `Source manager '${sourceAgentId}' not found` });
  const srcIdx = srcDept.managers.findIndex(m => m.id === sourceAgentId);
  const srcMgr = srcDept.managers[srcIdx];

  if (targetAgentId) {
    const tgtDept = SANCTUM_DEPARTMENTS.find(d => d.managers.some(m => m.id === targetAgentId));
    if (!tgtDept) return res.status(404).json({ error: `Target manager '${targetAgentId}' not found` });
    const tgtIdx = tgtDept.managers.findIndex(m => m.id === targetAgentId);
    const tgtMgr = tgtDept.managers[tgtIdx];

    if (srcDept.deptCode === tgtDept.deptCode) {
      const tmpSlot = srcMgr.slot;
      srcMgr.slot = tgtMgr.slot;
      tgtMgr.slot = tmpSlot;
      srcDept.managers.sort((a, b) => (a.slot || 0) - (b.slot || 0));
    } else {
      const srcSlot = srcMgr.slot;
      srcMgr.departmentCode = tgtDept.deptCode;
      srcMgr.reportingTo = tgtDept.director.id;
      srcMgr.slot = tgtMgr.slot;

      tgtMgr.departmentCode = srcDept.deptCode;
      tgtMgr.reportingTo = srcDept.director.id;
      tgtMgr.slot = srcSlot;

      srcDept.managers[srcIdx] = tgtMgr;
      tgtDept.managers[tgtIdx] = srcMgr;
    }
    return res.json({ swapped: true, sourceAgentId, targetAgentId });
  }

  if (targetDepartmentCode) {
    const tgtDept = SANCTUM_DEPARTMENTS.find(d => d.deptCode === targetDepartmentCode);
    if (!tgtDept) return res.status(400).json({ error: `Locked department '${targetDepartmentCode}' not found` });
    if (tgtDept.deptCode !== srcDept.deptCode) {
      srcDept.managers.splice(srcIdx, 1);
      srcMgr.departmentCode = tgtDept.deptCode;
      srcMgr.reportingTo = tgtDept.director.id;
      srcMgr.slot = tgtDept.managers.length + 1;
      tgtDept.managers.push(srcMgr);
    }
    return res.json({ swapped: true, transferredTo: tgtDept.deptCode, manager: srcMgr });
  }

  return res.status(400).json({ error: 'Provide either targetAgentId or targetDepartmentCode' });
});

export default router;
