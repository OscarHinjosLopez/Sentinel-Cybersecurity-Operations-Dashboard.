import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { DASHBOARD_REPOSITORY } from './dashboard.repository';
import { DashboardSummary, DashboardTimeRange } from '../models/dashboard.models';

@Injectable()
export class DashboardStore {
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
        this.summary.set(summary);
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
