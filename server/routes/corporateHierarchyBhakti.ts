/**
 * White Caves Real Estate LLC - Bhakti 1-12-108 Fractal Formula & Manual Team CRUD Routes
 * Single Purpose File Law: < 350 lines
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

export interface ManualTeamRecord {
  teamCode: string;
  teamName: string;
  supervisorSeatCode: string;
  teamLeaderId: string | null;
  employeeIds: string[];
  maxMembers: number | null;
  createdAt: string;
  updatedAt: string;
}

export const BHAKTI_FRACTAL_SUMMARY = {
  protocolId: 'BHAKTI_1_12_108_REPEATING_FRACTAL_V2',
  formula:
    '1 MD -> 12 Directors -> 108 Managers (9/Director) -> 1,296 Assistant Managers (12/Manager) -> 11,664 Supervisors (9/AM = 108/Manager; Stop Boundary) -> Manual CRUD Teams, Team Leaders & Employees',
  stopBoundaryTier: 'SUPERVISOR',
  manualCrudTiers: ['TEAM_LEADER', 'EMPLOYEE'],
  fixedSeatsTotal: 13081,
  tiers: {
    MD: 1,
    DIRECTOR: 12,
    MANAGER: 108,
    ASSISTANT_MANAGER: 1296,
    SUPERVISOR: 11664,
    TEAM_LEADER: 'MANUAL_CRUD',
    EMPLOYEE: 'MANUAL_CRUD',
  },
} as const;

const SUPERVISOR_SEAT_REGEX = /^MD-01\.DIR-(0[1-9]|1[0-2])\.MGR-0[1-9]\.AM-(0[1-9]|1[0-2])\.SUP-0[1-9]$/;
const manualTeamStore = new Map<string, ManualTeamRecord>();

router.get(
  '/bhakti-formula',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: BHAKTI_FRACTAL_SUMMARY });
  })
);

router.get(
  '/teams',
  asyncHandler(async (req: Request, res: Response) => {
    const supervisorSeatCode =
      typeof req.query.supervisorSeatCode === 'string' ? req.query.supervisorSeatCode : undefined;
    const items = [...manualTeamStore.values()].filter(
      t => !supervisorSeatCode || t.supervisorSeatCode === supervisorSeatCode
    );
    res.json({ success: true, count: items.length, data: items });
  })
);

router.post(
  '/teams',
  requirePermission('turing_tasks:assign'),
  asyncHandler(async (req: Request, res: Response) => {
    const { supervisorSeatCode, teamCode, teamName, maxMembers, teamLeaderId } = req.body as {
      supervisorSeatCode?: string;
      teamCode?: string;
      teamName?: string;
      maxMembers?: number | null;
      teamLeaderId?: string | null;
    };
    if (!supervisorSeatCode || !SUPERVISOR_SEAT_REGEX.test(supervisorSeatCode)) {
      throw new AppError(
        'Teams may only be created under a valid SUPERVISOR seat (MD-01.DIR-XX.MGR-0X.AM-XX.SUP-0X)',
        400
      );
    }
    if (!teamCode || !teamName) {
      throw new AppError('teamCode and teamName are required', 400);
    }
    if (manualTeamStore.has(teamCode)) {
      throw new AppError(`Manual team '${teamCode}' already exists`, 409);
    }
    const now = new Date().toISOString();
    const record: ManualTeamRecord = {
      teamCode,
      teamName,
      supervisorSeatCode,
      teamLeaderId: teamLeaderId ?? null,
      employeeIds: [],
      maxMembers: typeof maxMembers === 'number' ? maxMembers : null,
      createdAt: now,
      updatedAt: now,
    };
    manualTeamStore.set(teamCode, record);
    res.status(201).json({ success: true, data: record });
  })
);

router.patch(
  '/teams/:teamCode',
  requirePermission('turing_tasks:assign'),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = manualTeamStore.get(String(req.params.teamCode));
    if (!existing) throw new AppError('Manual team not found', 404);
    const { teamName, teamLeaderId, maxMembers, addEmployeeId, removeEmployeeId } = req.body as {
      teamName?: string;
      teamLeaderId?: string | null;
      maxMembers?: number | null;
      addEmployeeId?: string;
      removeEmployeeId?: string;
    };
    let employeeIds = [...existing.employeeIds];
    const nextMax = maxMembers !== undefined ? maxMembers : existing.maxMembers;
    if (removeEmployeeId) employeeIds = employeeIds.filter(id => id !== removeEmployeeId);
    if (addEmployeeId && !employeeIds.includes(addEmployeeId)) {
      if (typeof nextMax === 'number' && employeeIds.length >= nextMax) {
        throw new AppError(`Manual team '${existing.teamCode}' has reached quota (${nextMax})`, 400);
      }
      employeeIds.push(addEmployeeId);
    }
    const updated: ManualTeamRecord = {
      ...existing,
      teamName: teamName ?? existing.teamName,
      teamLeaderId: teamLeaderId !== undefined ? teamLeaderId : existing.teamLeaderId,
      maxMembers: nextMax,
      employeeIds,
      updatedAt: new Date().toISOString(),
    };
    manualTeamStore.set(existing.teamCode, updated);
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/teams/:teamCode',
  requirePermission('turing_tasks:assign'),
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = manualTeamStore.delete(String(req.params.teamCode));
    if (!deleted) throw new AppError('Manual team not found', 404);
    res.json({ success: true });
  })
);

export default router;
