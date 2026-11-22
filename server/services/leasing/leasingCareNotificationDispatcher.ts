/**
 * leasingCareNotificationDispatcher.ts
 * White Caves Real Estate LLC — Event-Driven Care, T-7d Cheque Alert & 90-Day RERA Renewal Dispatcher
 *
 * Dispatches warm WhatsApp (+971505760056) & Email notifications at every tenancy stage transition,
 * schedules T-7d PDC cheque alerts, and registers 90-day RERA statutory renewal notices (Law No. 33/2008).
 */

import { prisma } from '../../database.js';
import { createLogger } from '../../utils/logger.js';
import { PRIMARY_MASTER_PHONE } from '../whatsapp/leasingSimOutreachFormula.js';
import { buildStageCareNotifications, type CareNotificationEnvelope } from './leasingCareNotificationService.js';
import type { LeasingDealStage, TenancyDealState } from './tenancyLifecycleFormula.js';
import type { ChequeScheduleEntry } from './tenancyDealPersistenceAndDocsService.js';

const log = createLogger('LeasingCareDispatcher');
const defaultDb = prisma as any;

export interface DispatchedCareSummary {
  stageNotificationsQueued: number;
  chequeT7dAlertsScheduled: number;
  rera90DayNoticeScheduled: boolean;
  envelopes: CareNotificationEnvelope[];
  scheduledReminders: Array<{ id?: string; type: string; scheduledAt: string; recipientPhone: string }>;
}

export async function dispatchStageCareAndRenewalNotifications(input: {
  deal: TenancyDealState;
  stage: LeasingDealStage;
  contractEndDateIso?: string;
  cheques?: ChequeScheduleEntry[];
  dbOverride?: any;
}): Promise<DispatchedCareSummary> {
  const db = input.dbOverride || defaultDb;
  const envelopes = buildStageCareNotifications({
    stage: input.stage,
    contractMode: input.deal.contractMode,
    area: input.deal.area,
    project: input.deal.project,
    unitNumber: input.deal.unitNumber,
    landlordName: input.deal.landlordName,
    landlordPhone: input.deal.landlordPhone,
    tenantName: input.deal.tenantName,
    tenantPhone: input.deal.tenantPhone,
    annualRentAed: input.deal.annualRentAed,
    contractEndDateIso: input.contractEndDateIso,
  });

  const scheduledReminders: DispatchedCareSummary['scheduledReminders'] = [];

  for (const env of envelopes) {
    try {
      if (db.followUpQueue?.create) {
        await db.followUpQueue.create({
          data: {
            entityId: String(env.recipientPhone).replace(/\D/g, ''),
            entityType: 'LEASING_STAGE_CARE_NOTIFICATION',
            sequenceId: input.deal.dealId,
            actionType: 'WHATSAPP_AND_EMAIL_STAGE_UPDATE',
            scheduledAt: new Date(),
            status: 'pending',
            payload: {
              ...env,
              channels: ['WHATSAPP_PRIMARY_MASTER', 'EMAIL'],
            },
          },
        });
      }
    } catch (err) {
      log.warn('Stage care notification persistence skipped:', err instanceof Error ? err.message : err);
    }
  }

  let chequeT7dAlertsScheduled = 0;
  let rera90DayNoticeScheduled = false;

  if (input.stage === 'STAGE_12_ACTIVE_AND_RENEWAL_SCHEDULED') {
    for (const chq of input.cheques || []) {
      const due = new Date(chq.dueDateIso);
      if (Number.isNaN(due.getTime())) continue;
      const alertAt = new Date(due.getTime() - 7 * 24 * 60 * 60 * 1000);
      let id: string | undefined;
      try {
        if (db.followUpQueue?.create) {
          const rec = await db.followUpQueue.create({
            data: {
              entityId: String(input.deal.tenantPhone || input.deal.landlordPhone).replace(/\D/g, ''),
              entityType: 'CHEQUE_T7D_ALERT',
              sequenceId: input.deal.dealId,
              actionType: 'PDC_CHEQUE_DUE_7_DAYS',
              scheduledAt: alertAt,
              status: 'pending',
              payload: {
                senderWhatsApp: PRIMARY_MASTER_PHONE,
                tenantName: input.deal.tenantName,
                tenantPhone: input.deal.tenantPhone,
                landlordPhone: input.deal.landlordPhone,
                unit: `${input.deal.project} Unit ${input.deal.unitNumber}`,
                chequeNumber: chq.chequeNumber,
                amountAed: chq.amountAed,
                dueDateIso: chq.dueDateIso,
                message: `Friendly 7-day reminder from White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}): Cheque #${chq.chequeNumber} for AED ${chq.amountAed.toLocaleString()} (${input.deal.project} Unit ${input.deal.unitNumber}) is due on ${chq.dueDateIso.slice(0, 10)}.`,
              },
            },
          });
          id = rec?.id;
        }
      } catch (err) {
        log.warn('T-7d cheque alert persistence skipped:', err instanceof Error ? err.message : err);
      }
      chequeT7dAlertsScheduled += 1;
      scheduledReminders.push({
        id,
        type: 'CHEQUE_T7D_ALERT',
        scheduledAt: alertAt.toISOString(),
        recipientPhone: input.deal.tenantPhone || input.deal.landlordPhone,
      });
    }

    if (input.contractEndDateIso) {
      const endDate = new Date(input.contractEndDateIso);
      if (!Number.isNaN(endDate.getTime())) {
        const notice90At = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        let id: string | undefined;
        try {
          if (db.followUpQueue?.create) {
            const rec = await db.followUpQueue.create({
              data: {
                entityId: String(input.deal.landlordPhone).replace(/\D/g, ''),
                entityType: 'RERA_90D_RENEWAL_NOTICE',
                sequenceId: input.deal.dealId,
                actionType: 'RERA_STATUTORY_90DAY_NOTICE',
                scheduledAt: notice90At,
                status: 'pending',
                payload: {
                  senderWhatsApp: PRIMARY_MASTER_PHONE,
                  landlordName: input.deal.landlordName,
                  landlordPhone: input.deal.landlordPhone,
                  tenantName: input.deal.tenantName,
                  tenantPhone: input.deal.tenantPhone,
                  unit: `${input.deal.project} Unit ${input.deal.unitNumber}`,
                  contractEndDateIso: input.contractEndDateIso,
                  message: `RERA 90-Day Statutory Renewal Notice (UAE Law No. 33/2008) — White Caves Real Estate LLC (${PRIMARY_MASTER_PHONE}): Your tenancy contract for ${input.deal.project} Unit ${input.deal.unitNumber} expires on ${input.contractEndDateIso.slice(0, 10)}. Please confirm renewal terms today.`,
                },
              },
            });
            id = rec?.id;
          }
        } catch (err) {
          log.warn('90-day RERA notice persistence skipped:', err instanceof Error ? err.message : err);
        }
        rera90DayNoticeScheduled = true;
        scheduledReminders.push({
          id,
          type: 'RERA_90D_RENEWAL_NOTICE',
          scheduledAt: notice90At.toISOString(),
          recipientPhone: input.deal.landlordPhone,
        });
      }
    }
  }

  return {
    stageNotificationsQueued: envelopes.length,
    chequeT7dAlertsScheduled,
    rera90DayNoticeScheduled,
    envelopes,
    scheduledReminders,
  };
}
