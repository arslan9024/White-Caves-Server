import { EventEmitter } from 'node:events';
import { BaseSystem, SystemEvent } from './BaseSystem';
import { DealSystem } from './DealSystem';
import { DepartmentSystem } from './DepartmentSystem';
import { DocumentSystem } from './DocumentSystem';
import { LeasingSystem } from './LeasingSystem';
import { PropertySystem } from './PropertySystem';
import { TaskSystem } from './TaskSystem';

export type LifecycleEventName = 'created' | 'updated' | 'deleted';

/**
 * Central hub registering and exposing all 6 management systems
 * with unified lifecycle event subscription.
 */
export class ManagementSystemHub extends EventEmitter {
  readonly tasks = new TaskSystem();
  readonly departments = new DepartmentSystem();
  readonly properties = new PropertySystem();
  readonly leasing = new LeasingSystem();
  readonly deals = new DealSystem();
  readonly documents = new DocumentSystem();

  private readonly systems: ReadonlyArray<BaseSystem<{ id: string }>>;

  constructor() {
    super();
    this.systems = [
      this.tasks,
      this.departments,
      this.properties,
      this.leasing,
      this.deals,
      this.documents,
    ];
    this.wireUnifiedEvents();
  }

  private wireUnifiedEvents(): void {
    const events: LifecycleEventName[] = ['created', 'updated', 'deleted'];
    for (const system of this.systems) {
      for (const eventName of events) {
        system.on(eventName, (payload: SystemEvent<{ id: string }>) => {
          this.emit(eventName, payload);
          this.emit('event', payload);
        });
      }
    }
  }

  getAllSystems(): ReadonlyArray<BaseSystem<{ id: string }>> {
    return this.systems;
  }

  subscribeAll(listener: (event: SystemEvent<{ id: string }>) => void): () => void {
    this.on('event', listener);
    return () => {
      this.off('event', listener);
    };
  }
}
