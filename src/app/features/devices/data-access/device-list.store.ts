import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { DEVICE_REPOSITORY } from './device.repository';
import {
  DeviceListResponse,
  DeviceQuery,
  DeviceRisk,
  DeviceSort,
  DeviceStatus,
  OperatingSystem,
  ProtectionStatus,
} from '../models/device.models';
import { DEFAULT_DEVICE_QUERY, serializeDeviceQuery } from '../utils/device-query';
@Injectable()
export class DeviceListStore {
  private readonly repository = inject(DEVICE_REPOSITORY);
  private readonly current = signal<DeviceQuery>(DEFAULT_DEVICE_QUERY);
  private readonly response = signal<DeviceListResponse | null>(null);
  private readonly loading = signal(false);
  private readonly failure = signal<string | null>(null);
  private request?: Subscription;
  private version = 0;
  private loaded = false;
  private timer?: ReturnType<typeof setTimeout>;
  readonly changes = new Subject<DeviceQuery>();
  readonly query = this.current.asReadonly();
  readonly data = computed(() => this.response()?.items ?? []);
  readonly total = computed(() => this.response()?.total ?? 0);
  readonly isLoading = this.loading.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly summary = computed(() => this.response()?.summary ?? null);
  readonly isRefreshing = computed(() => this.isLoading() && this.response() !== null);
  readonly hasFilters = computed(
    () =>
      !!(
        this.query().search ||
        this.query().status ||
        this.query().risk ||
        this.query().protection ||
        this.query().os
      ),
  );
  readonly start = computed(() =>
    this.data().length ? (this.query().page - 1) * this.query().pageSize + 1 : 0,
  );
  readonly end = computed(() => (this.start() ? this.start() + this.data().length - 1 : 0));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.query().pageSize)));
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.version++;
      this.request?.unsubscribe();
      clearTimeout(this.timer);
      this.changes.complete();
    });
  }
  applyQuery(query: DeviceQuery): void {
    clearTimeout(this.timer);
    if (
      this.loaded &&
      JSON.stringify(serializeDeviceQuery(query)) ===
        JSON.stringify(serializeDeviceQuery(this.query()))
    )
      return;
    this.current.set(query);
    this.load();
  }
  load(): void {
    this.loaded = true;
    const version = ++this.version;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.failure.set(null);
    this.request = this.repository.list(this.query()).subscribe({
      next: (response) => {
        if (version !== this.version) return;
        this.response.set(response);
        this.loading.set(false);
      },
      error: () => {
        if (version !== this.version) return;
        this.failure.set('Unable to load devices.');
        this.loading.set(false);
      },
    });
  }
  private commit(patch: Partial<DeviceQuery>): void {
    const query = { ...this.query(), page: 1, ...patch };
    this.applyQuery(query);
    this.changes.next(query);
  }
  search(value: string): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.commit({ search: value.trim().slice(0, 200) }), 300);
  }
  clearSearch(): void {
    this.commit({ search: '' });
  }
  setStatusFilter(status: DeviceStatus | ''): void {
    this.commit({ status });
  }
  setRiskFilter(risk: DeviceRisk | ''): void {
    this.commit({ risk });
  }
  setOsFilter(os: OperatingSystem | ''): void {
    this.commit({ os });
  }
  setProtectionFilter(protection: ProtectionStatus | ''): void {
    this.commit({ protection });
  }
  setSort(sortBy: DeviceSort): void {
    this.commit({
      sortBy,
      sortDirection:
        this.query().sortBy === sortBy && this.query().sortDirection === 'asc' ? 'desc' : 'asc',
    });
  }
  setPage(page: number): void {
    this.commit({ page: Math.max(1, page) });
  }
  setPageSize(pageSize: 10 | 25 | 50): void {
    this.commit({ pageSize });
  }
  resetFilters(): void {
    this.commit(DEFAULT_DEVICE_QUERY);
  }
  retry(): void {
    this.load();
  }
}
