/**
 * daisyHierarchyAndTmsFormula.ts
 * White Caves Real Estate LLC — Complete Daisy Leasing Division Tree (AICC-Sanctum),
 * Open Human Job Positions (DMS / Careers), and Labeled TMS Leasing Task Collections.
 *
 * Reporting Chain:
 *   Managing Director (Arslan Malik)
 *     -> COO (AI Zoe, WC-COO-01)
 *       -> Director of Sales, Services & Operations (AI Clara, DIR-05, Locked DEPT-05)
 *         -> Residential Leasing Manager (AI Daisy, MGR-05-2 + Open Human Position)
 *           -> 12 Assistant Managers (AMGR-05-2-01 .. AMGR-05-2-12)
 *             -> 9 Supervisors per Assistant Manager = 108 Supervisors (SUP-05-2-01-1 .. SUP-05-2-12-9)
 *               -> 1 Team Leader (TL-05-2-01, AI Layla Field Team Leader)
 *                 -> 10 Leasing Agents (AGT-05-2-01 .. AGT-05-2-10, paired with 10 WhatsApp SIMs)
 */

import { CANONICAL_10_SIM_FLEET } from '../whatsapp/leasingSimOutreachFormula.js';
import type { OrgJobRole } from '../rbac/leasingRoleClearanceMatrix.js';

export interface SanctumSubordinateNode {
  id: string;
  code: string;
  name: string;
  gender: 'Female';
  role: OrgJobRole;
  roleTitle: string;
  departmentCode: 'DEPT-05';
  reportingToId: string;
  reportingChain: string[];
  clusterFocus: string;
  whatsappSim?: string;
}

export interface AssistantManagerBranch extends SanctumSubordinateNode {
  supervisors: SanctumSubordinateNode[];
}

export interface OpenHumanJobPosition {
  positionId: string;
  title: string;
  role: OrgJobRole;
  departmentCode: 'DEPT-05';
  departmentName: 'Sales, Services & Operations';
  reportsToId: string;
  reportsToTitle: string;
  openSlots: number;
  status: 'OPEN_FOR_HIRING';
  aiActingEmployeeId: string;
  aiActingEmployeeName: string;
  dmsDraggable: true;
  commissionSplit: string;
}

export interface TmsLeasingTaskItem {
  taskId: string;
  collectionId: string;
  title: string;
  stageOrder: number;
  departmentCode: string;
  assignedAiActorId: string;
  assignedAiActorName: string;
  assignedRole: OrgJobRole;
  reportingToId: string;
  humanFallbackActor: 'Arslan Malik (MD)';
  labels: string[];
  priority: 'P0_CRITICAL' | 'P1_HIGH';
}

const ASSISTANT_MANAGER_SPECS = [
  { num: '01', name: 'AI Amina Pacifica', focus: 'Pacifica & Pelham Cluster Leasing' },
  { num: '02', name: 'AI Sara Camelia', focus: 'Camelia & Centaury Cluster Leasing' },
  { num: '03', name: 'AI Huda Albizia', focus: 'Albizia & Amargo Cluster Leasing' },
  { num: '04', name: 'AI Rasha Basswood', focus: 'Basswood & Clivia Cluster Leasing' },
  { num: '05', name: 'AI Dina Vardon', focus: 'Vardon & Victoria Cluster Leasing' },
  { num: '06', name: 'AI Mona Zinnia', focus: 'Zinnia & Mimosa Cluster Leasing' },
  { num: '07', name: 'AI Nawal Juniper', focus: 'Juniper & Odora Cluster Leasing' },
  { num: '08', name: 'AI Karima Aster', focus: 'Aster & Avencia Cluster Leasing' },
  { num: '09', name: 'AI Samira Coursetia', focus: 'Coursetia & Claret Cluster Leasing' },
  { num: '10', name: 'AI Farida Janusia', focus: 'Janusia & Amazonia Cluster Leasing' },
  { num: '11', name: 'AI Zahra EjariDesk', focus: 'Ejari, DEWA & Tenancy Contract Execution' },
  { num: '12', name: 'AIMalak Renewals', focus: '90-Day RERA Renewals & Cheque Collection' },
];

const SUPERVISOR_FIRST_NAMES = ['Yasmin', 'Nadia', 'Leila', 'Salma', 'Rania', 'Dalia', 'Reem', 'Nour', 'Hana'];

const LEASING_AGENT_NAMES = [
  'AI Mariam Hunter-01',
  'AI Alia Hunter-02',
  'AI Bushra Hunter-03',
  'AI Jamila Hunter-04',
  'AI Khadija Hunter-05',
  'AI Latifa Hunter-06',
  'AI Maysa Hunter-07',
  'AINajwa Hunter-08',
  'AI Rawda Hunter-09',
  'AI Sawsan Hunter-10',
];

