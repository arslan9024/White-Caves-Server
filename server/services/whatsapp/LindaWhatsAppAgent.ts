import {
  AgentIdentity,
  AgentTaskResult,
  BaseAIAgent,
  BaseAIAgentConfig,
} from '../ai/BaseAIAgent';

export type LindaTaskType =
  | 'send_campaign'
  | 'schedule_followup'
  | 'analyze_conversation';

export interface SendCampaignPayload {
  campaignId: string;
  recipients: string[];
  templateName: string;
}

export interface ScheduleFollowupPayload {
  contactPhone: string;
  delayMinutes: number;
  message: string;
}

export interface AnalyzeConversationPayload {
  conversationId: string;
  messages: Array<{ sender: 'lead' | 'agent'; text: string }>;
}

const DEFAULT_LINDA_IDENTITY: AgentIdentity = {
  id: 'linda-whatsapp-agent',
  name: 'Linda',
  department: 'DEPT-02',
  supervisorChain: {
    md: 'MD-01',
    coo: 'AI Zoe',
    director: 'DIR-02',
    manager: 'MGR-02-1',
    assistantManager: 'AMGR-02-1-01',
    supervisor: 'SUP-02-1-01-1',
  },
};

/**
 * Linda WhatsApp AI Agent.
 * Handles WhatsApp campaign dispatch, follow-up scheduling, and conversation
 * analysis with non-blocking async queue/concurrency support.
 */
export class LindaWhatsAppAgent extends BaseAIAgent {
  private readonly pendingQueue: Array<() => Promise<void>> = [];
  private isDraining = false;

  constructor(
    identity: AgentIdentity = DEFAULT_LINDA_IDENTITY,
    config: BaseAIAgentConfig = {},
  ) {
    super(identity, config);
  }

  getQueueLength(): number {
    return this.pendingQueue.length;
  }

  /**
   * Enqueues a task into the non-blocking async queue and resolves with its
   * AgentTaskResult once processed.
   */
  enqueueTask<TInput, TOutput>(
    taskType: LindaTaskType | string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>> {
    return new Promise((resolve) => {
      this.pendingQueue.push(async () => {
        const result = await this.executeTask<TInput, TOutput>(taskType, payload);
        resolve(result);
      });
      void this.drainQueue();
    });
  }

  async executeTask<TInput, TOutput>(
    taskType: string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>> {
    return this.runTask<TOutput>(taskType, async () => {
      switch (taskType as LindaTaskType) {
        case 'send_campaign':
          return this.handleSendCampaign(
            payload as unknown as SendCampaignPayload,
          ) as unknown as TOutput;
        case 'schedule_followup':
          return this.handleScheduleFollowup(
            payload as unknown as ScheduleFollowupPayload,
          ) as unknown as TOutput;
        case 'analyze_conversation':
          return this.handleAnalyzeConversation(
            payload as unknown as AnalyzeConversationPayload,
          ) as unknown as TOutput;
        default:
          throw new Error(`Unsupported LindaWhatsAppAgent task: ${taskType}`);
      }
    });
  }

  private async handleSendCampaign(payload: SendCampaignPayload) {
    if (!payload?.campaignId || !Array.isArray(payload.recipients)) {
      throw new Error('Invalid send_campaign payload');
    }
    return {
      campaignId: payload.campaignId,
      templateName: payload.templateName,
      queuedCount: payload.recipients.length,
      status: 'queued',
    };
  }

  private async handleScheduleFollowup(payload: ScheduleFollowupPayload) {
    if (!payload?.contactPhone || typeof payload.delayMinutes !== 'number') {
      throw new Error('Invalid schedule_followup payload');
    }
    const scheduledFor = new Date(
      Date.now() + payload.delayMinutes * 60_000,
    ).toISOString();
    return {
      contactPhone: payload.contactPhone,
      scheduledFor,
      status: 'scheduled',
    };
  }

  private async handleAnalyzeConversation(payload: AnalyzeConversationPayload) {
    if (!payload?.conversationId || !Array.isArray(payload.messages)) {
      throw new Error('Invalid analyze_conversation payload');
    }
    const leadMessages = payload.messages.filter((m) => m.sender === 'lead');
    const combinedText = leadMessages.map((m) => m.text.toLowerCase()).join(' ');
    const intent = combinedText.includes('viewing')
      ? 'viewing_request'
      : combinedText.includes('price') || combinedText.includes('rent')
        ? 'pricing_inquiry'
        : 'general_inquiry';

    return {
      conversationId: payload.conversationId,
      messageCount: payload.messages.length,
      intent,
    };
  }

  private async drainQueue(): Promise<void> {
    if (this.isDraining) {
      return;
    }
    this.isDraining = true;
    try {
      while (this.pendingQueue.length > 0) {
        const next = this.pendingQueue.shift();
        if (next) {
          await next();
        }
      }
    } finally {
      this.isDraining = false;
    }
  }
}
