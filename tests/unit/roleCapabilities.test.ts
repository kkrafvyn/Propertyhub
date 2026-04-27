import {
  getRoleAccess,
  getRoleWorkspace,
  normalizeUserRole,
} from '../../src/utils/roleCapabilities';

describe('role capabilities', () => {
  it('keeps manager as a distinct canonical role', () => {
    expect(normalizeUserRole('manager')).toBe('manager');

    const workspace = getRoleWorkspace('manager');
    expect(workspace.label).toBe('Manager');
    expect(workspace.homeState).toBe('dashboard');
  });

  it('scopes manager access to assigned-management work instead of admin powers', () => {
    const managerUser = {
      id: 'manager-1',
      role: 'manager',
      managerData: {
        assignedProperties: ['prop-1'],
        permissions: ['view_properties', 'edit_properties', 'manage_bookings'],
        supervisor: 'admin-1',
      },
    } as any;

    const access = getRoleAccess(managerUser);

    expect(access.canManageProperties).toBe(true);
    expect(access.canEditProperty).toBe(true);
    expect(access.canManageBookings).toBe(true);
    expect(access.canApproveApplications).toBe(true);

    expect(access.canAddProperty).toBe(false);
    expect(access.canDeleteProperty).toBe(false);
    expect(access.canAccessAdmin).toBe(false);
    expect(access.canFreezeAccounts).toBe(false);
  });
});
