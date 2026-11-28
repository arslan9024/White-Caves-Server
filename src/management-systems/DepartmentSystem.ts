import { BaseSystem } from './BaseSystem';

export interface DepartmentEntity {
  id: string;
  code: string;
  name: string;
  directorCode: string;
}

export class DepartmentSystem extends BaseSystem<DepartmentEntity> {
  readonly systemName = 'DepartmentSystem';
}
