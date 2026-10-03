import { parseRealtimeEvent } from './realtime-validation';
import { createdEvent, LIVE_TIME, resolvedEvent, updatedEvent } from './realtime.test-fixtures';
describe('Realtime event validation', () => {
  it('accepts the five domain events', () => {
    const events = [
      createdEvent(),
      updatedEvent(),
      resolvedEvent(),
      {
        id: 'device',
        type: 'device.status.changed',
        timestamp: LIVE_TIME.toISOString(),
        payload: { deviceId: 'DEV-00142', previousStatus: 'online', status: 'offline' },
      },
      {
        id: 'score',
        type: 'security.score.changed',
        timestamp: LIVE_TIME.toISOString(),
        payload: { score: 92 },
      },
    ];
    for (const event of events) expect(parseRealtimeEvent(event)).toEqual(event);
  });
  it.each([
    null,
    undefined,
    42,
    [],
    {},
    'raw JSON',
    { ...createdEvent(), type: 'audit.created' },
    { ...createdEvent(), id: '' },
    { ...createdEvent(), timestamp: 'invalid' },
    { ...createdEvent(), payload: null },
  ])('rejects invalid envelopes %#', (value) => expect(parseRealtimeEvent(value)).toBeNull());
  it('rejects arbitrary patch keys, invalid enums and nonfinite scores', () => {
    const update = updatedEvent();
    for (const changes of [
      {},
      { id: 'THR-22222' },
      { confidence: NaN },
      { status: 'deleted' },
      { severity: 'urgent' },
      { description: { nested: true } },
      { vector: 'malware' },
    ])
      expect(parseRealtimeEvent({ ...update, payload: { ...update.payload, changes } })).toBeNull();
    for (const score of [-1, 101, Infinity, '90'])
      expect(
        parseRealtimeEvent({
          id: 'score',
          type: 'security.score.changed',
          timestamp: LIVE_TIME.toISOString(),
          payload: { score },
        }),
      ).toBeNull();
  });
  it('validates nested threat values, collection limits and timestamp chronology', () => {
    const event = createdEvent();
    for (const patch of [
      { id: 'THR-wrong' },
      { timeline: [{ type: 'deleted', timestamp: event.timestamp, label: 'x' }] },
      { indicators: [{ type: 'sql', value: 'x' }] },
      { indicators: Array.from({ length: 51 }, () => ({ type: 'ip', value: '1.2.3.4' })) },
      { updatedAt: new Date(LIVE_TIME.getTime() + 1000).toISOString() },
    ])
      expect(
        parseRealtimeEvent({
          ...event,
          payload: { threat: { ...event.payload.threat, ...patch } },
        }),
      ).toBeNull();
  });
});
