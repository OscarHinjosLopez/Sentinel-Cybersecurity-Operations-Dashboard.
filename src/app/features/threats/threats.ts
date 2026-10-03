import { Component, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { SeverityBadge } from '../../shared/ui/severity-badge/severity-badge';
import { StatusIndicator } from '../../shared/ui/status-indicator/status-indicator';
import { ThreatListStore } from './data-access/threat-list.store';
import { DEFAULT_THREAT_QUERY, parseThreatQuery, serializeThreatQuery } from './utils/threat-query';
import { SEVERITIES, STATUSES, VECTORS, STATUS_LABELS, VECTOR_LABELS } from './utils/threat-rules';
import { ThreatSort, ThreatSeverity, ThreatStatus, ThreatVector } from './models/threat.models';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-threats',
  imports: [
    FormsModule,
    PageHeader,
    EmptyState,
    Skeleton,
    SeverityBadge,
    StatusIndicator,
    DatePipe,
    TitleCasePipe,
    RouterLink,
    MatButtonModule,
  ],
  providers: [ThreatListStore],
  templateUrl: './threats.html',
  styleUrl: './threats.scss',
})
export class Threats {
  readonly store = inject(ThreatListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly searchText = signal('');
  readonly severities = SEVERITIES;
  readonly statuses = STATUSES;
  readonly vectors = VECTORS;
  readonly statusLabels = STATUS_LABELS;
  readonly vectorLabels = VECTOR_LABELS;
  readonly sorts: readonly { key: ThreatSort; label: string }[] = [
    { key: 'severity', label: 'Severity' },
    { key: 'status', label: 'Status' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'detectedAt', label: 'Detected' },
  ];
  readonly params = serializeThreatQuery;
  constructor() {
    this.store.changes.pipe(takeUntilDestroyed()).subscribe((query) => {
      this.searchText.set(query.search);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: serializeThreatQuery(query),
      });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const query = parseThreatQuery(params);
      this.searchText.set(query.search);
      this.store.applyQuery(query);
      // Preserve valid explicit defaults; normalize only values that fail parsing.
      const expected = serializeThreatQuery(query);
      const aliases: Record<string, unknown> = {
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sortBy,
        direction: query.sortDirection,
        search: query.search,
        severity: query.severities.join(','),
        status: query.statuses.join(','),
        vector: query.vectors.join(','),
        from: query.dateFrom ?? '',
        to: query.dateTo ?? '',
      };
      if (params.keys.some((key) => key in aliases && params.get(key) !== String(aliases[key])))
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: expected,
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
  filter(type: 'severity' | 'status' | 'vector', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (type === 'severity')
      this.store.setSeverityFilter(this.severities.filter((item) => item === value));
    if (type === 'status')
      this.store.setStatusFilter(this.statuses.filter((item) => item === value));
    if (type === 'vector')
      this.store.setVectorFilter(this.vectors.filter((item) => item === value));
  }
  pageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (size === 10 || size === 25 || size === 50) this.store.setPageSize(size);
  }
  ariaSort(key: ThreatSort): 'ascending' | 'descending' | 'none' {
    return this.store.query().sortBy === key
      ? this.store.query().sortDirection === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';
  }
  reset(): void {
    this.searchText.set(DEFAULT_THREAT_QUERY.search);
    this.store.resetFilters();
  }
  removeSeverity(value: ThreatSeverity): void {
    this.store.setSeverityFilter(this.store.query().severities.filter((item) => item !== value));
  }
  removeStatus(value: ThreatStatus): void {
    this.store.setStatusFilter(this.store.query().statuses.filter((item) => item !== value));
  }
  removeVector(value: ThreatVector): void {
    this.store.setVectorFilter(this.store.query().vectors.filter((item) => item !== value));
  }
  sortFromSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const sort = this.sorts.find((item) => item.key === value);
    if (sort) this.store.setSort(sort.key);
  }
  sortArrow(key: ThreatSort): string {
    return this.store.query().sortBy === key
      ? this.store.query().sortDirection === 'desc'
        ? '↓'
        : '↑'
      : '↕';
  }
}
