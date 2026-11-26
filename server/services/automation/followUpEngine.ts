import { prisma } from '../../database.js';
import { logger } from '../../utils/logger.js';
import { getCadenceForTier } from './cadenceTemplates.js';
import { resolveCadenceFromDynamicRules, type StartSequenceResult } from './followUp/types.js';
export type { StartSequenceResult, StepExecutionResult, SequenceSummary, ProcessBatchResult } from './followUp/types.js';
export { processScheduledSteps, executeStep } from './followUp/stepExecutor.js';
export { pauseSequence, resumeSequence, cancelSequence, getSequenceSummary, getLeadSequences, getFollowUpStats } from './followUp/lifecycle.js';

export async function startSequence(
  leadId: string,
  options?: { cadenceType?: string; createdById?: string }
): Promise<StartSequenceResult> {
  // 1. Fetch lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, scoreTier: true, status: true, source: true, dealType: true },
  });
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  // 2. Check for active sequences on this lead
  const existingActive = await prisma.followUpSequence.findFirst({
    where: { leadId, status: { in: ['active', 'paused'] } },
  });
  if (existingActive) {
    throw new Error(
      `Lead ${leadId} already has an active sequence (${existingActive.id}). ` +
        `Cancel or complete it before starting a new one.`
    );
  }

  // 3. Determine cadence
  const dynamicCadence = await resolveCadenceFromDynamicRules({
    id: lead.id,
    scoreTier: lead.scoreTier,
    source: lead.source,
    dealType: lead.dealType,
  });
  const cadenceType =
    options?.cadenceType || dynamicCadence?.cadenceType || lead.scoreTier || 'cold';
  const cadence: CadenceTemplate = options?.cadenceType
    ? getCadenceForTier(options.cadenceType)
    : dynamicCadence || getCadenceForTier(cadenceType);
  const now = new Date();

  // 4. Calculate step schedules (cumulative from now)
  let cumulativeDelay = 0;
  const stepData = cadence.steps.map((step: CadenceStep) => {
    cumulativeDelay += step.delayMs;
    return {
      stepNumber: step.stepNumber,
      channel: step.channel,
      status: 'pending' as const,
      scheduledAt: new Date(now.getTime() + cumulativeDelay),
      templateName: step.templateName,
    };
  });

  // 5. Create sequence + steps in a transaction
  const sequence = await prisma.followUpSequence.create({
    data: {
      cadenceType,
      status: 'active',
      currentStep: 0,
      totalSteps: cadence.totalSteps,
      startedAt: now,
      nextStepAt: stepData[0]?.scheduledAt || null,
      leadId,
      createdById: options?.createdById || null,
      steps: {
        create: stepData,
      },
    },
    include: { steps: true },
  });

  // 6. Log activity
  await prisma.activity.create({
    data: {
      type: 'lead',
      action: 'follow_up_started',
      description: `Follow-up sequence started: ${cadence.name} (${cadence.totalSteps} steps)`,
      leadId,
      userId: options?.createdById || null,
      metadata: {
        sequenceId: sequence.id,
        cadenceType,
        totalSteps: cadence.totalSteps,
        firstStepAt: stepData[0]?.scheduledAt?.toISOString(),
      },
    },
  });

  logger.info(`Follow-up sequence started for lead ${leadId}: ${cadence.name}`);

  return {
    sequenceId: sequence.id,
    cadenceType,
    totalSteps: cadence.totalSteps,
    firstStepAt: stepData[0]?.scheduledAt || now,
    leadId,
  };
}

// ─── Process scheduled steps ────────────────────────────────────────────

/**
 * Process all follow-up steps that are due.
 * Called by the scheduler on interval (e.g., every 5 min).
 *
 * 1. Find active sequences where nextStepAt <= now
 * 2. For each, execute the current step
 * 3. Advance the sequence or complete it
 */
