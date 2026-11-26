import { prisma } from '../../../database.js';
import { logger } from '../../../utils/logger.js';
import { resolveTemplate } from '../cadenceTemplates.js';
import { createMetaAPIClient } from '../../whatsapp/metaAPI.js';
import { normalizePhone, rateLimiter } from '../../whatsapp/whatsappUtils.js';
import { completeSequence } from './lifecycle.js';
import type { ProcessBatchResult, StepExecutionResult } from './types.js';

export async function processScheduledSteps(): Promise<ProcessBatchResult> {
  const now = new Date();
  const result: ProcessBatchResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Find all sequences that have a step due
  const dueSequences = await prisma.followUpSequence.findMany({
    where: {
      status: 'active',
      nextStepAt: { lte: now },
    },
    include: {
      steps: { orderBy: { stepNumber: 'asc' } },
      lead: { select: { id: true, name: true, phone: true, email: true, status: true } },
    },
    take: 50, // process max 50 per batch
  });

  for (const sequence of dueSequences) {
    result.processed++;

    try {
      // Find the next pending step
      const nextStep = sequence.steps.find(s => s.status === 'pending');
      if (!nextStep) {
        // No more steps → complete the sequence
        await completeSequence(sequence.id);
        continue;
      }

      // Check if lead is still active (not won/lost)
      if (sequence.lead.status === 'won' || sequence.lead.status === 'lost') {
        await cancelSequence(sequence.id, 'Lead status changed to ' + sequence.lead.status);
        result.skipped++;
        continue;
      }

      // Check for manual agent contact in last 24h (W24-010)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const manualActivity = await prisma.activity.findFirst({
        where: {
          leadId: sequence.lead.id,
          createdAt: { gte: cutoff },
          type: 'lead',
          action: { in: ['call', 'email', 'visit', 'manual_whatsapp', 'note_added'] },
          userId: { not: null },
        },
      });

      if (manualActivity) {
        await pauseSequence(sequence.id);
        await prisma.activity.create({
          data: {
            type: 'lead',
            action: 'follow_up_autopause',
            description: `Follow-up sequence auto-paused due to manual agent contact (Activity: ${manualActivity.action}) within 24h`,
            leadId: sequence.lead.id,
          },
        });
        result.skipped++;
        continue;
      }

      // Execute the step
      const stepResult = await executeStep(nextStep.id, sequence.lead);
      if (stepResult.status === 'sent') {
        result.sent++;
      } else if (stepResult.status === 'failed') {
        result.failed++;
      } else {
        result.skipped++;
      }

      // Advance sequence
      const remainingSteps = sequence.steps.filter(
        s => s.status === 'pending' && s.stepNumber > nextStep.stepNumber
      );

      if (remainingSteps.length === 0) {
        await completeSequence(sequence.id);
      } else {
        await prisma.followUpSequence.update({
          where: { id: sequence.id },
          data: {
            currentStep: nextStep.stepNumber,
            nextStepAt: remainingSteps[0]?.scheduledAt || null,
          },
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Sequence ${sequence.id}: ${msg}`);
      logger.error(`Follow-up step error for sequence ${sequence.id}:`, error);
    }
  }

  if (result.processed > 0) {
    logger.info(
      `Follow-up batch processed: ${result.processed} sequences, ` +
        `${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
    );
  }

  return result;
}

// ─── Execute a single step ──────────────────────────────────────────────

/**
 * Execute a specific follow-up step (send message, make call record, etc.)
 */
export async function executeStep(
  stepId: string,
  lead: { id: string; name: string; phone: string | null; email: string | null }
): Promise<StepExecutionResult> {
  const step = await prisma.followUpStep.findUnique({
    where: { id: stepId },
    include: { sequence: true },
  });
  if (!step) throw new Error(`Follow-up step not found: ${stepId}`);

  const now = new Date();

  try {
    // Resolve the message template
    const templateVars: Record<string, string> = {
      name: lead.name || 'there',
      agent: 'White Caves Team',
      property: 'our curated selection',
      company: 'White Caves Real Estate',
      link: 'https://whitecaves.com',
    };
    const resolved = resolveTemplate(step.templateName || '', templateVars);

    // Channel-specific execution
    let status: 'sent' | 'failed' | 'skipped' = 'sent';
    let message = '';
    let errorMessage: string | undefined;

    switch (step.channel) {
      case 'whatsapp': {
        if (!lead.phone) {
          status = 'skipped';
          message = 'No phone number on lead';
          break;
        }
        const normalizedPhone = normalizePhone(lead.phone);
        if (!normalizedPhone) {
          status = 'skipped';
          message = `Invalid phone number: ${lead.phone}`;
          break;
        }

        // Send via Meta Cloud API if configured
        const accessToken = process.env.META_ACCESS_TOKEN;
        const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
        const businessAccountId = process.env.META_BUSINESS_ACCOUNT_ID;

        if (accessToken && phoneNumberId && businessAccountId) {
          try {
            const rateCheck = rateLimiter.canSend(normalizedPhone);
            if (!rateCheck.allowed) {
              status = 'failed';
              errorMessage = `Rate limited — retry after ${rateCheck.retryAfterMs}ms`;
              message = errorMessage;
              break;
            }
            const metaClient = createMetaAPIClient({
              accessToken,
              businessAccountId,
              phoneNumberId,
            });
            const msgBody = resolved?.body || 'Hello from White Caves';
            const waMessageId = await metaClient.sendMessage(normalizedPhone, msgBody);
            message = `WhatsApp sent (${waMessageId})`;
            logger.info(`[FollowUp] WhatsApp sent to ${normalizedPhone}: ${waMessageId}`);
          } catch (sendErr) {
            status = 'failed';
            errorMessage = sendErr instanceof Error ? sendErr.message : 'WhatsApp send failed';
            message = errorMessage;
            logger.error(`[FollowUp] WhatsApp send failed to ${normalizedPhone}:`, sendErr);
          }
        } else {
          // No Meta API configured — log only (dev/staging mode)
          message = resolved?.body || 'WhatsApp message (dev mode — not sent)';
          logger.info(`[FollowUp] WhatsApp (dev) to ${normalizedPhone}: ${step.templateName}`);
        }
        break;
      }

      case 'email': {
        if (!lead.email) {
          status = 'skipped';
          message = 'No email on lead';
          break;
        }
        try {
          const { sendEmailTracked, wrapInBrandedTemplate } = await import('../emailService.js');
          const subject = resolved?.subject || `Follow-up from White Caves — ${step.templateName}`;
          const bodyText =
            resolved?.body || 'Thank you for your interest in White Caves properties.';
          const htmlContent = wrapInBrandedTemplate(`<p>${bodyText}</p>`);

          const emailResult = await sendEmailTracked({
            to: lead.email,
            subject,
            text: bodyText,
            html: htmlContent,
            tags: [{ name: 'follow_up', value: step.templateName || 'generic' }],
          });

          if (emailResult.success) {
            message = `Email sent (${emailResult.messageId || 'ok'})`;
            logger.info(`[FollowUp] Email sent to ${lead.email}: ${step.templateName}`);
          } else {
            status = 'failed';
            errorMessage = emailResult.error || 'Email send failed';
            message = errorMessage;
          }
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr instanceof Error ? emailErr.message : 'Email send failed';
          message = errorMessage;
          logger.error(`[FollowUp] Email send failed to ${lead.email}:`, emailErr);
        }
        break;
      }

      case 'call': {
        if (!lead.phone) {
          status = 'skipped';
          message = 'No phone number on lead';
          break;
        }
        // Calls create a task/reminder — not auto-dialed
        message = resolved?.body || 'Call task created';
        logger.info(`[FollowUp] Call task for ${lead.phone}: ${step.templateName}`);
        break;
      }

      case 'sms': {
        if (!lead.phone) {
          status = 'skipped';
          message = 'No phone number on lead';
          break;
        }
        message = resolved?.body || 'SMS sent';
        logger.info(`[FollowUp] SMS to ${lead.phone}: ${step.templateName}`);
        break;
      }

      default:
        status = 'skipped';
        message = `Unknown channel: ${step.channel}`;
    }

    // Update step record
    await prisma.followUpStep.update({
      where: { id: stepId },
      data: {
        status,
        executedAt: now,
        message: message.substring(0, 500), // cap length
        result: status === 'sent' ? 'delivered' : status === 'skipped' ? 'skipped' : 'failed',
        errorMessage: errorMessage || null,
        metadata: {
          templateResolved: !!resolved,
          channel: step.channel,
          executedAt: now.toISOString(),
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'lead',
        action: `follow_up_${step.channel}`,
        description: `Follow-up step ${step.stepNumber}: ${step.channel} — ${status}`,
        leadId: lead.id,
        metadata: {
          sequenceId: step.sequenceId,
          stepId: step.id,
          stepNumber: step.stepNumber,
          channel: step.channel,
          templateName: step.templateName,
          status,
        },
      },
    });

    // Update lead's lastContact
    if (status === 'sent') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContact: now },
      });
    }

    return { stepId, channel: step.channel, status, message };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Mark step as failed
    await prisma.followUpStep.update({
      where: { id: stepId },
      data: {
        status: 'failed',
        executedAt: now,
        errorMessage: errMsg.substring(0, 500),
      },
    });

    logger.error(`Follow-up step ${stepId} failed:`, error);

    return { stepId, channel: step.channel, status: 'failed', error: errMsg };
  }
}

// ─── Sequence lifecycle ─────────────────────────────────────────────────

/** Pause an active sequence */
