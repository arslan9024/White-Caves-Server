import { prisma } from '../../../database.js';
import { logger } from '../../../utils/logger.js';
import { getCadenceForTier } from '../cadenceTemplates.js';
import type { SequenceSummary } from './types.js';

export async function pauseSequence(sequenceId: string): Promise<void> {
  const sequence = await prisma.followUpSequence.findUnique({ where: { id: sequenceId } });
  if (!sequence) throw new Error(`Sequence not found: ${sequenceId}`);
  if (sequence.status !== 'active') throw new Error(`Cannot pause ${sequence.status} sequence`);

  await prisma.followUpSequence.update({
    where: { id: sequenceId },
    data: { status: 'paused', pausedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      type: 'lead',
      action: 'follow_up_paused',
      description: `Follow-up sequence paused at step ${sequence.currentStep}`,
      leadId: sequence.leadId,
      metadata: { sequenceId },
    },
  });

  logger.info(`Follow-up sequence ${sequenceId} paused`);
}

/** Resume a paused sequence */
export async function resumeSequence(sequenceId: string): Promise<void> {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { where: { status: 'pending' }, orderBy: { stepNumber: 'asc' }, take: 1 } },
  });
  if (!sequence) throw new Error(`Sequence not found: ${sequenceId}`);
  if (sequence.status !== 'paused') throw new Error(`Cannot resume ${sequence.status} sequence`);

  const nextPending = sequence.steps[0];
  const now = new Date();

  // Reschedule the next pending step from now (preserving original delays)
  if (nextPending) {
    const cadence = getCadenceForTier(sequence.cadenceType);
    const stepDef = cadence.steps.find(s => s.stepNumber === nextPending.stepNumber);
    const newScheduledAt = new Date(now.getTime() + (stepDef?.delayMs || 3600000));

    await prisma.followUpStep.update({
      where: { id: nextPending.id },
      data: { scheduledAt: newScheduledAt },
    });

    await prisma.followUpSequence.update({
      where: { id: sequenceId },
      data: { status: 'active', pausedAt: null, nextStepAt: newScheduledAt },
    });
  } else {
    await completeSequence(sequenceId);
  }

  await prisma.activity.create({
    data: {
      type: 'lead',
      action: 'follow_up_resumed',
      description: `Follow-up sequence resumed`,
      leadId: sequence.leadId,
      metadata: { sequenceId },
    },
  });

  logger.info(`Follow-up sequence ${sequenceId} resumed`);
}

/** Cancel a sequence */
export async function cancelSequence(sequenceId: string, reason?: string): Promise<void> {
  const sequence = await prisma.followUpSequence.findUnique({ where: { id: sequenceId } });
  if (!sequence) throw new Error(`Sequence not found: ${sequenceId}`);
  if (sequence.status === 'completed' || sequence.status === 'cancelled') {
    throw new Error(`Sequence already ${sequence.status}`);
  }

  await prisma.followUpSequence.update({
    where: { id: sequenceId },
    data: { status: 'cancelled', completedAt: new Date() },
  });

  // Cancel all pending steps
  await prisma.followUpStep.updateMany({
    where: { sequenceId, status: 'pending' },
    data: { status: 'skipped' },
  });

  await prisma.activity.create({
    data: {
      type: 'lead',
      action: 'follow_up_cancelled',
      description: `Follow-up sequence cancelled${reason ? `: ${reason}` : ''}`,
      leadId: sequence.leadId,
      metadata: { sequenceId, reason },
    },
  });

  logger.info(`Follow-up sequence ${sequenceId} cancelled: ${reason || 'no reason'}`);
}

/** Complete a sequence (all steps done) */
export async function completeSequence(sequenceId: string): Promise<void> {
  const sequence = await prisma.followUpSequence.findUnique({ where: { id: sequenceId } });
  if (!sequence) return;

  await prisma.followUpSequence.update({
    where: { id: sequenceId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      nextStepAt: null,
      currentStep: sequence.totalSteps,
    },
  });

  await prisma.activity.create({
    data: {
      type: 'lead',
      action: 'follow_up_completed',
      description: `Follow-up sequence completed (${sequence.totalSteps} steps)`,
      leadId: sequence.leadId,
      metadata: { sequenceId, cadenceType: sequence.cadenceType },
    },
  });

  logger.info(`Follow-up sequence ${sequenceId} completed`);
}

// ─── Query helpers ──────────────────────────────────────────────────────

/** Get full sequence summary with steps */
export async function getSequenceSummary(sequenceId: string): Promise<SequenceSummary | null> {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  });
  if (!sequence) return null;

  return {
    id: sequence.id,
    cadenceType: sequence.cadenceType,
    status: sequence.status,
    currentStep: sequence.currentStep,
    totalSteps: sequence.totalSteps,
    startedAt: sequence.startedAt,
    nextStepAt: sequence.nextStepAt,
    completedAt: sequence.completedAt,
    steps: sequence.steps.map(s => ({
      stepNumber: s.stepNumber,
      channel: s.channel,
      status: s.status,
      scheduledAt: s.scheduledAt,
      executedAt: s.executedAt,
      result: s.result,
    })),
  };
}

/** Get all sequences for a specific lead */
export async function getLeadSequences(leadId: string): Promise<SequenceSummary[]> {
  const sequences = await prisma.followUpSequence.findMany({
    where: { leadId },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return sequences.map(seq => ({
    id: seq.id,
    cadenceType: seq.cadenceType,
    status: seq.status,
    currentStep: seq.currentStep,
    totalSteps: seq.totalSteps,
    startedAt: seq.startedAt,
    nextStepAt: seq.nextStepAt,
    completedAt: seq.completedAt,
    steps: seq.steps.map(s => ({
      stepNumber: s.stepNumber,
      channel: s.channel,
      status: s.status,
      scheduledAt: s.scheduledAt,
      executedAt: s.executedAt,
      result: s.result,
    })),
  }));
}

/** Get dashboard stats for all follow-ups */
export async function getFollowUpStats(): Promise<{
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
  totalStepsSent: number;
  totalStepsFailed: number;
}> {
  const [active, paused, completed, cancelled, sentSteps, failedSteps] = await Promise.all([
    prisma.followUpSequence.count({ where: { status: 'active' } }),
    prisma.followUpSequence.count({ where: { status: 'paused' } }),
    prisma.followUpSequence.count({ where: { status: 'completed' } }),
    prisma.followUpSequence.count({ where: { status: 'cancelled' } }),
    prisma.followUpStep.count({ where: { status: 'sent' } }),
    prisma.followUpStep.count({ where: { status: 'failed' } }),
  ]);

  return {
    active,
    paused,
    completed,
    cancelled,
    totalStepsSent: sentSteps,
    totalStepsFailed: failedSteps,
  };
}
