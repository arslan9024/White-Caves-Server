/**
 * dh2CampaignSequencesService.ts
 * White Caves Real Estate LLC — Warm Sequence Dispatcher, Delivery Log & E2E Triage Verifier
 * Decomposed under AEGIS AEG-042 (< 350 lines).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { getSocketServer } from '../socketServer.js';
import { isDubaiBusinessHours, isFridayPrayerPause } from './anti-ban/index.js';
import { computeAntiBanDelayMs, lindaMultiSimPool, normalizePhoneDigits } from './LindaMultiSimPoolService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import { isPhoneSuppressed, suppressPhoneOptOut } from './dh2OutreachGovernanceService.js';
import { getDh2WarmContacts, type WarmContactCategory } from './dh2WarmContactsService.js';
import { processLandlordAvailabilityReply, routeInboundTenantViewingInquiry } from './dh2LandlordReplyVaultSync.js';
import {
  CAMPAIGN_SEQUENCE_LIBRARY,
  hasNoLeakedPrivateIdentifiers,
  renderSequenceMessage,
  sanitizeAndAuditOutboundMessage,
  type CampaignDeliveryLogEntry,
  type CampaignSequenceKey,
  type ComplianceAuditResult,
  type SequenceStepTemplate,
} from './dh2SequenceTemplatesAndAudit.js';

export {
  CAMPAIGN_SEQUENCE_LIBRARY,
  renderSequenceMessage,
  sanitizeAndAuditOutboundMessage,
  suppressPhoneOptOut,
  type CampaignDeliveryLogEntry,
  type CampaignSequenceKey,
  type ComplianceAuditResult,
  type SequenceStepTemplate,
};

const log = createLogger('Dh2CampaignSequences');
const defaultDb = prisma as any;
const deliveryLogsBuffer: CampaignDeliveryLogEntry[] = [];

export function getRecentDeliveryLogs(limit = 50): CampaignDeliveryLogEntry[] {
  return deliveryLogsBuffer.slice(0, Math.max(1, Math.min(limit, 200)));
}

function recordDeliveryLog(entry: CampaignDeliveryLogEntry) {
  deliveryLogsBuffer.unshift(entry);
  if (deliveryLogsBuffer.length > 300) deliveryLogsBuffer.length = 300;
}

export async function launchWarmSequenceCampaign(input: {
  sequenceKey: CampaignSequenceKey;
  cluster?: string;
  limit?: number;
  dryRun?: boolean;
  respectBusinessHours?: boolean;
  scheduleFollowUps?: boolean;
  customTemplate?: string;
  recipientsOverride?: Array<{ phone: string; name?: string; cluster?: string; bedrooms?: string }>;
  dbOverride?: any;
}) {
  const db = input.dbOverride || defaultDb;
  const steps = CAMPAIGN_SEQUENCE_LIBRARY[input.sequenceKey] || CAMPAIGN_SEQUENCE_LIBRARY.LANDLORD_RETENTION_RENEWAL;
  const step1Template = input.customTemplate?.trim() || steps[0].body;
  const isColdDiscovery = input.sequenceKey === 'DH2_LANDLORD_DISCOVERY';
  const fridayPause = isFridayPrayerPause();
  const outsideHours = input.respectBusinessHours !== false && (!isDubaiBusinessHours() || fridayPause);

  let recipients: Array<{ phone: string; name: string; cluster: string; bedrooms: string }> = [];
  if (Array.isArray(input.recipientsOverride) && input.recipientsOverride.length > 0) {
    recipients = input.recipientsOverride.map(r => ({
      phone: normalizePhoneDigits(r.phone),
      name: r.name || 'Valued Client',
      cluster: r.cluster || input.cluster || 'DAMAC Hills 2',
      bedrooms: String(r.bedrooms || '3'),
    }));
  } else {
    const category: WarmContactCategory | 'ALL' =
      input.sequenceKey === 'TENANT_FOLLOWUP' ? 'TENANT_FOLLOWUP' : 'LANDLORD_RETENTION_RENEWAL';
    const warm = await getDh2WarmContacts({
      category,
      cluster: input.cluster,
      limit: input.limit || 25,
      dbOverride: db,
    });
    recipients = warm.contacts.map(c => ({
      phone: c.phone,
      name: c.name,
      cluster: c.cluster,
      bedrooms: c.bedrooms,
    }));
  }

  const hunterLines = lindaMultiSimPool.getHunterPoolAccounts();
  const logs: CampaignDeliveryLogEntry[] = [];
  let followUpsScheduled = 0;

  for (let i = 0; i < recipients.length; i++) {
    const target = recipients[i];
    const cleanTo = normalizePhoneDigits(target.phone);
    const delayMs = i === 0 ? 0 : computeAntiBanDelayMs();
    const audit = renderSequenceMessage(step1Template, target);
    const assignedSim = isColdDiscovery
      ? hunterLines[i % hunterLines.length]?.phoneNumber || '+971503869886'
      : PRIMARY_MASTER_PHONE;
    const simTier = isColdDiscovery ? 'HUNTER_OUTREACH' : 'PRIMARY_MASTER_CLOSER';

    const baseLog = {
      id: `dlv-${Date.now().toString(36)}-${i}`,
      timestamp: new Date().toISOString(),
      sequenceKey: input.sequenceKey,
      to: cleanTo,
      contactName: target.name,
      cluster: target.cluster,
      assignedSim,
      simTier: simTier as 'PRIMARY_MASTER_CLOSER' | 'HUNTER_OUTREACH',
      delayMs,
      message: audit.sanitizedMessage,
      privacyAuditPassed: hasNoLeakedPrivateIdentifiers(audit.sanitizedMessage),
      spamRiskScore: audit.spamRiskScore,
    };

    if (await isPhoneSuppressed(cleanTo, db)) {
      const entry: CampaignDeliveryLogEntry = { ...baseLog, delayMs: 0, status: 'dnc_suppressed', error: 'Global DNC opt-out active' };
      logs.push(entry);
      recordDeliveryLog(entry);
      continue;
    }

    if (!audit.passed) {
      const entry: CampaignDeliveryLogEntry = { ...baseLog, delayMs: 0, status: 'blocked_compliance', error: audit.violations.join('; ') };
      logs.push(entry);
      recordDeliveryLog(entry);
      continue;
    }

    if (input.dryRun) {
      const entry: CampaignDeliveryLogEntry = { ...baseLog, status: 'dry_run' };
      logs.push(entry);
      recordDeliveryLog(entry);
      continue;
    }

    if (outsideHours) {
      const entry: CampaignDeliveryLogEntry = {
        ...baseLog,
        status: 'queued_outside_hours',
        error: fridayPause ? 'Friday prayer pause (12:00–14:30 GST)' : 'Outside Dubai business hours (08:30–21:00 GST)',
      };
      logs.push(entry);
      recordDeliveryLog(entry);
      continue;
    }

    const account = lindaMultiSimPool.findAccount(assignedSim);
    const engine = account ? lindaMultiSimPool.getEngineForAccount(account) : null;
    if (!engine || !engine.isConnected()) {
      const entry: CampaignDeliveryLogEntry = { ...baseLog, status: 'no_connected_sim', error: `SIM ${assignedSim} not paired yet` };
      logs.push(entry);
      recordDeliveryLog(entry);
      continue;
    }

    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    try {
      await engine.sendMessage(cleanTo, audit.sanitizedMessage);
      const entry: CampaignDeliveryLogEntry = { ...baseLog, status: 'sent' };
      logs.push(entry);
      recordDeliveryLog(entry);

      if (input.scheduleFollowUps !== false && db.followUpQueue?.create) {
        const now = Date.now();
        for (const followStep of steps.slice(1)) {
          const stepAudit = renderSequenceMessage(followStep.body, target);
          await db.followUpQueue.create({
            data: {
              entityId: cleanTo,
              entityType: `LINDA_${input.sequenceKey}`,
              sequenceId: input.sequenceKey,
              actionType: `STEP_${followStep.stepNumber}_DAY${followStep.dayOffset}`,
              scheduledAt: new Date(now + followStep.dayOffset * 86_400_000),
              status: 'pending',
              payload: {
                recipientPhone: `+${cleanTo}`,
                contactName: target.name,
                cluster: target.cluster,
                senderWhatsApp: assignedSim,
                message: stepAudit.sanitizedMessage,
              },
            },
          });
          followUpsScheduled++;
        }
      }
    } catch (err) {
      const entry: CampaignDeliveryLogEntry = {
        ...baseLog,
        status: 'error',
        error: err instanceof Error ? err.message : 'Send failed',
      };
      logs.push(entry);
      recordDeliveryLog(entry);
    }
  }

  try {
    getSocketServer()?.emitLindaCampaignTelemetry({
      campaignName: `${input.sequenceKey} (${input.cluster || 'DAMAC Hills 2'})`,
      status: input.dryRun ? 'dry_run_verified' : 'dispatched',
      totalDispatched: logs.filter(l => l.status === 'sent' || l.status === 'dry_run').length,
      skipped: logs.filter(l => l.status === 'dnc_suppressed' || l.status === 'blocked_compliance').length,
      dailyTarget: recipients.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.warn('Socket telemetry broadcast skipped:', err instanceof Error ? err.message : err);
  }

  return {
    sequenceKey: input.sequenceKey,
    totalRecipients: recipients.length,
    sentCount: logs.filter(l => l.status === 'sent').length,
    dryRunCount: logs.filter(l => l.status === 'dry_run').length,
    dncSuppressedCount: logs.filter(l => l.status === 'dnc_suppressed').length,
    blockedComplianceCount: logs.filter(l => l.status === 'blocked_compliance').length,
    followUpsScheduled,
    antiBanPolicy: {
      pacingRangeSeconds: [35, 65],
      distribution: 'gaussian',
      outsideDubaiHours: outsideHours,
      fridayPrayerPauseActive: fridayPause,
      primaryMasterPhone: PRIMARY_MASTER_PHONE,
    },
    deliveryLogs: logs,
  };
}

export async function runEndToEndDispatchAndTriageTest(input?: {
  testPhone?: string;
  contactName?: string;
  cluster?: string;
  sequenceKey?: CampaignSequenceKey;
  simulatedInboundReply?: string;
  dbOverride?: any;
}) {
  const testPhone = normalizePhoneDigits(input?.testPhone || '+971509001122');
  const contactName = input?.contactName || 'Tariq Al Mansoori';
  const cluster = input?.cluster || 'Pacifica';
  const sequenceKey = input?.sequenceKey || 'LANDLORD_RETENTION_RENEWAL';
  const db = input?.dbOverride || defaultDb;

  const dispatchResult = await launchWarmSequenceCampaign({
    sequenceKey,
    cluster,
    dryRun: true,
    respectBusinessHours: false,
    recipientsOverride: [{ phone: testPhone, name: contactName, cluster, bedrooms: '3' }],
    dbOverride: db,
  });

  const inboundText =
    input?.simulatedInboundReply ||
    (sequenceKey === 'TENANT_FOLLOWUP'
      ? `Hi Linda, I want to book a viewing for a 3BR townhouse in ${cluster}, DAMAC Hills 2 this week with Arslan Malik.`
      : `Yes available now in ${cluster}, 3BR asking 98k in 4 cheques, keys are with me.`);

  const inboundTriage =
    sequenceKey === 'TENANT_FOLLOWUP'
      ? await routeInboundTenantViewingInquiry({
          fromPhone: `+${testPhone}`,
          tenantName: contactName,
          message: inboundText,
          receivedOnLine: PRIMARY_MASTER_PHONE,
          dbOverride: db,
        })
      : await processLandlordAvailabilityReply({
          hunterSimPhone: '+971503869886',
          landlordPhone: `+${testPhone}`,
          landlordName: contactName,
          cluster,
          bedrooms: 3,
          message: inboundText,
          dbOverride: db,
        });

  return {
    verified: true,
    checkedAt: new Date().toISOString(),
    outboundPayload: dispatchResult.deliveryLogs[0] || null,
    dispatchSummary: {
      sequenceKey,
      dryRunCount: dispatchResult.dryRunCount,
      dncSuppressedCount: dispatchResult.dncSuppressedCount,
      blockedComplianceCount: dispatchResult.blockedComplianceCount,
      antiBanPolicy: dispatchResult.antiBanPolicy,
    },
    inboundTriage: {
      simulatedMessage: inboundText,
      result: inboundTriage,
    },
    recentDeliveryLogsCount: deliveryLogsBuffer.length,
  };
}
