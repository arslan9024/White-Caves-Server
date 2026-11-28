import { ZoeCouncil, GovernanceRouteResult } from './council/ZoeCouncil';
import { DivisionRegistry, ManagerProfile } from './divisions/DivisionRegistry';
import {
  SanctumRunner,
  SupervisorChain,
  WorkflowExecutionResult,
} from './runner/SanctumRunner';

export interface DispatchOptions {
  topicOrDept: string;
  eventType: string;
  urgent?: boolean;
  maxRetries?: number;
}

export class AICCSanctum {
  public readonly council: ZoeCouncil;
  public readonly divisions: DivisionRegistry;
  public readonly runner: SanctumRunner;

  constructor(
    council = new ZoeCouncil(),
    divisions = new DivisionRegistry(),
    runner = new SanctumRunner()
  ) {
    this.council = council;
    this.divisions = divisions;
    this.runner = runner;
  }

  resolveSupervisorChain(topicOrDept: string, urgent = false): {
    route: GovernanceRouteResult;
    manager: ManagerProfile;
    chain: SupervisorChain;
  } {
    const route = this.council.routeGovernance(topicOrDept, urgent);
    const managers = this.divisions.getManagersByDirector(route.director.id);
    const manager = managers[0] ?? this.divisions.getAllManagers()[0];
    const deptPad = route.director.departmentCode.replace('DEPT-', '');
    const divIdx = manager.divisionIndex;

    const chain: SupervisorChain = {
      mdId: 'MD-01',
      cooId: 'COO-ZOE',
      directorId: route.director.id,
      managerId: manager.id,
      assistantManagerId: `AMGR-${deptPad}-${divIdx}-01`,
      supervisorId: `SUP-${deptPad}-${divIdx}-01-1`,
    };

    return { route, manager, chain };
  }

  async dispatchWorkflow<TPayload, TOutput>(
    options: DispatchOptions,
    payload: TPayload,
    handler: (payload: TPayload, chain: SupervisorChain) => Promise<TOutput> | TOutput
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const { chain } = this.resolveSupervisorChain(options.topicOrDept, options.urgent);
    const workflowId = `WF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return this.runner.executeWorkflow(
      {
        workflowId,
        eventType: options.eventType,
        payload,
        chain,
        maxRetries: options.maxRetries,
      },
      handler
    );
  }
}
