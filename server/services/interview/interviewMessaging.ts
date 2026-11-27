// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import MessageTemplateService from '../MessageTemplateService.js';
import { WhatsAppMessage, WhatsAppContact } from '../../lib/database.js';

const prisma = new PrismaClient();

export class InterviewMessagingHelper {
  async sendInterviewInvitation(candidate, job, session, slots) {
    try {
      // Format slots for display
      const slotsText = slots.map((slot, i) => `${i + 1}. ${this.formatSlot(slot)}`).join('\n');

      const variables = {
        candidate_name: candidate.first_name || candidate.name,
        job_title: job.title,
        interview_type: 'Technical Assessment',
        interview_duration: '45',
        available_times: slotsText,
        meeting_link: `https://zoom.us/j/${this.generateMeetingId()}`,
        next_action: 'Reply with number (1-3) to book your slot',
      };

      // Render message using template
      const message = MessageTemplateService.render('interview_invitation', variables);

      // Get or create WhatsApp contact
      const phone = this.formatPhoneForWhatsApp(candidate.whatsapp_phone || candidate.phone);

      let contact = await WhatsAppContact.findOne({ phoneNumber: phone });
      if (!contact) {
        contact = new WhatsAppContact({
          phoneNumber: phone,
          waId: `${phone.replace('+', '')}@c.us`,
          name: candidate.first_name || candidate.name,
          conversationStatus: 'active',
        });
        await contact.save();
      }

      // Store message in database
      const messageRecord = new WhatsAppMessage({
        waId: contact.waId,
        phoneNumber: phone,
        direction: 'outgoing',
        messageType: 'interview_invitation',
        content: message,
        status: 'pending',
        metadata: {
          sessionId: session.id,
          candidateId: candidate.id,
          jobId: job.id,
          slots: slots,
        },
        createdAt: new Date(),
      });

      await messageRecord.save();

      console.log(`✅ Interview invitation sent to ${phone}`);
      return {
        success: true,
        messageId: messageRecord._id,
        phone,
      };
    } catch (error) {
      console.error('❌ Error sending interview invitation:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process candidate response to interview invitation
   * Detects intent (schedule, interested, reschedule, decline)
   */
  async sendTimeSlotOptions(session, phoneNumber) {
    try {
      const slots = this.generateTimeSlots(5);

      const slotsText = slots.map((slot, i) => `${i + 1}. ${this.formatSlot(slot)}`).join('\n');

      const optionsMessage = `
Great! Here are your available interview slots:

${slotsText}

Reply with your preferred number (1-5) to confirm.
      `.trim();

      // Store message
      const messageRecord = new WhatsAppMessage({
        waId: `${phoneNumber.replace('+', '')}@c.us`,
        phoneNumber: phoneNumber,
        direction: 'outgoing',
        messageType: 'slot_options',
        content: optionsMessage,
        status: 'sent',
        metadata: {
          sessionId: session.id,
          slots,
        },
        createdAt: new Date(),
      });

      await messageRecord.save();

      return {
        success: true,
        messageId: messageRecord._id,
        slots,
      };
    } catch (error) {
      console.error('❌ Error sending slot options:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send support message for questions
   */
  async sendSupportMessage(session, phoneNumber, questionContent) {
    try {
      const supportMessage = `
📞 Good question! 

For more details about the ${session.job.title} role, you can:
• Reply to this chat
• Call our HR team at +971-XX-XXX-XXXX
• Email careers@company.com

Or proceed with scheduling by replying with your preferred time slot number.
      `.trim();

      // Store message
      const messageRecord = new WhatsAppMessage({
        waId: `${phoneNumber.replace('+', '')}@c.us`,
        phoneNumber: phoneNumber,
        direction: 'outgoing',
        messageType: 'support',
        content: supportMessage,
        status: 'sent',
        metadata: {
          sessionId: session.id,
          originalQuestion: questionContent,
        },
        createdAt: new Date(),
      });

      await messageRecord.save();

      return {
        success: true,
        messageId: messageRecord._id,
      };
    } catch (error) {
      console.error('❌ Error sending support message:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send guide message when intent is unclear
   */
  async sendGuideMessage(session, phoneNumber) {
    try {
      const guideMessage = `
😊 I didn't quite understand. Here's what you can do:

1️⃣ Reply with a number (1-5) to select a time slot
2️⃣ Reply "RESCHEDULE" to see other times
3️⃣ Reply "DECLINE" if you're not interested
4️⃣ Reply "?" for questions

Which would you like to do?
      `.trim();

      // Store message
      const messageRecord = new WhatsAppMessage({
        waId: `${phoneNumber.replace('+', '')}@c.us`,
        phoneNumber: phoneNumber,
        direction: 'outgoing',
        messageType: 'guide',
        content: guideMessage,
        status: 'sent',
        metadata: {
          sessionId: session.id,
        },
        createdAt: new Date(),
      });

      await messageRecord.save();

      return {
        success: true,
        messageId: messageRecord._id,
      };
    } catch (error) {
      console.error('❌ Error sending guide message:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send interview reminder 24 hours before
   */
  async sendInterviewReminder(interviewId) {
    try {
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          candidate: true,
          job: true,
        },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      const phone = this.formatPhoneForWhatsApp(
        interview.candidate.whatsapp_phone || interview.candidate.phone
      );

      const reminderMessage = `
⏰ Reminder: Your Interview is Tomorrow!

Role: ${interview.job.title}
Date & Time: ${this.formatDateTime(interview.scheduled_at)}
Duration: 45 minutes
Platform: Zoom

Meeting instructions will be provided by your interviewer.

Reply CONFIRM to let us know you're ready!
      `.trim();

      // Store message
      const messageRecord = new WhatsAppMessage({
        waId: `${phone.replace('+', '')}@c.us`,
        phoneNumber: phone,
        direction: 'outgoing',
        messageType: 'interview_reminder',
        content: reminderMessage,
        status: 'sent',
        metadata: {
          interviewId,
          reminderType: 'day_before',
        },
        createdAt: new Date(),
      });

      await messageRecord.save();

      // Update interview record
      await prisma.interviewSchedule.updateMany({
        where: {
          candidate_id: interview.candidate_id,
          job_id: interview.job_id,
          interview_date: interview.scheduled_at,
        },
        data: {
          reminder_sent_at: new Date(),
        },
      });

      console.log(`🔔 Reminder sent for interview ${interviewId}`);

      return {
        success: true,
        messageId: messageRecord._id,
        phone,
      };
    } catch (error) {
      console.error('❌ Error sending reminder:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate available time slots (next 5 business days)
   */
}
