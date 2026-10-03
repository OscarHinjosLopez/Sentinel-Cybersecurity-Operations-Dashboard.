import { RealtimeEvent } from '../../../core/realtime/realtime.models';
import { Threat, ThreatId } from '../models/threat.models';
export function applyThreatEvent(
  threat: Threat | null,
  event: RealtimeEvent,
  id: ThreatId,
): Threat | null {
  if (event.type === 'threat.created') {
    if (event.payload.threat.id !== id) return threat;
    return !threat || Date.parse(event.payload.threat.updatedAt) > Date.parse(threat.updatedAt)
      ? event.payload.threat
      : threat;
  }
  if (
    (event.type !== 'threat.updated' && event.type !== 'threat.resolved') ||
    event.payload.threatId !== id ||
    !threat ||
    Date.parse(event.timestamp) <= Date.parse(threat.updatedAt)
  )
    return threat;
  const changes =
    event.type === 'threat.resolved' ? { status: 'resolved' as const } : event.payload.changes;
  return {
    ...threat,
    ...changes,
    updatedAt: event.timestamp,
    timeline: [
      ...threat.timeline,
      {
        timestamp: event.timestamp,
        type: 'status' as const,
        label: event.type === 'threat.resolved' ? 'Threat resolved' : 'Live threat update',
        description: 'Received from realtime monitoring.',
      },
    ].slice(-100),
  };
}
