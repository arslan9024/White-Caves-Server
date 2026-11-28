import { AICCSanctum, WorkflowExecutionResult } from '../aicc-sanctum';
import { ManagementSystemHub } from '../management-systems';

export interface HQEventRecord {
  eventType: string;
  workflowResult: WorkflowExecutionResult<unknown>;
}

export class WhiteCavesHQ {
  private static rootInstance: WhiteCavesHQ | null = null;

  public readonly sanctum: AICCSanctum;
  public readonly hub: ManagementSystemHub;
  private readonly eventLog: HQEventRecord[] = [];
  private wired = false;

  private constructor(
    sanctum = new AICCSanctum(),
    hub = new ManagementSystemHub()
  ) {
    this.sanctum = sanctum;
    this.hub = hub;
    this.wireEvents();
  }

  static getRoot(): WhiteCavesHQ {
    if (!WhiteCavesHQ.rootInstance) {
      WhiteCavesHQ.rootInstance = new WhiteCavesHQ();
    }
    return WhiteCavesHQ.rootInstance;
  }

  static resetRoot(): void {
    WhiteCavesHQ.rootInstance = null;
  }

  private wireEvents(): void {
    if (this.wired) return;
    this.wired = true;

    const eventTopics: Array<{ event: string; topic: string }> = [
      { event: 'deal:created', topic: 'sales' },
      { event: 'leasing:ejari_registered', topic: 'leasing' },
      { event: 'property:maintenance_requested', topic: 'property' },
      { event: 'task:escalated', topic: 'operations' },
    ];

    const hubAny = this.hub as unknown as {
      on?: (event: string, listener: (payload: unknown) => void) => void;
    };

    if (typeof hubAny.on === 'function') {
      for (const { event, topic } of eventTopics) {
        hubAny.on(event, (payload: unknown) => {
          void this.handleSystemEvent(event, topic, payload);
        });
      }
    }
  }

  async handleSystemEvent(
    eventType: string,
    topicOrDept: string,
    payload: unknown
  ): Promise<WorkflowExecutionResult<unknown>> {
    const result = await this.sanctum.dispatchWorkflow(
      { topicOrDept, eventType },
      payload,
      async (data, chain) => ({
        status: 'RUP_TASK_UPDATED',
        eventType,
        supervisorId: chain.supervisorId,
        data,
      })
    );

    this.eventLog.push({ eventType, workflowResult: result });
    return result;
  }

  getEventLog(): HQEventRecord[] {
    return [...this.eventLog];
  }
}
