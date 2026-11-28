import { EventEmitter } from 'node:events';

export type SystemAction = 'create' | 'read' | 'update' | 'delete';

export interface ActorContext {
  actorId: string;
  role: string;
}

export interface AuditEntry {
  timestamp: string;
  system: string;
  action: SystemAction;
  entityId: string;
  actorId: string;
  role: string;
}

export interface SystemEvent<T extends { id: string }> {
  system: string;
  action: 'created' | 'updated' | 'deleted';
  entity: T;
  actor: ActorContext;
}

const DEFAULT_READ_WRITE_ROLES = [
  'MD',
  'COO',
  'DIRECTOR',
  'MANAGER',
  'ASSISTANT_MANAGER',
  'SUPERVISOR',
  'TEAM_LEADER',
  'EMPLOYEE',
] as const;

const DEFAULT_DELETE_ROLES = ['MD', 'COO', 'DIRECTOR', 'MANAGER'] as const;

/**
 * Abstract base management system with RBAC enforcement, audit logging,
 * and EventEmitter lifecycle events (`created`, `updated`, `deleted`).
 */
export abstract class BaseSystem<T extends { id: string }> extends EventEmitter {
  abstract readonly systemName: string;

  protected readonly store = new Map<string, T>();
  protected readonly auditLog: AuditEntry[] = [];

  protected readonly roleMatrix: Record<SystemAction, readonly string[]> = {
    create: DEFAULT_READ_WRITE_ROLES,
    read: DEFAULT_READ_WRITE_ROLES,
    update: DEFAULT_READ_WRITE_ROLES,
    delete: DEFAULT_DELETE_ROLES,
  };

  protected assertAuthorized(action: SystemAction, actor: ActorContext): void {
    const allowed = this.roleMatrix[action];
    if (!allowed.includes(actor.role)) {
      throw new Error(
        `RBAC_DENIED: role "${actor.role}" cannot perform "${action}" on ${this.systemName}`
      );
    }
  }

  protected recordAudit(action: SystemAction, entityId: string, actor: ActorContext): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      system: this.systemName,
      action,
      entityId,
      actorId: actor.actorId,
      role: actor.role,
    });
  }

  create(item: T, actor: ActorContext): T {
    this.assertAuthorized('create', actor);
    if (this.store.has(item.id)) {
      throw new Error(`${this.systemName}: entity "${item.id}" already exists`);
    }
    this.store.set(item.id, item);
    this.recordAudit('create', item.id, actor);
    this.emit('created', { system: this.systemName, action: 'created', entity: item, actor });
    return item;
  }

  getById(id: string, actor: ActorContext): T | undefined {
    this.assertAuthorized('read', actor);
    const found = this.store.get(id);
    if (found) {
      this.recordAudit('read', id, actor);
    }
    return found;
  }

  list(actor: ActorContext): T[] {
    this.assertAuthorized('read', actor);
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<Omit<T, 'id'>>, actor: ActorContext): T {
    this.assertAuthorized('update', actor);
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`${this.systemName}: entity "${id}" not found`);
    }
    const updated: T = { ...existing, ...patch, id };
    this.store.set(id, updated);
    this.recordAudit('update', id, actor);
    this.emit('updated', { system: this.systemName, action: 'updated', entity: updated, actor });
    return updated;
  }

  delete(id: string, actor: ActorContext): boolean {
    this.assertAuthorized('delete', actor);
    const existing = this.store.get(id);
    if (!existing) {
      return false;
    }
    this.store.delete(id);
    this.recordAudit('delete', id, actor);
    this.emit('deleted', { system: this.systemName, action: 'deleted', entity: existing, actor });
    return true;
  }

  getAuditLog(): readonly AuditEntry[] {
    return this.auditLog;
  }
}
