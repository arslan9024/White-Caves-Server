/**
 * aiccSupervisorChains.ts — Canonical Bhakti 1-12-108 Named Assistant Managers & Operational AI Supervisors
 * White Caves Real Estate LLC — Complete Unbroken Chains:
 * MD (Arslan Malik) -> COO (AI Zoe) -> Director (DIR-DD) -> Manager (MGR-DD-M)
 * -> Assistant Manager (AMGR-DD-M-01) -> Operational AI Supervisor (SUP-DD-M-01-1)
 *
 * Covers ALL 5 Live Operational AI Assistants: Diana, Daisy, Mary, Linda, and Henry (Sole Male AI Officer).
 * Standard: AEGIS Single Purpose File Law (< 350 lines, AEG-042).
 */

import type { AgentNode } from './aiccHierarchy.js';

export interface OperationalSupervisorSummary {
  key: 'diana' | 'daisy' | 'mary' | 'linda' | 'henry';
  deptCode: string;
  workspaceRoute: string;
  director: { id: string; code: string; name: string };
  manager: { id: string; code: string; name: string };
  assistantManager: AgentNode;
  supervisor: AgentNode;
  fullChainIds: string[];
  fullChainCodes: string[];
}

export const SANCTUM_ASSISTANT_MANAGERS: AgentNode[] = [
  {
    id: 'amgr-02-6-01',
    code: 'AMGR-02-6-01',
    name: 'AI Rania Campaigns',
    gender: 'Female',
    tier: 'ASSISTANT_MANAGER',
    roleTitle: 'Assistant Manager — Property Owner & Investor Email Outreach',
    slot: 1,
    departmentCode: 'DEPT-02',
    reportingTo: 'celine-email-mgr',
    allowedTools: ['resend_campaign', 'email_segmentation'],
    systemPrompt: 'You are AI Rania Campaigns (AMGR-02-6-01). You oversee AI Diana Supervisor (SUP-02-6-01-1) for property owner Gmail campaigns and report to AI Celine Lifecycle (MGR-02-6).',
    capabilities: ['Owner Email Operations', 'Deliverability Oversight', 'Campaign QA'],
    slaResponseMinutes: 10,
  },
  {
    id: 'amgr-05-2-01',
    code: 'AMGR-05-2-01',
    name: 'AI Amina Leasing',
    gender: 'Female',
    tier: 'ASSISTANT_MANAGER',
    roleTitle: 'Assistant Manager — DAMAC Hills 2 Residential Leasing & Pipelines',
    slot: 1,
    departmentCode: 'DEPT-05',
    reportingTo: 'layla-leasing-mgr',
    allowedTools: ['lease_calculator', 'viewing_allocator'],
    systemPrompt: 'You are AI Amina Leasing (AMGR-05-2-01). You oversee AI Daisy Supervisor (SUP-05-2-01-1) across DAMAC Hills 2 leasing pipelines and report to AI Layla Residential (MGR-05-2).',
    capabilities: ['DH2 Leasing Pipelines', 'Viewing SLA Oversight', 'Tenancy Readiness'],
    slaResponseMinutes: 10,
  },
  {
    id: 'amgr-06-1-01',
    code: 'AMGR-06-1-01',
    name: 'AI Farah Inventory',
    gender: 'Female',
    tier: 'ASSISTANT_MANAGER',
    roleTitle: 'Assistant Manager — DAMAC Hills 2 Cluster Inventory & Verification',
    slot: 1,
    departmentCode: 'DEPT-06',
    reportingTo: 'yasmin-inventory-mgr',
    allowedTools: ['dh2_units_matrix', 'inventory_audit'],
    systemPrompt: 'You are AI Farah Inventory (AMGR-06-1-01). You oversee AI Mary Supervisor (SUP-06-1-01-1) in verifying DAMAC Hills 2 rental & sales stock and report to AI Yasmin Portfolio (MGR-06-1).',
    capabilities: ['DH2 Inventory Verification', 'Vault Hygiene', 'Cluster Rent Benchmarks'],
    slaResponseMinutes: 10,
  },
  {
    id: 'amgr-08-1-01',
    code: 'AMGR-08-1-01',
    name: 'AI Samira WhatsApp',
    gender: 'Female',
    tier: 'ASSISTANT_MANAGER',
    roleTitle: 'Assistant Manager — 10-SIM Multi-Device Fleet & Campaign Operations',
    slot: 1,
    departmentCode: 'DEPT-08',
    reportingTo: 'nadia-whatsapp-mgr',
    allowedTools: ['whatsapp_fleet_monitor', 'anti_ban_policy'],
    systemPrompt: 'You are AI Samira WhatsApp (AMGR-08-1-01). You oversee AI Linda Supervisor (SUP-08-1-01-1) across the 10-SIM WhatsApp fleet and report to AI Nadia Omnichannel (MGR-08-1).',
    capabilities: ['10-SIM Fleet Health', 'Anti-Ban Governance', 'Primary Master Protection'],
    slaResponseMinutes: 5,
  },
  {
    id: 'amgr-11-1-01',
    code: 'AMGR-11-1-01',
    name: 'AI Dalia Compliance',
    gender: 'Female',
    tier: 'ASSISTANT_MANAGER',
    roleTitle: 'Assistant Manager — DLD Vault Archival, Ejari & KYC Verification',
    slot: 1,
    departmentCode: 'DEPT-11',
    reportingTo: 'mireille-records-mgr',
    allowedTools: ['vault_audit', 'ejari_verify'],
    systemPrompt: 'You are AI Dalia Compliance (AMGR-11-1-01). You oversee AI Henry Supervisor (SUP-11-1-01-1) for DLD document vault seals and Ejari/KYC readiness, reporting to AI Mireille Governance (MGR-11-1).',
    capabilities: ['DLD Audit Readiness', 'Ejari & Form A Oversight', 'Vault Governance'],
    slaResponseMinutes: 10,
  },
];

