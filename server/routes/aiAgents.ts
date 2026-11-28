import { Router, Request, Response } from 'express';
import { LindaWhatsAppAgent } from '../services/whatsapp/LindaWhatsAppAgent.js';
import { DaisyLeasingAgent } from '../services/daisy/DaisyLeasingAgent.js';
import type { AgentTelemetry } from '../services/ai/BaseAIAgent.js';

const router = Router();

const lindaAgent = new LindaWhatsAppAgent();
const daisyAgent = new DaisyLeasingAgent();

export interface DispatchRequestBody {
  deptCode?: string;
  taskType?: string;
  payload?: Record<string, unknown>;
}

/**
 * Pure helper to resolve the target agent by department code.
 */
export function resolveAgentByDept(deptCode: string): LindaWhatsAppAgent | DaisyLeasingAgent | null {
  const normalized = deptCode.trim().toUpperCase();
  if (normalized === 'DEPT-08' || normalized === 'LINDA') {
    return lindaAgent;
  }
  if (normalized === 'DEPT-03' || normalized === 'DAISY') {
    return daisyAgent;
  }
  return null;
}

/**
 * Pure helper to build the telemetry snapshot for all registered agents.
 */
export function buildTelemetrySnapshot(): Record<string, AgentTelemetry> {
  return {
    'DEPT-08': lindaAgent.getTelemetry(),
    'DEPT-03': daisyAgent.getTelemetry(),
  };
}

/**
 * GET /api/ai/agents/telemetry
 * Returns live getTelemetry() metrics for LindaWhatsAppAgent and DaisyLeasingAgent.
 */
router.get('/telemetry', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    telemetry: buildTelemetrySnapshot(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/ai/agents/dispatch
 * Dispatches a department task to LindaWhatsAppAgent or DaisyLeasingAgent
 * and returns the AgentTaskResult + updated getTelemetry() metrics.
 */
router.post('/dispatch', async (req: Request, res: Response) => {
  const { deptCode, taskType, payload } = (req.body ?? {}) as DispatchRequestBody;

  if (typeof deptCode !== 'string' || !deptCode.trim() || typeof taskType !== 'string' || !taskType.trim()) {
    res.status(400).json({
      ok: false,
      error: 'deptCode and taskType must be non-empty strings',
    });
    return;
  }

  const agent = resolveAgentByDept(deptCode);
  if (!agent) {
    res.status(404).json({
      ok: false,
      error: `No AI agent registered for deptCode: ${deptCode}`,
    });
    return;
  }

  try {
    const result = await agent.executeTask(taskType, payload ?? {});
    res.json({
      ok: result.success,
      result,
      identity: agent.identity,
      telemetry: agent.getTelemetry(),
      allTelemetry: buildTelemetrySnapshot(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown dispatch error';
    res.status(500).json({
      ok: false,
      error: message,
      telemetry: agent.getTelemetry(),
    });
  }
});

export default router;
