import {
  createdEvent,
  liveThreat,
  LIVE_TIME,
  resolvedEvent,
  updatedEvent,
} from '../../../core/realtime/realtime.test-fixtures';
import { createDashboardSummary } from './dashboard.fixtures';
import { applyDashboardEvent } from './dashboard-live';
describe('Dashboard live projection', () => {
  const metric = (data: ReturnType<typeof createDashboardSummary>, id: string) =>
    data.metrics.find((item) => item.id === id)!.value;
  it('increments open and critical KPIs, prepends marked activity and only changes the latest time bucket', () => {
    const data = createDashboardSummary('24h', LIVE_TIME);
    const updated = applyDashboardEvent(data, createdEvent());
    expect(metric(updated, 'active')).toBe(metric(data, 'active') + 1);
    expect(metric(updated, 'critical')).toBe(metric(data, 'critical') + 1);
    expect(updated.recent[0]).toMatchObject({ id: 'THR-22001', live: true });
    expect(updated.activity.slice(0, -1)).toEqual(data.activity.slice(0, -1));
    expect(updated.activity.at(-1)?.detected).toBe(data.activity.at(-1)!.detected + 1);
    expect(updated.vectors[0].count).toBe(data.vectors[0].count + 1);
    expect(updated.severities[0].count).toBe(data.severities[0].count + 1);
    expect(updated.origins).toBe(data.origins);
  });
  it('does not increase critical counts for a high threat or active counts for a resolved detection', () => {
    const data = createDashboardSummary('24h', LIVE_TIME);
    const high = applyDashboardEvent(
      data,
      createdEvent('high', liveThreat('THR-22002', { severity: 'high' })),
    );
    expect(metric(high, 'critical')).toBe(metric(data, 'critical'));
    const closed = applyDashboardEvent(
      data,
      createdEvent('closed', liveThreat('THR-22003', { status: 'resolved' })),
    );
    expect(metric(closed, 'active')).toBe(metric(data, 'active'));
    expect(metric(closed, 'critical')).toBe(metric(data, 'critical'));
  });
  it('updates score without changing chart datasets, feed or unrelated KPIs', () => {
    const data = createDashboardSummary('24h', LIVE_TIME);
    const next = applyDashboardEvent(data, {
      id: 'score',
      type: 'security.score.changed',
      timestamp: LIVE_TIME.toISOString(),
      payload: { score: 74 },
    });
    expect(metric(next, 'score')).toBe(74);
    expect(next.activity).toBe(data.activity);
    expect(next.severities).toBe(data.severities);
    expect(next.vectors).toBe(data.vectors);
    expect(next.recent).toBe(data.recent);
    expect(next.metrics[0]).toBe(data.metrics[0]);
  });
  it('updates recent status and decreases active/critical KPIs on resolution', () => {
    const data = applyDashboardEvent(createDashboardSummary('24h', LIVE_TIME), createdEvent());
    const next = applyDashboardEvent(data, resolvedEvent());
    expect(metric(next, 'active')).toBe(metric(data, 'active') - 1);
    expect(metric(next, 'critical')).toBe(metric(data, 'critical') - 1);
    expect(next.recent[0].status).toBe('resolved');
    expect(next.activity).toBe(data.activity);
  });
  it('handles severity changes and bounds recent activity at fifteen entries', () => {
    let data = createDashboardSummary('24h', LIVE_TIME);
    for (let i = 0; i < 30; i++)
      data = applyDashboardEvent(data, createdEvent(`event-${i}`, liveThreat(`THR-${22000 + i}`)));
    expect(data.recent).toHaveLength(15);
    expect(data.recent[0].id).toBe('THR-22029');
    const updated = applyDashboardEvent(data, updatedEvent('THR-22029', { severity: 'high' }));
    expect(metric(updated, 'critical')).toBe(metric(data, 'critical') - 1);
  });
  it('ignores device events and a create already in the feed', () => {
    const data = applyDashboardEvent(createDashboardSummary('24h', LIVE_TIME), createdEvent());
    expect(applyDashboardEvent(data, createdEvent())).toBe(data);
    expect(
      applyDashboardEvent(data, {
        id: 'device',
        type: 'device.status.changed',
        timestamp: LIVE_TIME.toISOString(),
        payload: { deviceId: 'DEV-00142', status: 'offline', previousStatus: 'online' },
      }),
    ).toBe(data);
  });
});
