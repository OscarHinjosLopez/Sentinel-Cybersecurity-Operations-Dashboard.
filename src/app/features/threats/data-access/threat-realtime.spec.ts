import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import {
  MockRealtimeTransport,
  MOCK_REALTIME_CONFIG,
} from '../../../core/realtime/mock-realtime.transport';
import { REALTIME_TRANSPORT } from '../../../core/realtime/realtime.transport';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import {
  createdEvent,
  liveThreat,
  LIVE_TIME,
  resolvedEvent,
  updatedEvent,
} from '../../../core/realtime/realtime.test-fixtures';
import {
  DASHBOARD_MOCK_CONFIG,
  DASHBOARD_REPOSITORY,
  MockDashboardRepository,
} from '../../dashboard/data-access/dashboard.repository';
import { DashboardStore } from '../../dashboard/data-access/dashboard.store';
import { createDashboardSummary } from '../../dashboard/data-access/dashboard.fixtures';
import { DashboardSummary } from '../../dashboard/models/dashboard.models';
import {
  MockDeviceRepository,
  DEVICE_MOCK_CONFIG,
} from '../../devices/data-access/device.repository';
import { ThreatListStore } from './threat-list.store';
import { ThreatDetailStore } from './threat-detail.store';
import { MockThreatRepository, THREAT_MOCK_CONFIG, THREAT_REPOSITORY } from './threat.repository';
import { DEFAULT_THREAT_QUERY } from '../utils/threat-query';
import { Threat } from '../models/threat.models';
describe('Realtime feature integration', () => {
  let transport: MockRealtimeTransport;
  let realtime: RealtimeService;
  const authenticated = signal(true);
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_TIME);
    authenticated.set(true);
    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        MockRealtimeTransport,
        MockThreatRepository,
        MockDashboardRepository,
        MockDeviceRepository,
        ThreatListStore,
        ThreatDetailStore,
        DashboardStore,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated,
            hasPermission: () => true,
            currentUser: () => ({ name: 'Test analyst' }),
          },
        },
        { provide: REALTIME_TRANSPORT, useExisting: MockRealtimeTransport },
        { provide: MOCK_REALTIME_CONFIG, useValue: { connectDelay: 0, interval: 8000 } },
        { provide: THREAT_REPOSITORY, useExisting: MockThreatRepository },
        { provide: THREAT_MOCK_CONFIG, useValue: { latency: 20, scenario: 'success' } },
        { provide: DASHBOARD_REPOSITORY, useExisting: MockDashboardRepository },
        { provide: DASHBOARD_MOCK_CONFIG, useValue: { latency: 20, scenario: 'success' } },
        { provide: DEVICE_MOCK_CONFIG, useValue: { latency: 20, scenario: 'success' } },
      ],
    });
    realtime = TestBed.inject(RealtimeService);
    transport = TestBed.inject(MockRealtimeTransport);
    transport.pause();
    TestBed.inject(MockThreatRepository);
    TestBed.inject(MockDashboardRepository);
    TestBed.inject(MockDeviceRepository);
    TestBed.tick();
    vi.advanceTimersByTime(0);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('inserts matching critical threats sorted across the whole query, increments totals once and ignores non-matching creates', () => {
    const store = TestBed.inject(ThreatListStore);
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, severities: ['critical'] });
    vi.advanceTimersByTime(20);
    const total = store.total();
    const event = createdEvent();
    transport.emitForTesting(event);
    transport.emitForTesting(event);
    transport.emitForTesting(createdEvent('high', liveThreat('THR-22002', { severity: 'high' })));
    vi.advanceTimersByTime(120);
    expect(store.total()).toBe(total + 1);
    expect(store.data()[0].id).toBe('THR-22001');
    expect(store.data().every((threat) => threat.severity === 'critical')).toBe(true);
    expect(store.isLoading()).toBe(false);
  });
  it('keeps sort and page boundaries for live creates', () => {
    const store = TestBed.inject(ThreatListStore);
    store.applyQuery({
      ...DEFAULT_THREAT_QUERY,
      sortBy: 'confidence',
      sortDirection: 'asc',
      page: 2,
      pageSize: 10,
    });
    vi.advanceTimersByTime(20);
    transport.emitForTesting(createdEvent('new', liveThreat('THR-22001', { confidence: 0 })));
    vi.advanceTimersByTime(120);
    expect(store.total()).toBe(201);
    expect(store.query().page).toBe(2);
    expect(store.data()).toHaveLength(10);
    expect(store.data().map((threat) => threat.confidence)).toEqual(
      store
        .data()
        .map((threat) => threat.confidence)
        .sort((a, b) => a - b),
    );
    expect(store.data().some((threat) => threat.id === 'THR-22001')).toBe(false);
  });
  it('removes resolved records from an open filter and fills the page again', () => {
    const store = TestBed.inject(ThreatListStore);
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, statuses: ['open'] });
    vi.advanceTimersByTime(20);
    transport.emitForTesting(createdEvent());
    vi.advanceTimersByTime(120);
    const total = store.total();
    transport.emitForTesting(resolvedEvent());
    vi.advanceTimersByTime(120);
    expect(store.total()).toBe(total - 1);
    expect(store.data().some((threat) => threat.id === 'THR-22001')).toBe(false);
    expect(store.data()).toHaveLength(25);
  });
  it('clamps an emptied final page without breaking query state', () => {
    const store = TestBed.inject(ThreatListStore);
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, search: 'Live credential', pageSize: 10 });
    vi.advanceTimersByTime(20);
    for (let i = 0; i < 11; i++)
      transport.emitForTesting(createdEvent(`new-${i}`, liveThreat(`THR-${22000 + i}`)));
    vi.advanceTimersByTime(120);
    store.setPage(2);
    vi.advanceTimersByTime(20);
    expect(store.data()).toHaveLength(1);
    store.setStatusFilter(['open']);
    vi.advanceTimersByTime(20);
    store.setPage(2);
    vi.advanceTimersByTime(20);
    transport.emitForTesting(resolvedEvent('THR-22000'));
    vi.advanceTimersByTime(140);
    expect(store.query().page).toBe(1);
    expect(store.total()).toBe(10);
    expect(store.data()).toHaveLength(10);
  });
  it('applies an update to the current detail without issuing another repository request and ignores unrelated updates', () => {
    transport.emitForTesting(createdEvent());
    const repository = TestBed.inject(MockThreatRepository);
    const spy = vi.spyOn(repository, 'getById');
    const store = TestBed.inject(ThreatDetailStore);
    store.load('THR-22001');
    vi.advanceTimersByTime(20);
    const original = store.data();
    transport.emitForTesting(updatedEvent('THR-22002'));
    expect(store.data()).toBe(original);
    transport.emitForTesting(
      updatedEvent('THR-22001', { status: 'investigating', confidence: 97 }),
    );
    expect(store.data()).toMatchObject({ status: 'investigating', confidence: 97 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.isLoading()).toBe(false);
  });
  it('prevents an older detail response from overwriting an event received during loading', () => {
    transport.emitForTesting(createdEvent());
    const response = new Subject<Threat | null>();
    const repository = TestBed.inject(MockThreatRepository);
    vi.spyOn(repository, 'getById').mockReturnValue(response);
    const store = TestBed.inject(ThreatDetailStore);
    store.load('THR-22001');
    transport.emitForTesting(updatedEvent());
    response.next(liveThreat());
    expect(store.data()?.status).toBe('investigating');
  });
  it('does not let an old mutation response undo a more recent live detail update', () => {
    transport.emitForTesting(createdEvent());
    const store = TestBed.inject(ThreatDetailStore);
    store.load('THR-22001');
    vi.advanceTimersByTime(20);
    const response = new Subject<Threat>();
    vi.spyOn(TestBed.inject(MockThreatRepository), 'updateStatus').mockReturnValue(response);
    store.updateStatus('investigating');
    transport.emitForTesting(resolvedEvent());
    response.next({
      ...liveThreat(),
      status: 'investigating',
      updatedAt: new Date(LIVE_TIME.getTime() + 1000).toISOString(),
    });
    expect(store.data()?.status).toBe('resolved');
  });
  it('dashboard refresh and range changes preserve live deltas without double counting', () => {
    const store = TestBed.inject(DashboardStore);
    store.load();
    vi.advanceTimersByTime(20);
    const value = store.data()!.metrics[0].value;
    transport.emitForTesting(createdEvent());
    expect(store.data()!.metrics[0].value).toBe(value + 1);
    store.refresh();
    vi.advanceTimersByTime(20);
    expect(store.data()!.metrics[0].value).toBe(value + 1);
    store.changeRange('7d');
    vi.advanceTimersByTime(20);
    expect(store.data()!.metrics[0].value).toBe(
      createDashboardSummary('7d', LIVE_TIME).metrics[0].value + 1,
    );
  });
  it('merges live events over an older dashboard response during a request', () => {
    const response = new Subject<DashboardSummary | null>();
    vi.spyOn(TestBed.inject(MockDashboardRepository), 'getSummary').mockReturnValue(response);
    const store = TestBed.inject(DashboardStore);
    store.load();
    transport.emitForTesting(createdEvent());
    const summary = createDashboardSummary('24h', LIVE_TIME);
    response.next(summary);
    expect(store.data()!.metrics[0].value).toBe(summary.metrics[0].value + 1);
  });
  it('keeps aggregate dashboard state after replay journal eviction', () => {
    const store = TestBed.inject(DashboardStore);
    store.load();
    vi.advanceTimersByTime(20);
    const count = store.data()!.metrics[0].value;
    transport.emitForTesting(createdEvent());
    for (let i = 0; i < 501; i++)
      transport.emitForTesting({
        id: `score-${i}`,
        type: 'security.score.changed',
        timestamp: new Date(LIVE_TIME.getTime() + 1000 + i).toISOString(),
        payload: { score: 84 },
      });
    expect(realtime.snapshot().events.some((event) => event.type === 'threat.created')).toBe(false);
    store.refresh();
    vi.advanceTimersByTime(20);
    expect(store.data()!.metrics[0].value).toBe(count + 1);
  });
  it('preserves loaded dashboard, list and detail during a forced connection drop', () => {
    const dashboard = TestBed.inject(DashboardStore);
    const list = TestBed.inject(ThreatListStore);
    const detail = TestBed.inject(ThreatDetailStore);
    dashboard.load();
    list.load();
    detail.load('THR-00001');
    vi.advanceTimersByTime(20);
    const before = [dashboard.data(), list.data(), detail.data()];
    transport.simulateDrop();
    expect(realtime.connectionState()).toBe('reconnecting');
    expect([dashboard.data(), list.data(), detail.data()]).toEqual(before);
    expect(dashboard.error()).toBeNull();
    expect(list.error()).toBeNull();
    expect(detail.error()).toBeNull();
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1);
    expect(realtime.connectionState()).toBe('connected');
  });
  it('keeps device repository status coherent and protects newer local containment actions', () => {
    const repository = TestBed.inject(MockDeviceRepository);
    transport.emitForTesting({
      id: 'device',
      type: 'device.status.changed',
      timestamp: LIVE_TIME.toISOString(),
      payload: { deviceId: 'DEV-00142', previousStatus: 'online', status: 'offline' },
    });
    let status = '';
    repository.getById('DEV-00142').subscribe((device) => (status = device!.status));
    vi.advanceTimersByTime(20);
    expect(status).toBe('offline');
    realtime.markUpdated('device:DEV-00142', new Date(LIVE_TIME.getTime() + 2000).toISOString());
    transport.emitForTesting({
      id: 'device-old',
      type: 'device.status.changed',
      timestamp: new Date(LIVE_TIME.getTime() + 1000).toISOString(),
      payload: { deviceId: 'DEV-00142', previousStatus: 'offline', status: 'online' },
    });
    repository.getById('DEV-00142').subscribe((device) => (status = device!.status));
    vi.advanceTimersByTime(20);
    expect(status).toBe('offline');
  });
  it('releases feature subscriptions on destruction', () => {
    const list = TestBed.inject(ThreatListStore);
    list.load();
    vi.advanceTimersByTime(20);
    TestBed.inject(ThreatDetailStore);
    TestBed.inject(DashboardStore);
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });
});
