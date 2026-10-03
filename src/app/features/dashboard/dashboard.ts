import { Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { SeverityBadge } from '../../shared/ui/severity-badge/severity-badge';
import { StatusIndicator } from '../../shared/ui/status-indicator/status-indicator';
import { DashboardStore } from './data-access/dashboard.store';
import { DashboardChart } from './ui/dashboard-chart';
import { KpiCard } from './ui/kpi-card';
import { ThreatOrigins } from './ui/threat-origins';
import { RealtimeStatus } from '../../shared/ui/realtime-status/realtime-status';
import { QuickActions } from '../../shared/ui/quick-actions/quick-actions';
@Component({
  selector: 'app-dashboard',
  imports: [
    QuickActions,
    RealtimeStatus,
    PageHeader,
    EmptyState,
    Skeleton,
    SeverityBadge,
    StatusIndicator,
    DashboardChart,
    KpiCard,
    ThreatOrigins,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
  ],
  providers: [DashboardStore],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly store = inject(DashboardStore);
  readonly ranges = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ] as const;
  constructor() {
    this.store.load();
  }
  changeRange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '24h' || value === '7d' || value === '30d') this.store.changeRange(value);
  }
}