export const SANCTUM_OPERATIONAL_SUPERVISORS: AgentNode[] = [
  {
    id: 'diana-email',
    code: 'SUP-02-6-01-1',
    name: 'AI Diana Supervisor',
    gender: 'Female',
    tier: 'SUPERVISOR',
    roleTitle: 'Supervisor — Property Owner Email Campaigns & Gmail Automation',
    slot: 1,
    departmentCode: 'DEPT-02',
    reportingTo: 'amgr-02-6-01',
    allowedTools: ['resend_campaign', 'gmail_owner_dispatch'],
    systemPrompt: 'You are AI Diana (SUP-02-6-01-1), Supervisor of Property Owner Email Campaigns (the.arslan.broker@gmail.com). You report to AI Rania Campaigns (AMGR-02-6-01) -> AI Celine Lifecycle (MGR-02-6) -> AI Olivia (DIR-02) -> AI Zoe (WC-COO-01).',
    capabilities: ['Property Owner Gmail Campaigns', 'Investor Newsletters', 'DH2 Owner Segmentation'],
    slaResponseMinutes: 5,
  },
  {
    id: 'daisy-leasing',
    code: 'SUP-05-2-01-1',
    name: 'AI Daisy Supervisor',
    gender: 'Female',
    tier: 'SUPERVISOR',
    roleTitle: 'Supervisor — Residential Leasing Pipeline, Viewings & Ejari Lifecycle',
    slot: 1,
    departmentCode: 'DEPT-05',
    reportingTo: 'amgr-05-2-01',
    allowedTools: ['lease_calculator', 'ejari_draft', 'viewing_scheduler'],
    systemPrompt: 'You are AI Daisy (SUP-05-2-01-1), Residential Leasing Supervisor. You manage tenant applications, viewings, Ejari contracts, and 90-day renewals under AI Amina Leasing (AMGR-05-2-01) -> AI Layla Residential (MGR-05-2) -> AI Clara (DIR-05) -> AI Zoe (WC-COO-01).',
    capabilities: ['Ejari Contracts', 'Rental Lease Lifecycle', 'DAMAC Hills 2 Rentals', '90-Day RERA Renewals'],
    slaResponseMinutes: 5,
  },
  {
    id: 'mary-inventory',
    code: 'SUP-06-1-01-1',
    name: 'AI Mary Supervisor',
    gender: 'Female',
    tier: 'SUPERVISOR',
    roleTitle: 'Supervisor — DAMAC Hills 2 Master Inventory Vault & Unit Matching',
    slot: 1,
    departmentCode: 'DEPT-06',
    reportingTo: 'amgr-06-1-01',
    allowedTools: ['dh2_units_matrix', 'vault_upsert', 'tenant_unit_match'],
    systemPrompt: 'You are AI Mary (SUP-06-1-01-1), DAMAC Hills 2 Master Inventory Supervisor. You verify villa/townhouse availability and match tenants to active units under AI Farah Inventory (AMGR-06-1-01) -> AI Yasmin Portfolio (MGR-06-1) -> AI Sentinel (DIR-06) -> AI Zoe (WC-COO-01).',
    capabilities: ['DH2 Cluster Units', 'Rent Valuations', 'Landlord Unit Matching', 'Top-3 Tenant Shortlists'],
    slaResponseMinutes: 5,
  },
  {
    id: 'linda',
    code: 'SUP-08-1-01-1',
    name: 'AI Linda Supervisor',
    gender: 'Female',
    tier: 'SUPERVISOR',
    roleTitle: 'Supervisor — WhatsApp Real Estate Automation & 10-SIM Fleet Operations',
    slot: 1,
    departmentCode: 'DEPT-08',
    reportingTo: 'amgr-08-1-01',
    allowedTools: ['whatsapp_send', 'analyze_chat', 'damac_followup', 'handoff_henry', 'handoff_mary', 'handoff_daisy'],
    systemPrompt: 'You are AI Linda (SUP-08-1-01-1), Supervisor of WhatsApp Real Estate Automation across 1 Primary Master (+971505760056) and 9 Hunter SIMs. You report to AI Samira WhatsApp (AMGR-08-1-01) -> AI Nadia Omnichannel (MGR-08-1) -> AI Maya (DIR-08) -> AI Zoe (WC-COO-01).',
    capabilities: ['10-SIM WhatsApp Fleet', 'DH2 Landlord Campaigns', 'Instant Tenant Triage', 'Cross-Agent Handoffs'],
    slaResponseMinutes: 1,
  },
  {
    id: 'henry',
    code: 'SUP-11-1-01-1',
    name: 'AI Henry Supervisor',
    gender: 'Male',
    tier: 'SUPERVISOR',
    roleTitle: 'Supervisor — Chief Document Controller & The Record Keeper (Sole Male AI Officer)',
    slot: 1,
    departmentCode: 'DEPT-11',
    reportingTo: 'amgr-11-1-01',
    allowedTools: ['drive_file', 'vault_encrypt', 'mrz_ocr', 'document_audit'],
    systemPrompt: 'You are AI Henry (SUP-11-1-01-1), Chief Document Controller and sole male AI officer in AICC-Sanctum. You manage the sovereign Google Drive vault, Form A/Tenancy/Ejari seals, and Passport/EID MRZ OCR under AI Dalia Compliance (AMGR-11-1-01) -> AI Mireille Governance (MGR-11-1) -> AI Sofia (DIR-11) -> AI Zoe (WC-COO-01).',
    capabilities: ['Sole Male AI Officer', 'Document Vault Encryption', 'Google Drive Archival', 'Passport & Emirates ID MRZ OCR'],
    slaResponseMinutes: 5,
  },
];

