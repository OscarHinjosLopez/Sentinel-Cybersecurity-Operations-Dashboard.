import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { auditTime, filter, Subject, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { THREAT_REPOSITORY } from './threat.repository';
import {
  ThreatListResponse,
  ThreatQuery,
  ThreatSeverity,
  ThreatSort,
  ThreatStatus,
  ThreatVector,
} from '../models/threat.models';
import { DEFAULT_THREAT_QUERY } from '../utils/threat-query';
@Injectable()
export class ThreatListStore {
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly repository = inject(THREAT_REPOSITORY);
  private readonly currentQuery = signal<ThreatQuery>(DEFAULT_THREAT_QUERY);
  private readonly response = signal<ThreatListResponse | null>(null);
  private readonly pending = signal(false);
  private readonly failure = signal<string | null>(null);
  private request?: Subscription;
  private version = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private loaded = false;
  readonly changes = new Subject<ThreatQuery>();
  readonly query = this.currentQuery.asReadonly();
  readonly data = computed(() => this.response()?.items ?? []);
  readonly total = computed(() => this.response()?.total ?? 0);
  readonly isLoading = this.pending.asReadonly();
  readonly isRefreshing = computed(() => this.isLoading() && this.response() !== null);
  readonly error = this.failure.asReadonly();
  readonly hasFilters = computed(
    () =>
      !!(
        this.query().search ||
        this.query().severities.length ||
        this.query().statuses.length ||
        this.query().vectors.length ||
        this.query().dateFrom ||
        this.query().dateTo
      ),
  );
  readonly start = computed(() =>
    this.data().length ? (this.query().page - 1) * this.query().pageSize + 1 : 0,
  );
  readonly end = computed(() => (this.start() ? this.start() + this.data().length - 1 : 0));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.query().pageSize)));
  constructor() {
    this.realtime?.events$
      .pipe(
        filter((event) => event.type.startsWith('threat.')),
        auditTime(100),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.loaded) this.load(true);
      });
    inject(DestroyRef).onDestroy(() => {
      this.version++;
      this.request?.unsubscribe();
      clearTimeout(this.searchTimer);
      this.changes.complete();
    });
  }
  applyQuery(query: ThreatQuery): void {
    clearTimeout(this.searchTimer);
    if (this.loaded && JSON.stringify(query) === JSON.stringify(this.query())) return;
    this.currentQuery.set(query);
    this.load();
  }
  load(live = false): void {
    this.loaded = true;
    const version = ++this.version;
    this.request?.unsubscribe();
    if (!live || !this.response()) this.pending.set(true);
    this.failure.set(null);
    this.request = this.repository.list(this.query()).subscribe({
      next: (response) => {
        if (version !== this.version) return;
        const maxPage = Math.max(1, Math.ceil(response.total / this.query().pageSize));
        if (live && this.query().page > maxPage) {
          this.commit({ page: maxPage });
          return;
        }
        this.response.set(response);
        this.pending.set(false);
      },
      error: () => {
        if (version !== this.version) return;
        if (!live || !this.response()) this.failure.set('Unable to load threats.');
        this.pending.set(false);
      },
    });
  }
  private commit(patch: Partial<ThreatQuery>): void {
    const query = { ...this.query(), page: 1, ...patch };
    this.applyQuery(query);
    this.changes.next(query);
  }
  search(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.commit({ search: value.trim().slice(0, 200) }), 300);
  }
  clearSearch(): void {
    this.commit({ search: '' });
  }
  setSeverityFilter(values: readonly ThreatSeverity[]): void {
    this.commit({ severities: values });
  }
  setStatusFilter(values: readonly ThreatStatus[]): void {
    this.commit({ statuses: values });
  }
  setVectorFilter(values: readonly ThreatVector[]): void {
    this.commit({ vectors: values });
  }
  setDates(dateFrom?: string, dateTo?: string): void {
    this.commit({ dateFrom, dateTo });
  }
  setSort(sortBy: ThreatSort): void {
    this.commit({
      sortBy,
      sortDirection:
        this.query().sortBy === sortBy && this.query().sortDirection === 'desc' ? 'asc' : 'desc',
    });
  }
  setPage(page: number): void {
    this.commit({ page: Math.max(1, page) });
  }
  setPageSize(pageSize: 10 | 25 | 50): void {
    this.commit({ pageSize });
  }
  resetFilters(): void {
    this.commit({ ...DEFAULT_THREAT_QUERY });
  }
  retry(): void {
    this.load();
  }
}
