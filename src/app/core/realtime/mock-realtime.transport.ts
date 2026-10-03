import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { ConnectionState, RealtimeEvent } from './realtime.models';
import { RealtimeTransport } from './realtime.transport';
import type { Threat } from '../../features/threats/models/threat.models';
export const MOCK_REALTIME_CONFIG = new InjectionToken<{ connectDelay: number; interval: number }>(
  'MockRealtimeConfig',
  { providedIn: 'root', factory: () => ({ connectDelay: 150, interval: 8000 }) },
);
@Injectable()
export class MockRealtimeTransport implements RealtimeTransport {
  private readonly config = inject(MOCK_REALTIME_CONFIG);
  private readonly incoming = new Subject<unknown>();
  private readonly state = new BehaviorSubject<ConnectionState>('disconnected');
  readonly events$ = this.incoming.asObservable();
  readonly connectionState$ = this.state.asObservable();
  private handshake?: ReturnType<typeof setTimeout>;
  private ticker?: ReturnType<typeof setInterval>;
  private generation = 0;
  private sequence = 0;
  private created = 0;
  private paused = false;
  private latest?: Threat;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.disconnect();
      this.incoming.complete();
      this.state.complete();
    });
  }
  connect(): void {
    if (this.state.value === 'connecting' || this.state.value === 'connected') return;
    const generation = ++this.generation;
    this.state.next('connecting');
    this.handshake = setTimeout(() => {
      if (generation !== this.generation) return;
      this.state.next('connected');
      this.startTicker();
    }, this.config.connectDelay);
  }
  disconnect(): void {
    this.stop();
    this.state.next('disconnected');
  }
  pause(): void {
    this.paused = true;
    clearInterval(this.ticker);
    this.ticker = undefined;
  }
  resume(): void {
    this.paused = false;
    this.startTicker();
  }
  simulateDrop(): void {
    this.stop();
    this.state.next('error');
  }
  emitForTesting(event: unknown): void {
    if (this.state.value === 'connected') this.incoming.next(event);
  }
  private stop(): void {
    this.generation++;
    clearTimeout(this.handshake);
    clearInterval(this.ticker);
    this.handshake = undefined;
    this.ticker = undefined;
  }
  private startTicker(): void {
    if (this.paused || this.ticker || this.state.value !== 'connected') return;
    this.ticker = setInterval(
      () => this.incoming.next(this.generate(new Date())),
      this.config.interval,
    );
  }
  private generate(now: Date): RealtimeEvent {
    const sequence = ++this.sequence;
    const timestamp = now.toISOString();
    const id = `mock-live-event-${sequence}`;
    const kind = (sequence - 1) % 8;
    if (kind === 0 || kind === 2 || kind === 6 || !this.latest) {
      const number = 20000 + (++this.created % 79999);
      const severity =
        this.created % 3 === 1 ? 'critical' : this.created % 3 === 2 ? 'high' : 'medium';
      const threat: Threat = {
        id: `THR-${String(number).padStart(5, '0')}`,
        title:
          severity === 'critical'
            ? 'Credential attack detected in live stream'
            : 'Suspicious endpoint activity detected',
        description:
          'Fictitious live detection from the simulated Sentinel stream. Review source context and validate the affected endpoint before closing.',
        severity,
        status: 'open',
        vector: 'credential-attack',
        source: '203.0.113.24',
        target: 'Identity Gateway',
        detectedAt: timestamp,
        updatedAt: timestamp,
        confidence: 91,
        indicators: [{ type: 'ip', value: '203.0.113.24' }],
        timeline: [
          {
            timestamp,
            type: 'detected',
            label: 'Detected',
            description: 'Received from the simulated live stream.',
            actor: 'Mock realtime',
          },
        ],
      };
      this.latest = threat;
      return { id, type: 'threat.created', timestamp, payload: { threat } };
    }
    if (kind === 3)
      return {
        id,
        type: 'device.status.changed',
        timestamp,
        payload: {
          deviceId: 'DEV-00142',
          previousStatus: sequence % 16 < 8 ? 'online' : 'offline',
          status: sequence % 16 < 8 ? 'offline' : 'online',
        },
      };
    if (kind === 7)
      return {
        id,
        type: 'security.score.changed',
        timestamp,
        payload: { score: 84 + (Math.floor(sequence / 8) % 7) },
      };
    const previous = { status: this.latest.status, severity: this.latest.severity };
    if (kind === 5) {
      const threatId = this.latest.id;
      this.latest = { ...this.latest, status: 'resolved', updatedAt: timestamp };
      return { id, type: 'threat.resolved', timestamp, payload: { threatId, previous } };
    }
    const changes = { status: 'investigating' as const, confidence: 94 };
    const threatId = this.latest.id;
    this.latest = { ...this.latest, ...changes, updatedAt: timestamp };
    return { id, type: 'threat.updated', timestamp, payload: { threatId, changes, previous } };
  }
}
