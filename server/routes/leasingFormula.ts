import { Router } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../database.js';
import {
  filterInventoryByActorScope,
  normalizeAppRoleToOrgRole,
  ORG_ROLE_CLEARANCE_MATRIX,
} from '../services/rbac/leasingRoleClearanceMatrix.js';
import {
  createHunterToPrimaryMasterHandoff,
  enforceSimDispatchPolicy,
  getAllSimLines,
  getPrimaryMasterCloserSim,
  registerEmployeeHunterSim,
} from '../services/whatsapp/leasingSimOutreachFormula.js';
import {
  advanceTenancyStage,
  getRequiredDewaDocumentType,
  LEASING_12_STAGE_FORMULA,
  type LeasingDealStage,
  type TenancyDealState,
} from '../services/leasing/tenancyLifecycleFormula.js';
import { buildStageCareNotifications } from '../services/leasing/leasingCareNotificationService.js';
import {
  scheduleMdLeasingAppointment,
  scheduleTenancyRenewalCalendarMilestones,
  verifyMdCalendarAccess,
} from '../services/google/googleCalendarServiceAccount.js';
import {
  ensureTenancyStageFolders,
  TENANCY_CONTRACT_STAGE_SUBFOLDERS,
} from '../services/henry/driveInventoryManager.js';
import {
  buildDaisyLeasingHierarchy,
  OPEN_HUMAN_LEASING_POSITIONS,
  TMS_LEASING_TASK_COLLECTIONS,
} from '../services/leasing/daisyHierarchyAndTmsFormula.js';

const router = Router();
const db = prisma as any;

router.get('/blueprint', (_req, res) => {
  res.json({
    success: true,
    data: {
      primaryMasterCloser: getPrimaryMasterCloserSim(),
      simFleetCount: getAllSimLines().length,
      roleClearanceMatrix: ORG_ROLE_CLEARANCE_MATRIX,
      stages12: LEASING_12_STAGE_FORMULA,
      tenancyDriveStageSubfolders: TENANCY_CONTRACT_STAGE_SUBFOLDERS,
      daisyHierarchySummary: buildDaisyLeasingHierarchy().counts,
      openHumanPositionsCount: OPEN_HUMAN_LEASING_POSITIONS.length,
      tmsLeasingTaskCollectionsCount: TMS_LEASING_TASK_COLLECTIONS.length,
    },
  });
});

router.get('/hierarchy/daisy-team', (_req, res) => {
  res.json({
    success: true,
    data: buildDaisyLeasingHierarchy(),
  });
});

router.get('/dms/open-positions', (_req, res) => {
  res.json({
    success: true,
    data: {
      departmentId: 'DEPT-05',
      departmentName: 'Sales, Services & Operations',
      director: 'AI Clara (DIR-05)',
      manager: 'AI Daisy Leasing (MGR-05-2)',
      openPositions: OPEN_HUMAN_LEASING_POSITIONS,
    },
  });
});

router.get('/tms/leasing-tasks', (_req, res) => {
  res.json({
    success: true,
    data: {
      domain: 'RESIDENTIAL_LEASING_OPERATIONS',
      departmentId: 'DEPT-05',
      collections: TMS_LEASING_TASK_COLLECTIONS,
    },
  });
});

router.get('/sim-fleet', (_req, res) => {
  const sims = getAllSimLines();
  res.json({
    success: true,
    data: {
      total: sims.length,
      primaryMaster: getPrimaryMasterCloserSim(),
      hunters: sims.filter(s => s.tier === 'HUNTER_OUTREACH'),
      sims,
    },
  });
});

router.post('/sim-fleet/register-agent-sim', asyncHandler(async (req: AuthRequest, res) => {
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const { phoneNumber, displayName } = req.body || {};
  if (!phoneNumber || !displayName) throw new AppError('phoneNumber and displayName are required', 400);
  const record = registerEmployeeHunterSim({
    phoneNumber: String(phoneNumber),
    displayName: String(displayName),
    assignedUserId: req.user?.id || 'unknown-agent',
    actorRole: role,
  });
  res.status(201).json({ success: true, data: record });
}));

router.post('/sim-fleet/enforce-policy', asyncHandler(async (req: AuthRequest, res) => {
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const { simPhone, mission } = req.body || {};
  if (!simPhone || !mission) throw new AppError('simPhone and mission are required', 400);
  const result = enforceSimDispatchPolicy({ simPhone: String(simPhone), mission, actorRole: role });
  res.json({ success: true, data: result });
}));

