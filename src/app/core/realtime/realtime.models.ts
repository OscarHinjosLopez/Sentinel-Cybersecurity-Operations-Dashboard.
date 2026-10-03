import type {
  Threat,
  ThreatId,
  ThreatSeverity,
  ThreatStatus,
} from '../../features/threats/models/threat.models';
import type { DeviceId, DeviceStatus } from '../../features/devices/models/device.models';
export type ConnectionState =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type ThreatChanges = Partial<
  Pick<Threat, 'title' | 'description' | 'severity' | 'status' | 'confidence' | 'source' | 'target'>
>;
interface EventBase<T extends string, P> {
  readonly id: string;
  readonly type: T;
  readonly timestamp: string;
  readonly payload: P;
}
export type ThreatCreatedEvent = EventBase<'threat.created', { readonly threat: Threat }>;
export type ThreatUpdatedEvent = EventBase<
  'threat.updated',
  {
    readonly threatId: ThreatId;
    readonly changes: ThreatChanges;
    readonly previous: { readonly status: ThreatStatus; readonly severity: ThreatSeverity };
  }
>;
export type ThreatResolvedEvent = EventBase<
  'threat.resolved',
  {
    readonly threatId: ThreatId;
    readonly previous: { readonly status: ThreatStatus; readonly severity: ThreatSeverity };
  }
>;
export type DeviceStatusChangedEvent = EventBase<
  'device.status.changed',
  {
    readonly deviceId: DeviceId;
    readonly previousStatus: DeviceStatus;
    readonly status: DeviceStatus;
  }
>;
export type SecurityScoreChangedEvent = EventBase<
  'security.score.changed',
  { readonly score: number }
>;
export type RealtimeEvent =
  | ThreatCreatedEvent
  | ThreatUpdatedEvent
  | ThreatResolvedEvent
  | DeviceStatusChangedEvent
  | SecurityScoreChangedEvent;
