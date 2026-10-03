import { Permission, PERMISSIONS } from '../../core/auth/auth.models';
import { IconName } from '../../shared/ui/icon/icon';
export interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly permission: Permission;
}
export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  { path: '/threats', label: 'Threats', icon: 'threats', permission: PERMISSIONS.THREATS_VIEW },
  { path: '/devices', label: 'Devices', icon: 'devices', permission: PERMISSIONS.DEVICES_VIEW },
  { path: '/audit', label: 'Audit', icon: 'audit', permission: PERMISSIONS.AUDIT_VIEW },
];
export const SECONDARY_NAVIGATION: readonly NavigationItem[] = [
  { path: '/settings', label: 'Settings', icon: 'settings', permission: PERMISSIONS.SETTINGS_VIEW },
];
