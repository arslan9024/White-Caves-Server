import { BaseSystem } from './BaseSystem';

export interface LeasingEntity {
  id: string;
  propertyId: string;
  ejariNumber?: string;
  annualRentAed: number;
  chequeCount: number;
}

export class LeasingSystem extends BaseSystem<LeasingEntity> {
  readonly systemName = 'LeasingSystem';
}
