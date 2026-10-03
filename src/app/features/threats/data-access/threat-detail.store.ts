import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { Threat, ThreatId, ThreatStatus } from '../models/threat.models';
import { TRANSITIONS, canTransition } from '../utils/threat-rules';
import { THREAT_REPOSITORY } from './threat.repository';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { applyThreatEvent } from '../utils/threat-live';
@Injectable()
export class ThreatDetailStore {
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly repository = inject(THREAT_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly record = signal<Threat | null>(null);
  private readonly pending = signal(false);
  private readonly updating = signal(false);
  private readonly failure = signal<string | null>(null);
  private readonly actionFailure = signal<string | null>(null);
  private readonly missing = signal(false);
  private request?: Subscription;
  private mutation?: Subscription;
  private version = 0;
  private id: ThreatId = '';
  readonly data = this.record.asReadonly();
  readonly isLoading = this.pending.asReadonly();
  readonly isUpdating = this.updating.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly actionError = this.actionFailure.asReadonly();
  readonly notFound = this.missing.asReadonly();
  readonly canInvestigate = computed(() =>
    this.auth.hasPermission(PERMISSIONS.THREATS_INVESTIGATE),
  );
  readonly actions = computed(() =>
    this.canInvestigate() && this.data() ? TRANSITIONS[this.data()!.status] : [],
  );
  constructor() {
    this.realtime?.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.record.update((threat) => applyThreatEvent(threat, event, this.id));
      if (this.record()) this.missing.set(false);
    });
    inject(DestroyRef).onDestroy(() => {
      this.version++;
      this.request?.unsubscribe();
      this.mutation?.unsubscribe();
    });
  }
  load(id: ThreatId): void {
    this.id = id;
    const version = ++this.version;
    this.request?.unsubscribe();
    this.mutation?.unsubscribe();
    this.record.set(null);
    this.pending.set(true);
    this.updating.set(false);
    this.failure.set(null);
    this.actionFailure.set(null);
    this.missing.set(false);
    this.request = this.repository.getById(id).subscribe({
      next: (threat) => {
        if (version !== this.version) return;
        const merged = (this.realtime?.snapshot().events ?? []).reduce(
          (record, event) => applyThreatEvent(record, event, id),
          threat,
        );
        this.record.set(merged);
        this.missing.set(merged === null);
        this.pending.set(false);
      },
      error: () => {
        if (version !== this.version) return;
        this.failure.set('Unable to load threat details.');
        this.pending.set(false);
      },
    });
  }
  retry(): void {
    this.load(this.id);
  }
  updateStatus(status: ThreatStatus, onSuccess: () => void = () => undefined): void {
    if (this.isUpdating()) return;
    this.actionFailure.set(null);
    if (!this.auth.hasPermission(PERMISSIONS.THREATS_INVESTIGATE)) {
      this.actionFailure.set('You do not have permission to investigate threats.');
      return;
    }
    const threat = this.data();
    if (!threat || !canTransition(threat.status, status)) {
      this.actionFailure.set('This status change is not available.');
      return;
    }
    this.updating.set(true);
    const version = this.version;
    this.mutation = this.repository.updateStatus(threat.id, status).subscribe({
      next: (updated) => {
        if (version !== this.version) return;
        const current = this.record();
        if (!current || Date.parse(current.updatedAt) <= Date.parse(updated.updatedAt))
          this.record.set(updated);
        this.updating.set(false);
        onSuccess();
      },
      error: () => {
        if (version !== this.version) return;
        this.actionFailure.set(
          'Unable to update this threat. Check your permissions and try again.',
        );
        this.updating.set(false);
      },
    });
  }
}
