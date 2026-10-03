import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MOCK_REALTIME_CONFIG, MockRealtimeTransport } from './mock-realtime.transport';
import { parseRealtimeEvent } from './realtime-validation';
import { LIVE_TIME } from './realtime.test-fixtures';
describe('MockRealtimeTransport', () => {
  let transport: MockRealtimeTransport;
  let events: unknown[];
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_TIME);
    TestBed.configureTestingModule({
      providers: [
        MockRealtimeTransport,
        { provide: MOCK_REALTIME_CONFIG, useValue: { connectDelay: 150, interval: 8000 } },
      ],
    });
    transport = TestBed.inject(MockRealtimeTransport);
    events = [];
    transport.events$.subscribe((event) => events.push(event));
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('connects once and emits a deterministic validated mixture every eight seconds', () => {
    const states: string[] = [];
    transport.connectionState$.subscribe((state) => states.push(state));
    transport.connect();
    transport.connect();
    expect(states).toEqual(['disconnected', 'connecting']);
    vi.advanceTimersByTime(150);
    expect(states.at(-1)).toBe('connected');
    vi.advanceTimersByTime(64000);
    const parsed = events.map(parseRealtimeEvent);
    expect(parsed.every(Boolean)).toBe(true);
    expect(parsed.map((event) => event?.type)).toEqual([
      'threat.created',
      'threat.updated',
      'threat.created',
      'device.status.changed',
      'threat.updated',
      'threat.resolved',
      'threat.created',
      'security.score.changed',
    ]);
    expect(parsed[0]?.id).toBe('mock-live-event-1');
  });
  it('pauses and resumes without multiplying timers or resetting event IDs', () => {
    transport.connect();
    vi.advanceTimersByTime(150 + 8000);
    transport.pause();
    vi.advanceTimersByTime(24000);
    expect(events).toHaveLength(1);
    transport.resume();
    transport.resume();
    vi.advanceTimersByTime(8000);
    expect(events).toHaveLength(2);
    expect(parseRealtimeEvent(events[1])?.id).toBe('mock-live-event-2');
  });
  it('disconnect cancels an in-flight handshake and all event timers', () => {
    const states: string[] = [];
    transport.connectionState$.subscribe((state) => states.push(state));
    transport.connect();
    transport.disconnect();
    vi.advanceTimersByTime(50000);
    expect(states.at(-1)).toBe('disconnected');
    expect(states).not.toContain('connected');
    expect(events).toHaveLength(0);
    transport.connect();
    vi.advanceTimersByTime(8150);
    expect(events).toHaveLength(1);
    transport.disconnect();
    vi.advanceTimersByTime(50000);
    expect(events).toHaveLength(1);
  });
  it('a dropped connection stops generation and can be reconnected', () => {
    transport.connect();
    vi.advanceTimersByTime(150);
    transport.simulateDrop();
    vi.advanceTimersByTime(16000);
    expect(events).toHaveLength(0);
    transport.connect();
    vi.advanceTimersByTime(8150);
    expect(events).toHaveLength(1);
  });
  it('destroys its timers and streams even without a central service', () => {
    transport.connect();
    vi.advanceTimersByTime(150);
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(50000);
    expect(events).toHaveLength(0);
  });
});
