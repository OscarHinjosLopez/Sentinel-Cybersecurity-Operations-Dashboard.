import { RealtimeEvent } from '../../../core/realtime/realtime.models';
import { ThreatStatus } from '../../threats/models/threat.models';
import { DashboardSummary } from '../models/dashboard.models';
const active = (status: ThreatStatus): number =>
  status === 'open' || status === 'investigating' ? 1 : 0;
export function applyDashboardEvent(
  data: DashboardSummary,
  event: RealtimeEvent,
): DashboardSummary {
  if (event.type === 'device.status.changed') return data;
  if (event.type === 'security.score.changed')
    return {
      ...data,
      metrics: data.metrics.map((metric) =>
        metric.id === 'score'
          ? {
              ...metric,
              value: event.payload.score,
              detail:
                event.payload.score >= 80
                  ? 'Good'
                  : event.payload.score >= 60
                    ? 'Moderate'
                    : 'At risk',
            }
          : metric,
      ),
    };
  if (event.type === 'threat.created') {
    const threat = event.payload.threat;
    if (data.recent.some((item) => item.id === threat.id)) return data;
    return {
      ...data,
      metrics: data.metrics.map((metric) =>
        metric.id === 'active'
          ? { ...metric, value: metric.value + active(threat.status) }
          : metric.id === 'critical'
            ? {
                ...metric,
                value:
                  metric.value + active(threat.status) * Number(threat.severity === 'critical'),
              }
            : metric,
      ),
      recent: [
        {
          id: threat.id,
          title: threat.title,
          severity: threat.severity,
          source: threat.source,
          target: threat.target,
          timestamp: event.timestamp,
          status: threat.status,
          live: true,
        },
        ...data.recent,
      ].slice(0, 15),
      activity: data.activity.map((point, i) =>
        i === data.activity.length - 1 ? { ...point, detected: point.detected + 1 } : point,
      ),
      severities: data.severities.map((item) =>
        item.severity === threat.severity ? { ...item, count: item.count + 1 } : item,
      ),
      vectors: data.vectors.map((item) =>
        item.name ===
        {
          'credential-attack': 'Credential attacks',
          malware: 'Malware',
          phishing: 'Phishing',
          exploit: 'Exploit attempts',
          network: 'Suspicious network activity',
          insider: 'Other',
          other: 'Other',
        }[threat.vector]
          ? { ...item, count: item.count + 1 }
          : item,
      ),
    };
  }
  const previous = event.payload.previous;
  const changes =
    event.type === 'threat.resolved' ? { status: 'resolved' as const } : event.payload.changes;
  const status = changes.status ?? previous.status;
  const severity =
    'severity' in changes ? (changes.severity ?? previous.severity) : previous.severity;
  return {
    ...data,
    metrics: data.metrics.map((metric) =>
      metric.id === 'active'
        ? { ...metric, value: Math.max(0, metric.value + active(status) - active(previous.status)) }
        : metric.id === 'critical'
          ? {
              ...metric,
              value: Math.max(
                0,
                metric.value +
                  active(status) * Number(severity === 'critical') -
                  active(previous.status) * Number(previous.severity === 'critical'),
              ),
            }
          : metric,
    ),
    recent: data.recent.map((item) =>
      item.id === event.payload.threatId
        ? { ...item, ...changes, status, severity, timestamp: event.timestamp, live: true }
        : item,
    ),
  };
}
