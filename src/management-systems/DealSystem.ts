import { BaseSystem } from './BaseSystem';

export interface DealEntity {
  id: string;
  propertyId: string;
  grossCommissionAed: number;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
}

export class DealSystem extends BaseSystem<DealEntity> {
  readonly systemName = 'DealSystem';
}
