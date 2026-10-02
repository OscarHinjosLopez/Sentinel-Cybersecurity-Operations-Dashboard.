import { IconName } from '../../shared/ui/icon/icon';
export interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}
export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/threats', label: 'Threats', icon: 'threats' },
  { path: '/devices', label: 'Devices', icon: 'devices' },
  { path: '/audit', label: 'Audit', icon: 'audit' },
];
export const SECONDARY_NAVIGATION: readonly NavigationItem[] = [
  { path: '/settings', label: 'Settings', icon: 'settings' },
];
