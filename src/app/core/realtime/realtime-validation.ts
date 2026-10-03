import { RealtimeEvent } from './realtime.models';
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown, max = 4000): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}
function date(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
function score(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
const severities = ['critical', 'high', 'medium', 'low'];
const statuses = ['open', 'investigating', 'resolved', 'false-positive'];
const devices = ['online', 'offline', 'isolated', 'inactive'];
function member(value: unknown, values: readonly string[]): boolean {
  return typeof value === 'string' && values.includes(value);
}
function previous(value: unknown): boolean {
  return (
    record(value) && member(value['status'], statuses) && member(value['severity'], severities)
  );
}
function threat(value: unknown): boolean {
  if (!record(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    /^THR-\d{5}$/.test(value['id']) &&
    ['title', 'description', 'source', 'target'].every((key) => text(value[key])) &&
    member(value['severity'], severities) &&
    member(value['status'], statuses) &&
    member(value['vector'], [
      'credential-attack',
      'malware',
      'phishing',
      'exploit',
      'network',
      'insider',
      'other',
    ]) &&
    score(value['confidence']) &&
    date(value['detectedAt']) &&
    date(value['updatedAt']) &&
    Array.isArray(value['indicators']) &&
    value['indicators'].length <= 50 &&
    value['indicators'].every(
      (item: unknown) =>
        record(item) &&
        member(item['type'], ['ip', 'domain', 'email', 'hash', 'url', 'process']) &&
        text(item['value']),
    ) &&
    Array.isArray(value['timeline']) &&
    value['timeline'].length <= 100 &&
    value['timeline'].every(
      (item: unknown) =>
        record(item) &&
        date(item['timestamp']) &&
        member(item['type'], ['detected', 'enriched', 'investigation', 'status']) &&
        text(item['label']) &&
        (item['description'] === undefined || text(item['description'])) &&
        (item['actor'] === undefined || text(item['actor'])),
    )
  );
}
export function parseRealtimeEvent(value: unknown): RealtimeEvent | null {
  if (
    !record(value) ||
    !text(value['id'], 128) ||
    !date(value['timestamp']) ||
    !record(value['payload'])
  )
    return null;
  const payload = value['payload'];
  let valid = false;
  switch (value['type']) {
    case 'threat.created':
      valid =
        threat(payload['threat']) &&
        record(payload['threat']) &&
        Date.parse(String(payload['threat']['detectedAt'])) <=
          Date.parse(String(payload['threat']['updatedAt'])) &&
        Date.parse(String(payload['threat']['updatedAt'])) <= Date.parse(value['timestamp']);
      break;
    case 'threat.updated': {
      const changes = payload['changes'];
      valid =
        typeof payload['threatId'] === 'string' &&
        /^THR-\d{5}$/.test(payload['threatId']) &&
        previous(payload['previous']) &&
        record(changes) &&
        Object.keys(changes).length > 0 &&
        Object.entries(changes).every(([key, item]) =>
          key === 'status'
            ? member(item, statuses)
            : key === 'severity'
              ? member(item, severities)
              : key === 'confidence'
                ? score(item)
                : ['title', 'description', 'source', 'target'].includes(key) && text(item),
        );
      break;
    }
    case 'threat.resolved':
      valid =
        typeof payload['threatId'] === 'string' &&
        /^THR-\d{5}$/.test(payload['threatId']) &&
        previous(payload['previous']);
      break;
    case 'device.status.changed':
      valid =
        typeof payload['deviceId'] === 'string' &&
        /^DEV-\d{5}$/.test(payload['deviceId']) &&
        member(payload['previousStatus'], devices) &&
        member(payload['status'], devices);
      break;
    case 'security.score.changed':
      valid = score(payload['score']);
      break;
  }
  return valid ? (value as unknown as RealtimeEvent) : null;
}
