import { RealtimeEvent } from '../realtime/realtime.models';
import { Notification } from './notification.models';
export function notificationFromEvent(event: RealtimeEvent): Notification | null {
  const base = {
    id: `realtime:${event.id}`,
    createdAt: event.timestamp,
    source: 'realtime' as const,
  };
  switch (event.type) {
    case 'threat.created': {
      const threat = event.payload.threat;
      if (threat.severity !== 'critical' && threat.severity !== 'high') return null;
      return {
        ...base,
        type: 'threat',
        priority: threat.severity,
        title:
          threat.severity === 'critical'
            ? 'Critical threat detected'
            : 'High priority threat detected',
        message: threat.title,
        action: { kind: 'view-threat', entityId: threat.id, label: 'View threat' },
      };
    }
    case 'device.status.changed': {
      const { deviceId, previousStatus, status } = event.payload;
      if (status === previousStatus || (status !== 'isolated' && status !== 'offline')) return null;
      return {
        ...base,
        type: 'device',
        priority: status === 'isolated' ? 'high' : 'normal',
        title: status === 'isolated' ? 'Device isolated' : 'Device offline',
        message: `${deviceId} changed from ${previousStatus} to ${status}.`,
        action: { kind: 'view-device', entityId: deviceId, label: 'View device' },
      };
    }
    case 'security.score.changed':
      return {
        ...base,
        type: 'security',
        priority: event.payload.score < 50 ? 'high' : event.payload.score < 75 ? 'normal' : 'low',
        title: 'Security score changed',
        message: `The organization security score is now ${event.payload.score} / 100.`,
      };
    default:
      return null;
  }
}
