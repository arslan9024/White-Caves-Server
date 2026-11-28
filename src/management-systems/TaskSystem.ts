import { BaseSystem } from './BaseSystem';

export interface TaskEntity {
  id: string;
  title: string;
  supervisorCode: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

export class TaskSystem extends BaseSystem<TaskEntity> {
  readonly systemName = 'TaskSystem';
}
