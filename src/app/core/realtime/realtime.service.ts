import { effect, DestroyRef, inject, Injectable, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ConnectionState, RealtimeEvent, ThreatUpdatedEvent } from './realtime.models';
import { REALTIME_TRANSPORT } from './realtime.transport';
import { parseRealtimeEvent } from './realtime-validation';
export const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000] as const;
@Injectable()
export class RealtimeService {
  private readonly transport = inject(REALTIME_TRANSPORT);
  private readonly auth = inject(AuthService);
  private readonly state = signal<ConnectionState>('disconnected');
  private readonly last = signal<Date | null>(null);
  private readonly attempt = signal(0);
  private readonly recent = signal<readonly RealtimeEvent[]>([]);
  private readonly accepted = new Subject<RealtimeEvent>();
  private readonly processed = new Set<string>();
  private readonly versions = new Map<string, number>();
  private readonly createdIds = new Set<string>();
  private readonly threatStates = new Map<string, ThreatUpdatedEvent['payload']['previous']>();
  private readonly consumers = new Set<(event: RealtimeEvent) => void>();
  private journal: { revision: number; event: RealtimeEvent }[] = [];
  private revision = 0;
  private desired = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  readonly connectionState = this.state.asReadonly();
  readonly lastEventAt = this.last.asReadonly();
  readonly reconnectAttempt = this.attempt.asReadonly();
  readonly events = this.recent.asReadonly();
  readonly events$ = this.accepted.asObservable();
  constructor() {
    const states = this.transport.connectionState$.subscribe((state) => {
      if (!this.desired) return;
      if (state === 'connected') {
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
        this.state.set('connected');
        this.attempt.set(0);
      } else if (state === 'disconnected' || state === 'error') this.scheduleReconnect();
      else this.state.set(this.attempt() > 0 ? 'reconnecting' : 'connecting');
    });
    const events = this.transport.events$.subscribe({
      next: (value) => this.receive(value),
      error: () => {
        if (this.desired) this.scheduleReconnect();
      },
    });
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      untracked(() => (authenticated ? this.connect() : this.disconnect()));
    });
    inject(DestroyRef).onDestroy(() => {
      this.disconnect();
      states.unsubscribe();
      events.unsubscribe();
      this.accepted.complete();
      this.consumers.clear();
    });
  }
  connect(): void {
    if (!this.auth.isAuthenticated() || this.desired) return;
    this.desired = true;
    this.state.set('connecting');
    this.openTransport();
  }
  disconnect(): void {
    this.desired = false;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.transport.disconnect();
    this.state.set('disconnected');
    this.attempt.set(0);
    this.last.set(null);
    this.recent.set([]);
    this.processed.clear();
    this.versions.clear();
    this.createdIds.clear();
    this.threatStates.clear();
    this.journal = [];
    this.revision = 0;
  }
  private scheduleReconnect(): void {
    if (!this.desired || !this.auth.isAuthenticated() || this.retryTimer) return;
    const attempt = this.attempt() + 1;
    this.attempt.set(attempt);
    this.state.set('reconnecting');
    const delay = RECONNECT_DELAYS[Math.min(attempt - 1, RECONNECT_DELAYS.length - 1)];
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (this.desired && this.auth.isAuthenticated()) this.openTransport();
      else this.disconnect();
    }, delay);
  }
  private openTransport(): void {
    try {
      this.transport.connect();
    } catch {
      this.scheduleReconnect();
    }
  }
  private key(event: RealtimeEvent): string {
    switch (event.type) {
      case 'threat.created':
        return `threat:${event.payload.threat.id}`;
      case 'threat.updated':
      case 'threat.resolved':
        return `threat:${event.payload.threatId}`;
      case 'device.status.changed':
        return `device:${event.payload.deviceId}`;
      case 'security.score.changed':
        return 'security-score';
    }
  }
  markUpdated(
    key: string,
    timestamp: string,
    threatState?: ThreatUpdatedEvent['payload']['previous'],
  ): void {
    const value = Date.parse(timestamp);
    if (Number.isFinite(value)) {
      this.versions.set(key, Math.max(value, this.versions.get(key) ?? 0));
      this.trimMap();
      if (threatState) this.rememberThreat(key, threatState);
    }
  }
  private rememberThreat(key: string, state: ThreatUpdatedEvent['payload']['previous']): void {
    this.threatStates.set(key, state);
    while (this.threatStates.size > 1000)
      this.threatStates.delete(this.threatStates.keys().next().value!);
  }
  private trimMap(): void {
    while (this.versions.size > 1000) this.versions.delete(this.versions.keys().next().value!);
  }
  private receive(value: unknown): void {
    if (!this.desired || !this.auth.isAuthenticated() || this.state() !== 'connected') return;
    let event = parseRealtimeEvent(value);
    if (!event || this.processed.has(event.id)) return;
    const key = this.key(event),
      timestamp = Date.parse(event.timestamp);
    if (timestamp <= (this.versions.get(key) ?? -Infinity)) return;
    if (event.type === 'threat.created' && this.createdIds.has(event.payload.threat.id)) return;
    if (event.type === 'threat.updated') {
      const previous = this.threatStates.get(key) ?? event.payload.previous;
      event = { ...event, payload: { ...event.payload, previous } };
      this.rememberThreat(key, {
        status: event.payload.changes.status ?? previous.status,
        severity: event.payload.changes.severity ?? previous.severity,
      });
    } else if (event.type === 'threat.resolved') {
      const previous = this.threatStates.get(key) ?? event.payload.previous;
      event = { ...event, payload: { ...event.payload, previous } };
      this.rememberThreat(key, { status: 'resolved', severity: previous.severity });
    } else if (event.type === 'threat.created')
      this.rememberThreat(key, {
        status: event.payload.threat.status,
        severity: event.payload.threat.severity,
      });
    this.processed.add(event.id);
    while (this.processed.size > 1000) this.processed.delete(this.processed.values().next().value!);
    if (event.type === 'threat.created') {
      this.createdIds.add(event.payload.threat.id);
      while (this.createdIds.size > 1000)
        this.createdIds.delete(this.createdIds.values().next().value!);
    }
    this.markUpdated(key, event.timestamp);
    this.journal.push({ revision: ++this.revision, event });
    if (this.journal.length > 500) this.journal.shift();
    this.last.set(new Date(Math.max(timestamp, this.last()?.getTime() ?? 0)));
    this.recent.update((events) => [event, ...events].slice(0, 20));
    for (const consumer of this.consumers) consumer(event);
    this.accepted.next(event);
  }
  snapshot(): { revision: number; events: readonly RealtimeEvent[] } {
    return { revision: this.revision, events: this.journal.map((item) => item.event) };
  }
  eventsSince(revision: number): readonly RealtimeEvent[] {
    return this.journal.filter((item) => item.revision > revision).map((item) => item.event);
  }
  registerConsumer(consumer: (event: RealtimeEvent) => void): () => void {
    for (const item of this.journal) consumer(item.event);
    this.consumers.add(consumer);
    return () => this.consumers.delete(consumer);
  }
  get processedCount(): number {
    return this.processed.size;
  }
  get currentRevision(): number {
    return this.revision;
  }
}
