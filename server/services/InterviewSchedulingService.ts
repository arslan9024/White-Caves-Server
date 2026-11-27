// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { normalizeInterviewSchedule } from './recruitmentRecordMapper.js';
import { InterviewSlotsHelper } from './interview/interviewSlots.js';
import { InterviewMessagingHelper } from './interview/interviewMessaging.js';
import { InterviewActionsHelper } from './interview/interviewActions.js';

const prisma = new PrismaClient();

export class InterviewSchedulingService extends InterviewSlotsHelper {
  static async createInterviewSession(candidateId, jobId, interviewerIds, slotOptions) {
    try {
      // Find candidate and job
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!candidate || !job) {
        throw new Error('Candidate or Job not found');
      }

      // Create interview session
      const session = normalizeInterviewSchedule(
        await prisma.interviewSchedule.create({
          data: {
            candidate_id: candidateId,
            job_id: jobId,
            session_status: 'pending_scheduling',
            interview_type: 'hr',
            interviewer_ids: interviewerIds,
            available_slots: slotOptions,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      );

      // Send WhatsApp with available slots
      await this.sendInterviewInvitation(candidate, job, session, slotOptions);

      return {
        success: true,
        sessionId: session.id,
        message: 'Interview invitation sent via WhatsApp',
      };
    } catch (error) {
      console.error('❌ Error creating interview session:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async processInterviewResponse(waId, phoneNumber, messageContent, sessionId) {
    try {
      // Detect intent from message
      const intent = this.detectInterviewIntent(messageContent);

      // Get session
      const session = normalizeInterviewSchedule(
        await prisma.interviewSchedule.findUnique({
          where: { id: sessionId },
          include: {
            candidate: true,
            job: true,
          },
        })
      );

      if (!session) {
        throw new Error('Interview session not found');
      }

      let result;

      switch (intent.type) {
        case 'slot_selected':
          result = await this.bookSelectedSlot(session, intent.slotIndex, phoneNumber);
          break;

        case 'reschedule':
          result = await this.offerRescheduleSlots(session, phoneNumber);
          break;

        case 'decline':
          result = await this.declineInterview(session, phoneNumber, intent.reason);
          break;

        case 'interested':
          result = await this.sendTimeSlotOptions(session, phoneNumber);
          break;

        case 'unsure':
        case 'question':
          result = await this.sendSupportMessage(session, phoneNumber, messageContent);
          break;

        default:
          result = await this.sendGuideMessage(session, phoneNumber);
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing interview response:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect interview-related intent from candidate message
   */

  static async sendInterviewInvitation(candidate, job, session, slots) {
    return InterviewMessagingHelper.prototype.sendInterviewInvitation.call(this, candidate, job, session, slots);
  }
  static async sendTimeSlotOptions(session, phoneNumber) {
    return InterviewMessagingHelper.prototype.sendTimeSlotOptions.call(this, session, phoneNumber);
  }
  static async sendSupportMessage(session, phoneNumber, questionContent) {
    return InterviewMessagingHelper.prototype.sendSupportMessage.call(this, session, phoneNumber, questionContent);
  }
  static async sendGuideMessage(session, phoneNumber) {
    return InterviewMessagingHelper.prototype.sendGuideMessage.call(this, session, phoneNumber);
  }
  static async sendInterviewReminder(interviewId) {
    return InterviewMessagingHelper.prototype.sendInterviewReminder.call(this, interviewId);
  }
  static detectInterviewIntent(message) {
    return InterviewActionsHelper.prototype.detectInterviewIntent.call(this, message);
  }
  static async bookSelectedSlot(session, slotIndex, phoneNumber) {
    return InterviewActionsHelper.prototype.bookSelectedSlot.call(this, session, slotIndex, phoneNumber);
  }
  static async offerRescheduleSlots(session, phoneNumber) {
    return InterviewActionsHelper.prototype.offerRescheduleSlots.call(this, session, phoneNumber);
  }
  static async declineInterview(session, phoneNumber, reason) {
    return InterviewActionsHelper.prototype.declineInterview.call(this, session, phoneNumber, reason);
  }

  static async getInterviewStats(jobId) {
    try {
      const interviews = await prisma.interview.findMany({
        where: { job_id: jobId },
        include: {
          candidate: true,
        },
      });

      const sessions = await prisma.interviewSchedule.findMany({
        where: { job_id: jobId },
      });

      return {
        total_sessions: sessions.length,
        scheduled: sessions.filter(s => s.session_status === 'scheduled').length,
        pending: sessions.filter(s => s.session_status === 'pending_scheduling').length,
        declined: sessions.filter(s => s.session_status === 'declined').length,
        completed: interviews.filter(i => i.status === 'completed').length,
        no_show: interviews.filter(i => i.status === 'no_show').length,
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return null;
    }
  }
}

export default InterviewSchedulingService;
