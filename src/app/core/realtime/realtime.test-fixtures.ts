import { Threat } from '../../features/threats/models/threat.models';
import { ThreatCreatedEvent, ThreatResolvedEvent, ThreatUpdatedEvent } from './realtime.models';
export const LIVE_TIME = new Date('2026-10-03T15:00:00Z');
export function liveThreat(id = 'THR-22001', patch: Partial<Threat> = {}): Threat {
  const timestamp = LIVE_TIME.toISOString();
  return {
    id,
    title: 'Live credential attack',
    description: 'Fictional stream detection.',
    severity: 'critical',
    status: 'open',
    vector: 'credential-attack',
    source: '203.0.113.24',
    target: 'Identity Gateway',
    detectedAt: timestamp,
    updatedAt: timestamp,
    confidence: 91,
    indicators: [{ type: 'ip', value: '203.0.113.24' }],
    timeline: [{ timestamp, type: 'detected', label: 'Detected' }],
    ...patch,
  };
}
export function createdEvent(id = 'created-1', threat = liveThreat()): ThreatCreatedEvent {
  return { id, type: 'threat.created', timestamp: threat.updatedAt, payload: { threat } };
}
export function updatedEvent(
  threatId = 'THR-22001',
  changes: ThreatUpdatedEvent['payload']['changes'] = { status: 'investigating' },
  offset = 1000,
): ThreatUpdatedEvent {
  return {
    id: `update-${threatId}-${offset}`,
    type: 'threat.updated',
    timestamp: new Date(LIVE_TIME.getTime() + offset).toISOString(),
    payload: { threatId, changes, previous: { status: 'open', severity: 'critical' } },
  };
}
export function resolvedEvent(threatId = 'THR-22001', offset = 2000): ThreatResolvedEvent {
  return {
    id: `resolved-${threatId}-${offset}`,
    type: 'threat.resolved',
    timestamp: new Date(LIVE_TIME.getTime() + offset).toISOString(),
    payload: { threatId, previous: { status: 'investigating', severity: 'critical' } },
  };
}
