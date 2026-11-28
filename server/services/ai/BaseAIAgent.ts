export interface SupervisorChain {
  md: 'MD-01';
  coo: 'AI Zoe';
  director: string;
  manager: string;
  assistantManager: string;
  supervisor: string;
}

export interface AgentIdentity {
  id: string;
  name: string;
  department: string;
  supervisorChain: SupervisorChain;
}

export interface AgentTaskResult<TOutput = unknown> {
  success: boolean;
  data?: TOutput;
  error?: string;
  latencyMs: number;
  attempts: number;
  taskType: string;
  executedAt: string;
  agentId: string;
}

export interface AgentTelemetry {
  tasksExecuted: number;
  tasksFailed: number;
  avgLatencyMs: number;
  lastExecutedAt: string | null;
  activeSlots: number;
  maxConcurrentSlots: number;
}

export interface BaseAIAgentConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxConcurrentSlots?: number;
  rateLimitWindowMs?: number;
  maxRequestsPerWindow?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Abstract base class for White Caves AI agents.
 * Provides identity/supervisor-chain metadata, exponential-backoff retries,
 * concurrency & rate-limit guards, and execution telemetry.
 */
export abstract class BaseAIAgent {
  readonly identity: AgentIdentity;

  protected readonly maxRetries: number;
  protected readonly baseDelayMs: number;
  protected readonly maxConcurrentSlots: number;
  protected readonly rateLimitWindowMs: number;
  protected readonly maxRequestsPerWindow: number;

  private activeSlots = 0;
  private requestTimestamps: number[] = [];
  private tasksExecuted = 0;
  private tasksFailed = 0;
  private totalLatencyMs = 0;
  private lastExecutedAt: string | null = null;

  constructor(identity: AgentIdentity, config: BaseAIAgentConfig = {}) {
    this.identity = identity;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelayMs = config.baseDelayMs ?? 100;
    this.maxConcurrentSlots = config.maxConcurrentSlots ?? 5;
    this.rateLimitWindowMs = config.rateLimitWindowMs ?? 1000;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 20;
  }

  /**
   * Checks whether the agent has available concurrency capacity and is within
   * its sliding-window rate limit.
   */
  canExecute(): boolean {
    if (this.activeSlots >= this.maxConcurrentSlots) {
      return false;
    }
    const now = Date.now();
    this.pruneTimestamps(now);
    return this.requestTimestamps.length < this.maxRequestsPerWindow;
  }

  /**
   * Attempts to acquire an execution slot and record a rate-limit timestamp.
   * Returns true if acquired, false if capacity or rate limit is exceeded.
   */
  acquireSlot(): boolean {
    if (!this.canExecute()) {
      return false;
    }
    this.activeSlots += 1;
    this.requestTimestamps.push(Date.now());
    return true;
  }

  /**
   * Releases a previously acquired execution slot.
   */
  releaseSlot(): void {
    if (this.activeSlots > 0) {
      this.activeSlots -= 1;
    }
  }

  /**
   * Executes an async operation with exponential backoff retries.
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<{ result: T; attempts: number }> {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const baseDelayMs = options.baseDelayMs ?? this.baseDelayMs;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const result = await fn();
        return { result, attempts: attempt };
      } catch (err) {
        lastError = err;
        if (attempt <= maxRetries) {
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Returns current execution telemetry for this agent.
   */
  getTelemetry(): AgentTelemetry {
    const totalCompleted = this.tasksExecuted + this.tasksFailed;
    const avgLatencyMs =
      totalCompleted > 0 ? Math.round(this.totalLatencyMs / totalCompleted) : 0;

    return {
      tasksExecuted: this.tasksExecuted,
      tasksFailed: this.tasksFailed,
      avgLatencyMs,
      lastExecutedAt: this.lastExecutedAt,
      activeSlots: this.activeSlots,
      maxConcurrentSlots: this.maxConcurrentSlots,
    };
  }

  /**
   * Shared task runner that enforces slot acquisition, retry, telemetry, and
   * standardized AgentTaskResult formatting.
   */
  protected async runTask<TOutput>(
    taskType: string,
    handler: () => Promise<TOutput>,
  ): Promise<AgentTaskResult<TOutput>> {
    const start = Date.now();
    if (!this.acquireSlot()) {
      const latencyMs = Date.now() - start;
      this.recordExecution(latencyMs, false);
      return {
        success: false,
        error: `Agent ${this.identity.id} capacity or rate limit exceeded`,
        latencyMs,
        attempts: 0,
        taskType,
        executedAt: new Date().toISOString(),
        agentId: this.identity.id,
      };
    }

    try {
      const { result, attempts } = await this.executeWithRetry(handler);
      const latencyMs = Date.now() - start;
      this.recordExecution(latencyMs, true);
      return {
        success: true,
        data: result,
        latencyMs,
        attempts,
        taskType,
        executedAt: new Date().toISOString(),
        agentId: this.identity.id,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.recordExecution(latencyMs, false);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        latencyMs,
        attempts: this.maxRetries + 1,
        taskType,
        executedAt: new Date().toISOString(),
        agentId: this.identity.id,
      };
    } finally {
      this.releaseSlot();
    }
  }

  protected recordExecution(latencyMs: number, success: boolean): void {
    if (success) {
      this.tasksExecuted += 1;
    } else {
      this.tasksFailed += 1;
    }
    this.totalLatencyMs += latencyMs;
    this.lastExecutedAt = new Date().toISOString();
  }

  private pruneTimestamps(now: number): void {
    const cutoff = now - this.rateLimitWindowMs;
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] <= cutoff) {
      this.requestTimestamps.shift();
    }
  }

  abstract executeTask<TInput, TOutput>(
    taskType: string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>>;
}
