import { Permission, PERMISSIONS, UserRole, USER_ROLES } from './auth.models';
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.ANALYST]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.THREATS_VIEW,
    PERMISSIONS.THREATS_INVESTIGATE,
    PERMISSIONS.DEVICES_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.THREATS_VIEW,
    PERMISSIONS.DEVICES_VIEW,
  ],
};
export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === 'string' &&
    Object.values(PERMISSIONS).some((permission) => permission === value)
  );
}
