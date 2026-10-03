import type { Permission } from '../auth/auth.models';
import type { IconName } from '../../shared/ui/icon/icon';
export type CommandId =
  | 'dashboard'
  | 'threats'
  | 'devices'
  | 'audit'
  | 'settings'
  | 'toggle-theme'
  | 'notifications'
  | 'shortcuts'
  | 'critical-threats'
  | 'at-risk-devices'
  | 'clear-threat-filters';
export type CommandAction =
  | {
      readonly kind: 'navigate';
      readonly route: '/dashboard' | '/threats' | '/devices' | '/audit' | '/settings';
      readonly query?: { readonly severity: 'critical' } | { readonly protection: 'at-risk' };
    }
  | { readonly kind: 'toggle-theme' | 'notifications' | 'shortcuts' };
export interface Command {
  readonly id: CommandId;
  readonly label: string;
  readonly description: string;
  readonly category: 'Navigation' | 'Actions';
  readonly keywords: readonly string[];
  readonly icon: IconName;
  readonly shortcut?: string;
  readonly permission?: Permission;
  readonly action: CommandAction;
}
