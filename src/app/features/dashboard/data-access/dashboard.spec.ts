import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Subject } from 'rxjs';
import { createDashboardSummary } from './dashboard.fixtures';
import {
  DASHBOARD_MOCK_CONFIG,
  DASHBOARD_REPOSITORY,
  MockDashboardRepository,
} from './dashboard.repository';
import { DashboardStore } from './dashboard.store';
import { DashboardSummary, DashboardTimeRange } from '../models/dashboard.models';

const now = new Date('2026-10-03T12:00:00Z');
describe('Dashboard mock data', () => {
  it.each([
    { range: '24h', points: 24 },
    { range: '7d', points: 7 },
    { range: '30d', points: 30 },
  ] as const)('generates coherent deterministic $range data', ({ range, points }) => {
    const data = createDashboardSummary(range, now);
    expect(data).toEqual(createDashboardSummary(range, now));
    expect(data.activity).toHaveLength(points);
    const total = data.activity.reduce((sum, point) => sum + point.detected, 0);
    expect(data.severities.reduce((sum, item) => sum + item.count, 0)).toBe(total);
    expect(data.vectors.reduce((sum, item) => sum + item.count, 0)).toBe(total);
    expect(data.origins.reduce((sum, item) => sum + item.count, 0)).toBe(total);
    expect(data.activity.every((point) => point.blocked <= point.detected)).toBe(true);
    expect(data.vectors.map((item) => item.count)).toEqual(
      data.vectors.map((item) => item.count).sort((a, b) => b - a),
    );
  });
  it.each(['success', 'error', 'empty'] as const)(
    'supports the internal %s scenario',
    async (scenario) => {
      TestBed.configureTestingModule({
        providers: [
          MockDashboardRepository,
          { provide: DASHBOARD_MOCK_CONFIG, useValue: { latency: 0, scenario } },
        ],
      });
      const result = firstValueFrom(TestBed.inject(MockDashboardRepository).getSummary('24h'));
      if (scenario === 'error') await expect(result).rejects.toThrow();
      else
        expect(await result).toEqual(
          scenario === 'empty' ? null : expect.objectContaining({ range: '24h' }),
        );
    },
  );
});
describe('DashboardStore', () => {
  let store: DashboardStore;
  let requests: { range: DashboardTimeRange; response: Subject<DashboardSummary | null> }[];
  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        {
          provide: DASHBOARD_REPOSITORY,
          useValue: {
            getSummary: (range: DashboardTimeRange) => {
              const response = new Subject<DashboardSummary | null>();
              requests.push({ range, response });
              return response;
            },
          },
        },
      ],
    });
    store = TestBed.inject(DashboardStore);
  });
  it('exposes loading and derived totals, then a successful timestamp', () => {
    store.load();
    expect(store.isLoading()).toBe(true);
    expect(store.lastUpdated()).toBeNull();
    requests[0].response.next(createDashboardSummary('24h', now));
    expect(store.isLoading()).toBe(false);
    expect(store.detectedTotal()).toBeGreaterThan(0);
    expect(store.lastUpdated()).toBeInstanceOf(Date);
  });
  it('cancels an older range request and cannot overwrite the latest selection', () => {
    store.load();
    store.changeRange('7d');
    store.changeRange('30d');
    expect(requests[0].response.observed).toBe(false);
    expect(requests[1].response.observed).toBe(false);
    requests[2].response.next(createDashboardSummary('30d', now));
    requests[0].response.next(createDashboardSummary('24h', now));
    expect(store.selectedRange()).toBe('30d');
    expect(store.data()?.range).toBe('30d');
  });
  it('retains existing content during refresh', () => {
    store.load();
    const data = createDashboardSummary('24h', now);
    requests[0].response.next(data);
    store.refresh();
    expect(store.data()).toBe(data);
    expect(store.isLoading()).toBe(true);
    requests[1].response.next({ ...data, generatedAt: new Date().toISOString() });
    expect(store.isLoading()).toBe(false);
  });
  it('offers a generic error and retries successfully', () => {
    store.load();
    requests[0].response.error(new Error('private internal details'));
    expect(store.error()).toBe('Unable to load security overview.');
    expect(store.isLoading()).toBe(false);
    store.retry();
    expect(store.error()).toBeNull();
    requests[1].response.next(createDashboardSummary('24h', now));
    expect(store.data()).not.toBeNull();
  });
  it('represents empty responses without fabricated metrics', () => {
    store.load();
    requests[0].response.next(null);
    expect(store.isEmpty()).toBe(true);
    expect(store.data()).toBeNull();
    expect(store.detectedTotal()).toBe(0);
  });
  it('avoids reloading the same range', () => {
    store.load();
    store.changeRange('24h');
    expect(requests).toHaveLength(1);
  });
  it('cleans up pending requests when the injector is destroyed', () => {
    store.load();
    TestBed.resetTestingModule();
    expect(requests[0].response.observed).toBe(false);
  });
});