export function buildDaisyLeasingHierarchy() {
  const baseChain = ['md-arslan-malik', 'zoe', 'clara', 'daisy-leasing'];

  const assistantManagers: AssistantManagerBranch[] = ASSISTANT_MANAGER_SPECS.map((spec, idx) => {
    const amgrId = `amgr-05-2-${spec.num}`;
    const amgrCode = `AMGR-05-2-${spec.num}`;
    const cleanName = spec.name.replace('AIMalak', 'AI Malak');

    const supervisors: SanctumSubordinateNode[] = SUPERVISOR_FIRST_NAMES.map((firstName, sIdx) => {
      const supNum = sIdx + 1;
      const supId = `sup-05-2-${spec.num}-${supNum}`;
      return {
        id: supId,
        code: `SUP-05-2-${spec.num}-${supNum}`,
        name: `AI ${firstName} (${spec.focus.split(' ')[0]} S${supNum})`,
        gender: 'Female',
        role: 'SUPERVISOR',
        roleTitle: `Cluster Leasing Supervisor #${supNum} — ${spec.focus}`,
        departmentCode: 'DEPT-05',
        reportingToId: amgrId,
        reportingChain: [...baseChain, amgrId],
        clusterFocus: spec.focus,
      };
    });

    return {
      id: amgrId,
      code: amgrCode,
      name: cleanName,
      gender: 'Female',
      role: 'ASSISTANT_MANAGER',
      roleTitle: `Assistant Leasing Manager #${idx + 1} — ${spec.focus}`,
      departmentCode: 'DEPT-05',
      reportingToId: 'daisy-leasing',
      reportingChain: baseChain,
      clusterFocus: spec.focus,
      supervisors,
    };
  });

  const primarySupervisor = assistantManagers[0].supervisors[0];
  const teamLeader: SanctumSubordinateNode = {
    id: 'tl-05-2-01',
    code: 'TL-05-2-01',
    name: 'AI Layla DH2 Field Team Leader',
    gender: 'Female',
    role: 'TEAM_LEADER',
    roleTitle: 'DAMAC Hills 2 WhatsApp Outreach & Viewing Team Leader',
    departmentCode: 'DEPT-05',
    reportingToId: primarySupervisor.id,
    reportingChain: [...primarySupervisor.reportingChain, primarySupervisor.id],
    clusterFocus: 'All DAMAC Hills 2 Clusters (10-SIM Squad)',
  };

  const leasingAgents: SanctumSubordinateNode[] = LEASING_AGENT_NAMES.map((rawName, idx) => {
    const sim = CANONICAL_10_SIM_FLEET[idx];
    const clean = rawName.replace('AINajwa', 'AI Najwa');
    return {
      id: `agt-05-2-${String(idx + 1).padStart(2, '0')}`,
      code: `AGT-05-2-${String(idx + 1).padStart(2, '0')}`,
      name: clean,
      gender: 'Female',
      role: 'LEASING_AGENT',
      roleTitle:
        idx === 0
          ? 'Primary Master Follow-Up & MD Executive Support Agent'
          : `DAMAC Hills 2 WhatsApp Hunter & Viewing Agent #${idx + 1}`,
      departmentCode: 'DEPT-05',
      reportingToId: teamLeader.id,
      reportingChain: [...teamLeader.reportingChain, teamLeader.id],
      clusterFocus: 'DAMAC Hills 2 Residential Leasing',
      whatsappSim: sim?.phoneNumber,
    };
  });

  const totalSupervisors = assistantManagers.reduce((sum, a) => sum + a.supervisors.length, 0);

  return {
    managingDirector: {
      id: 'md-arslan-malik',
      name: 'Arslan Malik',
      role: 'MANAGING_DIRECTOR' as OrgJobRole,
      title: 'Founder & Managing Director (Only Human Employee Today — All Teams Report Here)',
    },
    coo: {
      id: 'zoe',
      code: 'WC-COO-01',
      name: 'AI Zoe',
      role: 'COO' as OrgJobRole,
      reportingToId: 'md-arslan-malik',
    },
    department: {
      deptCode: 'DEPT-05',
      name: 'Sales, Services & Operations (Locked Department #5)',
      director: {
        id: 'clara',
        code: 'DIR-05',
        name: 'AI Clara',
        role: 'DIRECTOR' as OrgJobRole,
        roleTitle: 'Director of Sales, Leasing & Brokerage Operations',
        reportingToId: 'zoe',
      },
      leasingManager: {
        id: 'daisy-leasing',
        code: 'MGR-05-2',
        name: 'AI Daisy Leasing',
        role: 'MANAGER' as OrgJobRole,
        roleTitle: 'Residential Leasing & Tenancy Manager',
        reportingToId: 'clara',
      },
    },
    counts: {
      assistantManagers: assistantManagers.length, // 12
      supervisors: totalSupervisors,               // 108 (12 x 9)
      teamLeaders: 1,
      leasingAgents: leasingAgents.length,         // 10
      totalDaisyDivisionNodes: 1 + assistantManagers.length + totalSupervisors + 1 + leasingAgents.length, // 132
    },
    assistantManagers,
    teamLeader,
    leasingAgents,
  };
}

