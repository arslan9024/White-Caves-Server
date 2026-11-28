import { BaseSystem } from './BaseSystem';

export interface DocumentEntity {
  id: string;
  title: string;
  category: 'EJARI' | 'SPA' | 'KYC' | 'OTHER';
  storageUrl: string;
}

export class DocumentSystem extends BaseSystem<DocumentEntity> {
  readonly systemName = 'DocumentSystem';
}