router.post('/sim-fleet/handoff', asyncHandler(async (req: AuthRequest, res) => {
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const { hunterSimPhone, landlordName, landlordPhone, area, project, unitNumber, askingRentAed, notes } = req.body || {};
  if (!hunterSimPhone || !landlordName || !landlordPhone || !project || !unitNumber) {
    throw new AppError('hunterSimPhone, landlordName, landlordPhone, project, and unitNumber are required', 400);
  }
  const handoff = createHunterToPrimaryMasterHandoff({
    hunterSimPhone: String(hunterSimPhone),
    discoveredByUserId: req.user?.id || 'md-arslan-malik',
    discoveredByRole: role,
    landlordName: String(landlordName),
    landlordPhone: String(landlordPhone),
    area: String(area || 'Damac Hills 2'),
    project: String(project),
    unitNumber: String(unitNumber),
    askingRentAed: askingRentAed ? Number(askingRentAed) : undefined,
    notes: notes ? String(notes) : undefined,
  });
  res.status(201).json({ success: true, data: handoff });
}));

router.get('/inventory/scoped', asyncHandler(async (req: AuthRequest, res) => {
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const userId = req.user?.id || 'unknown';
  let properties: any[] = [];
  try {
    properties = await db.property.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  } catch {
    properties = [];
  }
  const scoped = filterInventoryByActorScope(
    properties.map(p => ({ ...p, discoveredByUserId: p.userId || p.agentId || null })),
    { userId, role }
  );
  res.json({ success: true, data: { actorRole: role, ...scoped } });
}));

router.post('/deals/advance-stage', asyncHandler(async (req: AuthRequest, res) => {
  const role = normalizeAppRoleToOrgRole(req.user?.role);
  const { deal, nextStage, vipProxyOnBehalfOfClient, note, evidence } = req.body as {
    deal?: TenancyDealState;
    nextStage?: LeasingDealStage;
    vipProxyOnBehalfOfClient?: boolean;
    note?: string;
    evidence?: Record<string, unknown>;
  };
  if (!deal || !nextStage) throw new AppError('deal and nextStage are required', 400);
  const result = advanceTenancyStage({
    deal,
    nextStage,
    actorRole: role,
    actorUserId: req.user?.id || 'md-arslan-malik',
    vipProxyOnBehalfOfClient: vipProxyOnBehalfOfClient === true,
    note,
    evidence: evidence as any,
  });
  const careNotifications = buildStageCareNotifications({
    stage: nextStage,
    contractMode: result.deal.contractMode,
    area: result.deal.area,
    project: result.deal.project,
    unitNumber: result.deal.unitNumber,
    landlordName: result.deal.landlordName,
    landlordPhone: result.deal.landlordPhone,
    tenantName: result.deal.tenantName,
    tenantPhone: result.deal.tenantPhone,
    annualRentAed: result.deal.annualRentAed,
  });
  res.json({
    success: true,
    data: {
      ...result,
      requiredDewaDocument: getRequiredDewaDocumentType(result.deal.contractMode),
      careNotifications,
    },
  });
}));

router.post('/drive/tenancy-stage-folders', asyncHandler(async (req: AuthRequest, res) => {
  const { areaName, projectName, unitNumber, contractYear, contractMode } = req.body || {};
  if (!areaName || !projectName || !unitNumber) {
    throw new AppError('areaName, projectName, and unitNumber are required', 400);
  }
  const folders = await ensureTenancyStageFolders({
    areaName: String(areaName),
    projectName: String(projectName),
    unitNumber: String(unitNumber),
    contractYear: contractYear || new Date().getFullYear(),
    contractMode: contractMode === 'RENEWAL' ? 'RENEWAL' : 'NEW',
  });
  res.status(201).json({ success: true, data: folders });
}));

router.get('/calendar/status', asyncHandler(async (req, res) => {
  const calId = typeof req.query.calendarId === 'string' ? req.query.calendarId : undefined;
  res.json({ success: true, data: await verifyMdCalendarAccess(calId) });
}));

router.post('/calendar/appointment', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.kind || !body.contactName || !body.contactPhone || !body.project || !body.unitNumber || !body.startIso) {
    throw new AppError('kind, contactName, contactPhone, project, unitNumber, and startIso are required', 400);
  }
  const event = await scheduleMdLeasingAppointment(body);
  res.status(201).json({ success: true, data: event });
}));

router.post('/calendar/renewal-milestones', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.project || !body.unitNumber || !body.landlordName || !body.tenantName || !body.contractEndDateIso) {
    throw new AppError('project, unitNumber, landlordName, tenantName, and contractEndDateIso are required', 400);
  }
  const result = await scheduleTenancyRenewalCalendarMilestones({
    ...body,
    annualRentAed: Number(body.annualRentAed || 90000),
  });
  res.status(201).json({ success: true, data: result });
}));

export default router;