export const AGENT_ID_ALIASES: Record<string, string> = {
  diana: 'diana-email',
  'SUP-02-6-01-1': 'diana-email',
  daisy: 'daisy-leasing',
  'SUP-05-2-01-1': 'daisy-leasing',
  mary: 'mary-inventory',
  'SUP-06-1-01-1': 'mary-inventory',
  'SUP-08-1-01-1': 'linda',
  'SUP-11-1-01-1': 'henry',
};

export const OPERATIONAL_SUPERVISOR_SUMMARIES: OperationalSupervisorSummary[] = [
  {
    key: 'diana',
    deptCode: 'DEPT-02',
    workspaceRoute: '/dashboard/diana',
    director: { id: 'olivia', code: 'DIR-02', name: 'AI Olivia' },
    manager: { id: 'celine-email-mgr', code: 'MGR-02-6', name: 'AI Celine Lifecycle' },
    assistantManager: SANCTUM_ASSISTANT_MANAGERS[0],
    supervisor: SANCTUM_OPERATIONAL_SUPERVISORS[0],
    fullChainIds: ['md-arslan-malik', 'zoe', 'olivia', 'celine-email-mgr', 'amgr-02-6-01', 'diana-email'],
    fullChainCodes: ['MD-01', 'WC-COO-01', 'DIR-02', 'MGR-02-6', 'AMGR-02-6-01', 'SUP-02-6-01-1'],
  },
  {
    key: 'daisy',
    deptCode: 'DEPT-05',
    workspaceRoute: '/dashboard/leasing',
    director: { id: 'clara', code: 'DIR-05', name: 'AI Clara' },
    manager: { id: 'layla-leasing-mgr', code: 'MGR-05-2', name: 'AI Layla Residential' },
    assistantManager: SANCTUM_ASSISTANT_MANAGERS[1],
    supervisor: SANCTUM_OPERATIONAL_SUPERVISORS[1],
    fullChainIds: ['md-arslan-malik', 'zoe', 'clara', 'layla-leasing-mgr', 'amgr-05-2-01', 'daisy-leasing'],
    fullChainCodes: ['MD-01', 'WC-COO-01', 'DIR-05', 'MGR-05-2', 'AMGR-05-2-01', 'SUP-05-2-01-1'],
  },
  {
    key: 'mary',
    deptCode: 'DEPT-06',
    workspaceRoute: '/dashboard/inventory',
    director: { id: 'sentinel', code: 'DIR-06', name: 'AI Sentinel' },
    manager: { id: 'yasmin-inventory-mgr', code: 'MGR-06-1', name: 'AI Yasmin Portfolio' },
    assistantManager: SANCTUM_ASSISTANT_MANAGERS[2],
    supervisor: SANCTUM_OPERATIONAL_SUPERVISORS[2],
    fullChainIds: ['md-arslan-malik', 'zoe', 'sentinel', 'yasmin-inventory-mgr', 'amgr-06-1-01', 'mary-inventory'],
    fullChainCodes: ['MD-01', 'WC-COO-01', 'DIR-06', 'MGR-06-1', 'AMGR-06-1-01', 'SUP-06-1-01-1'],
  },
  {
    key: 'linda',
    deptCode: 'DEPT-08',
    workspaceRoute: '/dashboard/linda',
    director: { id: 'maya', code: 'DIR-08', name: 'AI Maya' },
    manager: { id: 'nadia-whatsapp-mgr', code: 'MGR-08-1', name: 'AI Nadia Omnichannel' },
    assistantManager: SANCTUM_ASSISTANT_MANAGERS[3],
    supervisor: SANCTUM_OPERATIONAL_SUPERVISORS[3],
    fullChainIds: ['md-arslan-malik', 'zoe', 'maya', 'nadia-whatsapp-mgr', 'amgr-08-1-01', 'linda'],
    fullChainCodes: ['MD-01', 'WC-COO-01', 'DIR-08', 'MGR-08-1', 'AMGR-08-1-01', 'SUP-08-1-01-1'],
  },
  {
    key: 'henry',
    deptCode: 'DEPT-11',
    workspaceRoute: '/dashboard/henry',
    director: { id: 'sofia', code: 'DIR-11', name: 'AI Sofia' },
    manager: { id: 'mireille-records-mgr', code: 'MGR-11-1', name: 'AI Mireille Governance' },
    assistantManager: SANCTUM_ASSISTANT_MANAGERS[4],
    supervisor: SANCTUM_OPERATIONAL_SUPERVISORS[4],
    fullChainIds: ['md-arslan-malik', 'zoe', 'sofia', 'mireille-records-mgr', 'amgr-11-1-01', 'henry'],
    fullChainCodes: ['MD-01', 'WC-COO-01', 'DIR-11', 'MGR-11-1', 'AMGR-11-1-01', 'SUP-11-1-01-1'],
  },
];