export const OPEN_HUMAN_LEASING_POSITIONS: OpenHumanJobPosition[] = [
  {
    positionId: 'POS-DIR-05',
    title: 'Director of Sales, Services & Leasing Operations',
    role: 'DIRECTOR',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'md-arslan-malik',
    reportsToTitle: 'Managing Director (Arslan Malik) & AI Zoe (COO)',
    openSlots: 1,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'clara',
    aiActingEmployeeName: 'AI Clara (DIR-05)',
    dmsDraggable: true,
    commissionSplit: 'Executive Override + Profit Share',
  },
  {
    positionId: 'POS-MGR-05-2',
    title: 'Residential Leasing Manager (DAMAC Hills 2 & Dubai Freehold)',
    role: 'MANAGER',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'clara',
    reportsToTitle: 'Director of Sales, Services & Operations (DIR-05)',
    openSlots: 1,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'daisy-leasing',
    aiActingEmployeeName: 'AI Daisy Leasing (MGR-05-2)',
    dmsDraggable: true,
    commissionSplit: '60%–70% Split + Team Override',
  },
  {
    positionId: 'POS-AMGR-05-2',
    title: 'Assistant Leasing Manager — DAMAC Hills 2 Clusters',
    role: 'ASSISTANT_MANAGER',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'daisy-leasing',
    reportsToTitle: 'Residential Leasing Manager (MGR-05-2)',
    openSlots: 12,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'amgr-05-2-01',
    aiActingEmployeeName: '12 AI Assistant Managers (AMGR-05-2-01..12)',
    dmsDraggable: true,
    commissionSplit: '55%–65% Split + Cluster Bonus',
  },
  {
    positionId: 'POS-SUP-05-2',
    title: 'Leasing Field Supervisor — DAMAC Hills 2',
    role: 'SUPERVISOR',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'amgr-05-2-01',
    reportsToTitle: 'Assistant Leasing Manager (AMGR-05-2)',
    openSlots: 12,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'sup-05-2-01-1',
    aiActingEmployeeName: '108 AI Supervisors (9 per Assistant Manager)',
    dmsDraggable: true,
    commissionSplit: '55%–60% Split',
  },
  {
    positionId: 'POS-TL-05-2-01',
    title: 'Leasing Team Leader — 10-Agent WhatsApp & Viewing Squad',
    role: 'TEAM_LEADER',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'sup-05-2-01-1',
    reportsToTitle: 'Cluster Leasing Supervisor (SUP-05-2-01-1)',
    openSlots: 1,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'tl-05-2-01',
    aiActingEmployeeName: 'AI Layla DH2 Field Team Leader (TL-05-2-01)',
    dmsDraggable: true,
    commissionSplit: '55%–65% Split + Squad Override',
  },
  {
    positionId: 'POS-AGT-05-2',
    title: 'Residential Leasing Agent — DAMAC Hills 2 Hunter & Viewing Squad',
    role: 'LEASING_AGENT',
    departmentCode: 'DEPT-05',
    departmentName: 'Sales, Services & Operations',
    reportsToId: 'tl-05-2-01',
    reportsToTitle: 'Leasing Team Leader (TL-05-2-01)',
    openSlots: 10,
    status: 'OPEN_FOR_HIRING',
    aiActingEmployeeId: 'agt-05-2-01',
    aiActingEmployeeName: '10 AI Leasing Agents (AGT-05-2-01..10)',
    dmsDraggable: true,
    commissionSplit: '50%–65% Commission + 24h Payout',
  },
];

