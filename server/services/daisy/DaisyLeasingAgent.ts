import {
  AgentIdentity,
  AgentTaskResult,
  BaseAIAgent,
  BaseAIAgentConfig,
} from '../ai/BaseAIAgent';

export type DaisyTaskType =
  | 'match_tenant'
  | 'schedule_viewing'
  | 'process_ejari'
  | 'handle_renewal';

export interface MatchTenantPayload {
  tenantId: string;
  budgetAed: number;
  bedrooms: number;
  community?: string;
}

export interface ScheduleViewingPayload {
  tenantId: string;
  propertyId: string;
  preferredIsoDate: string;
}

export interface ProcessEjariPayload {
  leaseId: string;
  propertyId: string;
  tenantId: string;
  annualRentAed: number;
}

export interface HandleRenewalPayload {
  leaseId: string;
  currentRentAed: number;
  proposedRentAed: number;
}

const DEFAULT_DAISY_IDENTITY: AgentIdentity = {
  id: 'daisy-leasing-agent',
  name: 'Daisy',
  department: 'DEPT-03',
  supervisorChain: {
    md: 'MD-01',
    coo: 'AI Zoe',
    director: 'DIR-03',
    manager: 'MGR-03-1',
    assistantManager: 'AMGR-03-1-01',
    supervisor: 'SUP-03-1-01-1',
  },
};

/**
 * Daisy Residential Leasing AI Agent.
 * Handles tenant matching, viewing scheduling, Ejari processing, and
 * lease renewals.
 */
export class DaisyLeasingAgent extends BaseAIAgent {
  constructor(
    identity: AgentIdentity = DEFAULT_DAISY_IDENTITY,
    config: BaseAIAgentConfig = {},
  ) {
    super(identity, config);
  }

  async executeTask<TInput, TOutput>(
    taskType: string,
    payload: TInput,
  ): Promise<AgentTaskResult<TOutput>> {
    return this.runTask<TOutput>(taskType, async () => {
      switch (taskType as DaisyTaskType) {
        case 'match_tenant':
          return this.handleMatchTenant(
            payload as unknown as MatchTenantPayload,
          ) as unknown as TOutput;
        case 'schedule_viewing':
          return this.handleScheduleViewing(
            payload as unknown as ScheduleViewingPayload,
          ) as unknown as TOutput;
        case 'process_ejari':
          return this.handleProcessEjari(
            payload as unknown as ProcessEjariPayload,
          ) as unknown as TOutput;
        case 'handle_renewal':
          return this.handleLeaseRenewal(
            payload as unknown as HandleRenewalPayload,
          ) as unknown as TOutput;
        default:
          throw new Error(`Unsupported DaisyLeasingAgent task: ${taskType}`);
      }
    });
  }

  private async handleMatchTenant(payload: MatchTenantPayload) {
    if (!payload?.tenantId || typeof payload.budgetAed !== 'number') {
      throw new Error('Invalid match_tenant payload');
    }
    return {
      tenantId: payload.tenantId,
      budgetAed: payload.budgetAed,
      bedrooms: payload.bedrooms,
      community: payload.community ?? 'DAMAC Hills 2',
      matchedStatus: 'candidates_ready',
    };
  }

  private async handleScheduleViewing(payload: ScheduleViewingPayload) {
    if (!payload?.tenantId || !payload?.propertyId || !payload?.preferredIsoDate) {
      throw new Error('Invalid schedule_viewing payload');
    }
    return {
      tenantId: payload.tenantId,
      propertyId: payload.propertyId,
      scheduledAt: payload.preferredIsoDate,
      status: 'confirmed',
    };
  }

  private async handleProcessEjari(payload: ProcessEjariPayload) {
    if (!payload?.leaseId || !payload?.propertyId || !payload?.tenantId) {
      throw new Error('Invalid process_ejari payload');
    }
    return {
      leaseId: payload.leaseId,
      ejariStatus: 'submitted',
      annualRentAed: payload.annualRentAed,
    };
  }

  private async handleLeaseRenewal(payload: HandleRenewalPayload) {
    if (!payload?.leaseId || typeof payload.proposedRentAed !== 'number') {
      throw new Error('Invalid handle_renewal payload');
    }
    const deltaAed = payload.proposedRentAed - payload.currentRentAed;
    return {
      leaseId: payload.leaseId,
      currentRentAed: payload.currentRentAed,
      proposedRentAed: payload.proposedRentAed,
      deltaAed,
      status: 'renewal_offer_prepared',
    };
  }
}
