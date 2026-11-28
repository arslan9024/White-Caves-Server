import { describe, expect, it } from 'vitest';
import {
  AgentIdentity,
  AgentTaskResult,
  BaseAIAgent,
  BaseAIAgentConfig,
} from '../BaseAIAgent';
import { LindaWhatsAppAgent } from '../../whatsapp/LindaWhatsAppAgent';
import { DaisyLeasingAgent } from '../../daisy/DaisyLeasingAgent';

class TestAIAgent extends BaseAIAgent {
  constructor(identity?: AgentIdentity, config?: BaseAIAgentConfig) {
    super(
      identity ?? {
        id: 'test-agent-01',
        name: 'Test Agent',
        department: 'DEPT-01',
        supervisorChain: {
          md: 'MD-01',
          coo: 'AI Zoe',
          director: 'DIR-01',
          manager: 'MGR-01-1',
          assistantManager: 'AMGR-01-1-01',
          supervisor: 'SUP-01-1-01-1',
        },
      },
      config,
    );
  }

  async executeTask<TInput, TOutput>(
    taskType: string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>> {
    return this.runTask<TOutput>(taskType, async () => {
      if (taskType === 'flaky') {
        const state = payload as unknown as { failTimes: number; calls: number };
        state.calls += 1;
        if (state.calls <= state.failTimes) {
          throw new Error('Transient failure');
        }
        return { recovered: true, calls: state.calls } as unknown as TOutput;
      }
      if (taskType === 'always_fail') {
        throw new Error('Permanent failure');
      }
      return payload as unknown as TOutput;
    });
  }
}

describe('BaseAIAgent', () => {
  it('retries transient failures with exponential backoff and records telemetry', async () => {
    const agent = new TestAIAgent(undefined, { maxRetries: 2, baseDelayMs: 1 });
    const state = { failTimes: 2, calls: 0 };

    const res = await agent.executeTask<typeof state, { recovered: boolean; calls: number }>(
      'flaky',
      state,
    );

    expect(res.success).toBe(true);
    expect(res.attempts).toBe(3);
    expect(res.data?.recovered).toBe(true);

    const telemetry = agent.getTelemetry();
    expect(telemetry.tasksExecuted).toBe(1);
    expect(telemetry.tasksFailed).toBe(0);
    expect(telemetry.lastExecutedAt).not.toBeNull();
    expect(telemetry.activeSlots).toBe(0);
  });

  it('records failed telemetry when retries are exhausted', async () => {
    const agent = new TestAIAgent(undefined, { maxRetries: 1, baseDelayMs: 1 });
    const res = await agent.executeTask('always_fail', {});

    expect(res.success).toBe(false);
    expect(res.error).toContain('Permanent failure');
    expect(agent.getTelemetry().tasksFailed).toBe(1);
  });

  it('enforces concurrency slots and rate limits', () => {
    const agent = new TestAIAgent(undefined, {
      maxConcurrentSlots: 2,
      maxRequestsPerWindow: 2,
      rateLimitWindowMs: 5000,
    });

    expect(agent.canExecute()).toBe(true);
    expect(agent.acquireSlot()).toBe(true);
    expect(agent.acquireSlot()).toBe(true);
    expect(agent.canExecute()).toBe(false);
    expect(agent.acquireSlot()).toBe(false);

    agent.releaseSlot();
    // Still blocked by rateLimitWindow (2 requests already recorded in window)
    expect(agent.canExecute()).toBe(false);
  });
});

describe('LindaWhatsAppAgent', () => {
  it('executes send_campaign, schedule_followup, and analyze_conversation', async () => {
    const linda = new LindaWhatsAppAgent(undefined, { baseDelayMs: 1 });

    const campaign = await linda.executeTask('send_campaign', {
      campaignId: 'camp-1',
      recipients: ['+971500000001', '+971500000002'],
      templateName: 'dh2_welcome',
    });
    expect(campaign.success).toBe(true);
    expect((campaign.data as { queuedCount: number }).queuedCount).toBe(2);

    const followup = await linda.enqueueTask('schedule_followup', {
      contactPhone: '+971500000001',
      delayMinutes: 15,
      message: 'Checking in on your viewing',
    });
    expect(followup.success).toBe(true);
    expect((followup.data as { status: string }).status).toBe('scheduled');

    const analysis = await linda.executeTask('analyze_conversation', {
      conversationId: 'conv-1',
      messages: [{ sender: 'lead', text: 'Can I book a viewing tomorrow?' }],
    });
    expect(analysis.success).toBe(true);
    expect((analysis.data as { intent: string }).intent).toBe('viewing_request');
  });
});

describe('DaisyLeasingAgent', () => {
  it('executes match_tenant, schedule_viewing, process_ejari, and handle_renewal', async () => {
    const daisy = new DaisyLeasingAgent(undefined, { baseDelayMs: 1 });

    const match = await daisy.executeTask('match_tenant', {
      tenantId: 'ten-1',
      budgetAed: 95000,
      bedrooms: 3,
    });
    expect(match.success).toBe(true);

    const viewing = await daisy.executeTask('schedule_viewing', {
      tenantId: 'ten-1',
      propertyId: 'prop-1',
      preferredIsoDate: '2026-12-01T10:00:00Z',
    });
    expect(viewing.success).toBe(true);

    const ejari = await daisy.executeTask('process_ejari', {
      leaseId: 'lease-1',
      propertyId: 'prop-1',
      tenantId: 'ten-1',
      annualRentAed: 95000,
    });
    expect(ejari.success).toBe(true);

    const renewal = await daisy.executeTask('handle_renewal', {
      leaseId: 'lease-1',
      currentRentAed: 90000,
      proposedRentAed: 95000,
    });
    expect(renewal.success).toBe(true);
    expect((renewal.data as { deltaAed: number }).deltaAed).toBe(5000);
  });
});