export const TMS_LEASING_TASK_COLLECTIONS: TmsLeasingTaskItem[] = [
  {
    taskId: 'TMS-LEASE-01',
    collectionId: 'COL-DH2-MISSION-1-DISCOVERY',
    title: 'Run Paced WhatsApp Landlord Campaigns Across 9 Hunter SIMs to Discover Available DH2 Units',
    stageOrder: 1,
    departmentCode: 'DEPT-05 / DEPT-08',
    assignedAiActorId: 'linda',
    assignedAiActorName: 'AI Linda (MGR-08-1) + 10 AI Leasing Agents (AGT-05-2-01..10)',
    assignedRole: 'LEASING_AGENT',
    reportingToId: 'tl-05-2-01',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'WHATSAPP-10-SIM', 'DAMAC-HILLS-2', 'ACTOR:LINDA+10-AGENTS'],
    priority: 'P0_CRITICAL',
  },
  {
    taskId: 'TMS-LEASE-02',
    collectionId: 'COL-DH2-MISSION-1-DISCOVERY',
    title: 'Ingest Discovered Available Units into Mary Inventory Vault & Enforce Google Drive Unit Formula',
    stageOrder: 2,
    departmentCode: 'DEPT-06 / DEPT-11',
    assignedAiActorId: 'mary-inventory',
    assignedAiActorName: 'AI Mary (MGR-06-1) & AI Henry (MGR-11-1)',
    assignedRole: 'MANAGER',
    reportingToId: 'sentinel',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'MARY-VAULT', 'HENRY-DRIVE-FORMULA', 'ACTOR:MARY+HENRY'],
    priority: 'P0_CRITICAL',
  },
  {
    taskId: 'TMS-LEASE-03',
    collectionId: 'COL-DH2-MISSION-2-NEGOTIATION',
    title: 'Primary Master (+971505760056) Landlord Follow-Up, Price Negotiation Call/Meet & MD Calendar Sync',
    stageOrder: 3,
    departmentCode: 'DEPT-05',
    assignedAiActorId: 'zoe',
    assignedAiActorName: 'Arslan Malik (MD) + AI Zoe (WC-COO-01) + AI Clara (DIR-05)',
    assignedRole: 'MANAGING_DIRECTOR',
    reportingToId: 'md-arslan-malik',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'PRIMARY-MASTER-ONLY', 'GOOGLE-CALENDAR', 'ACTOR:MD+ZOE'],
    priority: 'P0_CRITICAL',
  },
  {
    taskId: 'TMS-LEASE-04',
    collectionId: 'COL-DH2-MISSION-3-WEB-SEO',
    title: 'Generate AI SEO Listings & Publish to White-Caves-Web (/rent/damac-hills-2) With Direct Linda CTA',
    stageOrder: 4,
    departmentCode: 'DEPT-05',
    assignedAiActorId: 'daisy-leasing',
    assignedAiActorName: 'AI Daisy Leasing (MGR-05-2) + 12 AI Assistant Managers',
    assignedRole: 'MANAGER',
    reportingToId: 'clara',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'WHITE-CAVES-WEB-SEO', 'WEB-CRAWLER-AI', 'ACTOR:DAISY'],
    priority: 'P0_CRITICAL',
  },
  {
    taskId: 'TMS-LEASE-05',
    collectionId: 'COL-DH2-MISSION-4-CLOSING',
    title: 'Schedule Hot Tenant Viewings, Process Offers, Collect Cheques & Fees First, Tenant Signs First, Clearance & Landlord Countersign',
    stageOrder: 7,
    departmentCode: 'DEPT-05',
    assignedAiActorId: 'amgr-05-2-11',
    assignedAiActorName: 'AI Zahra EjariDesk (AMGR-05-2-11) & AI Daisy (MGR-05-2)',
    assignedRole: 'ASSISTANT_MANAGER',
    reportingToId: 'daisy-leasing',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'CHEQUES-FIRST-GATE', 'TENANT-SIGNS-FIRST', 'ACTOR:DAISY-TEAM'],
    priority: 'P0_CRITICAL',
  },
  {
    taskId: 'TMS-LEASE-06',
    collectionId: 'COL-DH2-MISSION-5-EJARI-RENEWAL',
    title: 'Archive Ejari + DEWA PDF to Unit Drive Folder, Issue Payment Receipts, Set 90-Day RERA Calendar Notice & Send Care Notifications',
    stageOrder: 11,
    departmentCode: 'DEPT-05 / DEPT-11',
    assignedAiActorId: 'henry',
    assignedAiActorName: 'AI Henry (MGR-11-1) & AI Malak Renewals (AMGR-05-2-12)',
    assignedRole: 'DOCUMENT_CONTROLLER',
    reportingToId: 'sofia',
    humanFallbackActor: 'Arslan Malik (MD)',
    labels: ['AICC-SANCTUM', 'LEASING-P0', 'EJARI-DEWA-DRIVE', '90-DAY-RERA-RENEWAL', 'ACTOR:HENRY+MALAK'],
    priority: 'P0_CRITICAL',
  },
];
