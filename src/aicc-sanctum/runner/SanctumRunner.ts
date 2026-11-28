export interface SupervisorChain {
  mdId: 'MD-01';
  cooId: 'COO-ZOE';
  directorId: string;
  managerId: string;
  assistantManagerId: string;
  supervisorId: string;
}

export interface WorkflowRequest<TPayload = unknown> {
  workflowId: string;
  eventType: string;
  payload: TPayload;
  chain: SupervisorChain;
  maxRetries?: number;
}

export interface WorkflowTelemetry {
  workflowId: string;
  attempts: number;
  durationMs: number;
  status: 'COMPLETED' | 'FAILED';
  timestamp: string;
  error?: string;
}

export interface WorkflowExecutionResult<TOutput = unknown> {
  workflowId: string;
  eventType: string;
  chain: SupervisorChain;
  telemetry: WorkflowTelemetry;
  output?: TOutput;
}

export class SanctumRunner {
  private readonly history: WorkflowTelemetry[] = [];

  async executeWorkflow<TPayload, TOutput>(
    request: WorkflowRequest<TPayload>,
    handler: (payload: TPayload, chain: SupervisorChain) => Promise<TOutput> | TOutput
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const maxRetries = Math.max(0, request.maxRetries ?? 2);
    const start = Date.now();
    let attempts = 0;
    let lastError: unknown;

    while (attempts <= maxRetries) {
      attempts += 1;
      try {
        const output = await handler(request.payload, request.chain);
        const telemetry: WorkflowTelemetry = {
          workflowId: request.workflowId,
          attempts,
          durationMs: Date.now() - start,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        };
        this.history.push(telemetry);
        return {
          workflowId: request.workflowId,
          eventType: request.eventType,
          chain: request.chain,
          telemetry,
          output,
        };
      } catch (err) {
        lastError = err;
      }
    }

    const telemetry: WorkflowTelemetry = {
      workflowId: request.workflowId,
      attempts,
      durationMs: Date.now() - start,
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      error: lastError instanceof Error ? lastError.message : String(lastError),
    };
    this.history.push(telemetry);

    return {
      workflowId: request.workflowId,
      eventType: request.eventType,
      chain: request.chain,
      telemetry,
    };
  }

  getTelemetryHistory(): WorkflowTelemetry[] {
    return [...this.history];
  }
}
