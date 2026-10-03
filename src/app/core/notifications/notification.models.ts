import type { ThreatId } from '../../features/threats/models/threat.models';
import type { DeviceId } from '../../features/devices/models/device.models';
export type NotificationId = string;
export type NotificationType = 'threat' | 'device' | 'system' | 'security';
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';
export type NotificationAction =
  | { readonly kind: 'view-threat'; readonly entityId: ThreatId; readonly label: 'View threat' }
  | { readonly kind: 'view-device'; readonly entityId: DeviceId; readonly label: 'View device' };
export interface Notification {
  readonly id: NotificationId;
  readonly type: NotificationType;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly message: string;
  readonly createdAt: string;
  readonly readAt?: string;
  readonly source: 'realtime' | 'system';
  readonly action?: NotificationAction;
}
