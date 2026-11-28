import { BaseSystem } from './BaseSystem';

export interface PropertyEntity {
  id: string;
  title: string;
  community: string;
  priceAed: number;
  unitNumber?: string;
}

export class PropertySystem extends BaseSystem<PropertyEntity> {
  readonly systemName = 'PropertySystem';
}
