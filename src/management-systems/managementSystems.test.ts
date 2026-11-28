import { describe, expect, it, vi } from 'vitest';
import { ActorContext, ManagementSystemHub } from './index';

const mdActor: ActorContext = { actorId: 'MD-01', role: 'MD' };
const employeeActor: ActorContext = { actorId: 'EMP-01', role: 'EMPLOYEE' };
const guestActor: ActorContext = { actorId: 'GUEST-01', role: 'GUEST' };

describe('BaseSystem & ManagementSystemHub', () => {
  it('registers all 6 management systems', () => {
    const hub = new ManagementSystemHub();
    expect(hub.getAllSystems()).toHaveLength(6);
    expect(hub.tasks.systemName).toBe('TaskSystem');
    expect(hub.departments.systemName).toBe('DepartmentSystem');
    expect(hub.properties.systemName).toBe('PropertySystem');
    expect(hub.leasing.systemName).toBe('LeasingSystem');
    expect(hub.deals.systemName).toBe('DealSystem');
    expect(hub.documents.systemName).toBe('DocumentSystem');
  });

  it('enforces RBAC on create and delete', () => {
    const hub = new ManagementSystemHub();
    expect(() =>
      hub.tasks.create(
        { id: 't-1', title: 'Verify Ejari', supervisorCode: 'SUP-02-1-01-1', status: 'PENDING' },
        guestActor
      )
    ).toThrow(/RBAC_DENIED/);

    hub.tasks.create(
      { id: 't-1', title: 'Verify Ejari', supervisorCode: 'SUP-02-1-01-1', status: 'PENDING' },
      employeeActor
    );

    expect(() => hub.tasks.delete('t-1', employeeActor)).toThrow(/RBAC_DENIED/);
    expect(hub.tasks.delete('t-1', mdActor)).toBe(true);
  });

  it('records audit log entries and emits unified hub events', () => {
    const hub = new ManagementSystemHub();
    const events: string[] = [];
    const unsubscribe = hub.subscribeAll((evt) => {
      events.push(`${evt.system}:${evt.action}:${evt.entity.id}`);
    });
    const createdSpy = vi.fn();
    hub.on('created', createdSpy);

    hub.deals.create(
      { id: 'deal-1', propertyId: 'prop-1', grossCommissionAed: 50000, status: 'OPEN' },
      mdActor
    );
    hub.deals.update('deal-1', { status: 'COMPLETED' }, mdActor);
    hub.deals.delete('deal-1', mdActor);

    expect(createdSpy).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      'DealSystem:created:deal-1',
      'DealSystem:updated:deal-1',
      'DealSystem:deleted:deal-1',
    ]);
    expect(hub.deals.getAuditLog()).toHaveLength(3);

    unsubscribe();
  });
});
