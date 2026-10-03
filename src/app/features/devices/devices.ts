import { Component, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusIndicator } from '../../shared/ui/status-indicator/status-indicator';
import { SeverityBadge } from '../../shared/ui/severity-badge/severity-badge';
import { DeviceScore } from './ui/device-score';
import { DeviceListStore } from './data-access/device-list.store';
import { DEVICE_SORTS, parseDeviceQuery, serializeDeviceQuery } from './utils/device-query';
import {
  DEVICE_STATUSES,
  DEVICE_RISKS,
  OS_FAMILIES,
  OS_LABELS,
  PROTECTIONS,
  PROTECTION_LABELS,
} from './utils/device-rules';
import { DeviceSort } from './models/device.models';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-devices',
  host: { class: 'record-list' },
  imports: [
    PageHeader,
    EmptyState,
    Skeleton,
    StatusIndicator,
    SeverityBadge,
    DeviceScore,
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
  ],
  providers: [DeviceListStore],
  templateUrl: './devices.html',
  styleUrl: './devices.scss',
})
export class Devices {
  readonly store = inject(DeviceListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly searchText = signal('');
  readonly statuses = DEVICE_STATUSES;
  readonly risks = DEVICE_RISKS;
  readonly operatingSystems = OS_FAMILIES;
  readonly osLabels = OS_LABELS;
  readonly protections = PROTECTIONS;
  readonly protectionLabels = PROTECTION_LABELS;
  readonly sorts = DEVICE_SORTS;
  readonly params = serializeDeviceQuery;
  constructor() {
    this.store.changes.pipe(takeUntilDestroyed()).subscribe((query) => {
      this.searchText.set(query.search);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: serializeDeviceQuery(query),
      });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const query = parseDeviceQuery(params);
      this.searchText.set(query.search);
      this.store.applyQuery(query);
      const values: Record<string, unknown> = {
        ...query,
        sort: query.sortBy,
        direction: query.sortDirection,
      };
      if (params.keys.some((key) => key in values && params.get(key) !== String(values[key])))
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: serializeDeviceQuery(query),
          replaceUrl: true,
        });
    });
  }
  inputSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.search(value);
  }
  clearSearch(): void {
    this.searchText.set('');
    this.store.clearSearch();
  }
  filter(key: 'status' | 'risk' | 'protection' | 'os', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (key === 'status')
      this.store.setStatusFilter(this.statuses.find((item) => item === value) ?? '');
    if (key === 'risk') this.store.setRiskFilter(this.risks.find((item) => item === value) ?? '');
    if (key === 'protection')
      this.store.setProtectionFilter(this.protections.find((item) => item === value) ?? '');
    if (key === 'os')
      this.store.setOsFilter(this.operatingSystems.find((item) => item === value) ?? '');
  }
  pageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (value === 10 || value === 25 || value === 50) this.store.setPageSize(value);
  }
  sort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const found = this.sorts.find((item) => item.key === value);
    if (found) this.store.setSort(found.key);
  }
  ariaSort(key: DeviceSort): 'ascending' | 'descending' | 'none' {
    return this.store.query().sortBy === key
      ? this.store.query().sortDirection === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';
  }
  arrow(key: DeviceSort): string {
    return this.store.query().sortBy === key
      ? this.store.query().sortDirection === 'asc'
        ? '↑'
        : '↓'
      : '↕';
  }
}
