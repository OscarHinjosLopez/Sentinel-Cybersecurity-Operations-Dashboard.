import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { ConnectionState, RealtimeEvent } from './realtime.models';
import { REALTIME_TRANSPORT } from './realtime.transport';
import { RealtimeService } from './realtime.service';
import { createdEvent, LIVE_TIME, resolvedEvent, updatedEvent } from './realtime.test-fixtures';
describe('RealtimeService', () => {
  const authenticated = signal(false);
  let states: BehaviorSubject<ConnectionState>;
  let incoming: Subject<unknown>;
  let service: RealtimeService;
  let fail: boolean;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let accepted: RealtimeEvent[];
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_TIME);
    authenticated.set(false);
    fail = false;
    states = new BehaviorSubject<ConnectionState>('disconnected');
    incoming = new Subject<unknown>();
    accepted = [];
    connect = vi.fn(() => {
      states.next('connecting');
      if (fail) states.next('error');
      else states.next('connected');
    });
    disconnect = vi.fn(() => states.next('disconnected'));
    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        {
          provide: REALTIME_TRANSPORT,
          useValue: { connect, disconnect, events$: incoming, connectionState$: states },
        },
      ],
    });
    service = TestBed.inject(RealtimeService);
    service.events$.subscribe((event) => accepted.push(event));
    TestBed.tick();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  function login(): void {
    authenticated.set(true);
    TestBed.tick();
  }
  it('opens no connection without a session, then connects exactly once on login and navigation', () => {
    service.connect();
    expect(connect).not.toHaveBeenCalled();
    login();
    service.connect();
    service.connect();
    TestBed.tick();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(service.connectionState()).toBe('connected');
  });
  it('logout clears state, stops retries and rejects late events', () => {
    login();
    incoming.next(createdEvent());
    states.next('error');
    authenticated.set(false);
    TestBed.tick();
    vi.advanceTimersByTime(60000);
    incoming.next(updatedEvent());
    expect(connect).toHaveBeenCalledTimes(1);
    expect(service.connectionState()).toBe('disconnected');
    expect(service.events()).toEqual([]);
    expect(service.lastEventAt()).toBeNull();
    expect(service.processedCount).toBe(0);
  });
  it('restored authentication opens a single shared connection', () => {
    authenticated.set(true);
    TestBed.tick();
    service.connect();
    TestBed.tick();
    expect(connect).toHaveBeenCalledTimes(1);
  });
  it('uses 1/2/4/8/15/15 second backoff and resets attempts after recovery', () => {
    fail = true;
    login();
    expect(service.connectionState()).toBe('reconnecting');
    for (const [index, delay] of [1000, 2000, 4000, 8000, 15000, 15000].entries()) {
      expect(service.reconnectAttempt()).toBe(index + 1);
      vi.advanceTimersByTime(delay - 1);
      expect(connect).toHaveBeenCalledTimes(index + 1);
      vi.advanceTimersByTime(1);
      expect(connect).toHaveBeenCalledTimes(index + 2);
    }
    fail = false;
    vi.advanceTimersByTime(15000);
    expect(service.connectionState()).toBe('connected');
    expect(service.reconnectAttempt()).toBe(0);
    states.next('error');
    vi.advanceTimersByTime(999);
    expect(service.reconnectAttempt()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(service.connectionState()).toBe('connected');
  });
  it('manual disconnect while authenticated does not reconnect or retain events', () => {
    login();
    incoming.next(createdEvent());
    states.next('error');
    service.disconnect();
    TestBed.tick();
    vi.advanceTimersByTime(60000);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(service.connectionState()).toBe('disconnected');
    expect(service.events()).toEqual([]);
    service.connect();
    expect(connect).toHaveBeenCalledTimes(2);
  });
  it('schedules only one retry for repeated failure notifications', () => {
    login();
    states.next('error');
    states.next('disconnected');
    states.next('error');
    expect(service.reconnectAttempt()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(connect).toHaveBeenCalledTimes(2);
  });
  it('handles synchronous transport exceptions with capped retry instead of crashing', () => {
    connect.mockImplementation(() => {
      throw new Error('connection unavailable');
    });
    login();
    expect(service.connectionState()).toBe('reconnecting');
    vi.advanceTimersByTime(1000);
    expect(service.reconnectAttempt()).toBe(2);
  });
  it('ignores duplicate IDs, duplicate creates and out-of-order entity updates', () => {
    login();
    const created = createdEvent();
    incoming.next(created);
    incoming.next(created);
    incoming.next({
      ...created,
      id: 'another-create',
      timestamp: new Date(LIVE_TIME.getTime() + 100).toISOString(),
    });
    incoming.next(updatedEvent());
    incoming.next(updatedEvent('THR-22001', { status: 'open' }, 500));
    expect(accepted).toHaveLength(2);
    expect(service.events()[0].type).toBe('threat.updated');
    expect(service.lastEventAt()?.getTime()).toBe(LIVE_TIME.getTime() + 1000);
  });
  it('preserves deduplication and timestamps across reconnects', () => {
    login();
    const event = createdEvent();
    incoming.next(event);
    states.next('error');
    vi.advanceTimersByTime(1000);
    incoming.next(event);
    expect(accepted).toHaveLength(1);
  });
  it('uses remembered state to keep repeated resolutions from decrementing active KPIs twice', () => {
    login();
    incoming.next(createdEvent());
    incoming.next(resolvedEvent());
    incoming.next(resolvedEvent('THR-22001', 3000));
    const last = accepted.at(-1);
    expect(last?.type).toBe('threat.resolved');
    if (last?.type === 'threat.resolved') expect(last.payload.previous.status).toBe('resolved');
  });
  it('rejects stream events older than local mutations', () => {
    login();
    service.markUpdated('threat:THR-22001', new Date(LIVE_TIME.getTime() + 2000).toISOString(), {
      status: 'resolved',
      severity: 'critical',
    });
    incoming.next(updatedEvent());
    expect(accepted).toEqual([]);
  });
  it('bounds IDs at 1000, journal at 500 and recent events at 20', () => {
    login();
    for (let i = 0; i < 1200; i++)
      incoming.next({
        id: `score-${i}`,
        type: 'security.score.changed',
        timestamp: new Date(LIVE_TIME.getTime() + i).toISOString(),
        payload: { score: 85 },
      });
    expect(service.processedCount).toBe(1000);
    expect(service.snapshot().events).toHaveLength(500);
    expect(service.events()).toHaveLength(20);
    expect(service.snapshot().revision).toBe(1200);
    expect(service.eventsSince(1198)).toHaveLength(2);
  });
  it('ignores malformed events and keeps valid events flowing', () => {
    login();
    for (const value of [
      null,
      {},
      '{broken',
      createdEvent('x', { ...createdEvent().payload.threat, confidence: Infinity }),
      updatedEvent('THR-22001', { confidence: -1 }),
    ])
      incoming.next(value);
    incoming.next(createdEvent());
    expect(accepted).toHaveLength(1);
  });
  it('replays the bounded journal to repositories before notifying UI and unregisters on destruction', () => {
    login();
    incoming.next(createdEvent());
    const calls: string[] = [];
    const unregister = service.registerConsumer((event) => calls.push(event.id));
    service.events$.subscribe((event) => {
      if (event.type === 'threat.updated') expect(calls).toContain(event.id);
    });
    incoming.next(updatedEvent());
    unregister();
    incoming.next(resolvedEvent());
    expect(calls).toHaveLength(2);
    TestBed.resetTestingModule();
    expect(incoming.observed).toBe(false);
    expect(states.observed).toBe(false);
  });
});
