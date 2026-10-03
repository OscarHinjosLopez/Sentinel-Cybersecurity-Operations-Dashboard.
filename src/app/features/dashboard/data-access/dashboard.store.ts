import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { DASHBOARD_REPOSITORY } from './dashboard.repository';
import { DashboardSummary, DashboardTimeRange } from '../models/dashboard.models';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { applyDashboardEvent } from './dashboard-live';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class DashboardStore {
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly repository = inject(DASHBOARD_REPOSITORY);
  private readonly range = signal<DashboardTimeRange>('24h');
  private readonly summary = signal<DashboardSummary | null>(null);
  private readonly loading = signal(false);
  private readonly failure = signal<string | null>(null);
  private readonly updated = signal<Date | null>(null);
  private request?: Subscription;
  private version = 0;
  readonly selectedRange = this.range.asReadonly();
  readonly data = this.summary.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly lastUpdated = this.updated.asReadonly();
  readonly isEmpty = computed(
    () => !this.isLoading() && !this.error() && (!this.data() || this.data()?.metrics.length === 0),
  );
  readonly detectedTotal = computed(
    () => this.data()?.activity.reduce((sum, point) => sum + point.detected, 0) ?? 0,
  );
  constructor() {
    this.realtime?.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.summary.update((data) => {
        if (!data) return null;
        const updated = applyDashboardEvent(data, event);
        return updated === data
          ? data
          : { ...updated, realtimeRevision: this.realtime!.currentRevision };
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.version++;
      this.request?.unsubscribe();
    });
  }
  load(): void {
    const version = ++this.version;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.failure.set(null);
    this.request = this.repository.getSummary(this.range()).subscribe({
      next: (summary) => {
        if (version !== this.version) return;
        const merged =
          summary && this.realtime
            ? this.realtime
                .eventsSince(summary.realtimeRevision ?? 0)
                .reduce(applyDashboardEvent, summary)
            : summary;
        this.summary.set(merged);
        this.updated.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        if (version !== this.version) return;
        this.failure.set('Unable to load security overview.');
        this.loading.set(false);
      },
    });
  }
  refresh(): void {
    this.load();
  }
  retry(): void {
    this.load();
  }
  changeRange(range: DashboardTimeRange): void {
    if (range === this.range()) return;
    this.range.set(range);
    this.summary.set(null);
    this.updated.set(null);
    this.load();
  }
}
