import { DestroyRef, effect, inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { DashboardSummary, DashboardTimeRange } from '../models/dashboard.models';
import { createDashboardSummary } from './dashboard.fixtures';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { applyDashboardEvent } from './dashboard-live';

export interface DashboardRepository {
  getSummary(range: DashboardTimeRange): Observable<DashboardSummary | null>;
}
export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DashboardRepository');
export const DASHBOARD_MOCK_CONFIG = new InjectionToken<{
  latency: number;
  scenario: 'success' | 'error' | 'empty';
}>('DashboardMockConfig', {
  providedIn: 'root',
  factory: () => ({ latency: 650, scenario: 'success' }),
});
@Injectable({ providedIn: 'root' })
export class MockDashboardRepository implements DashboardRepository {
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly config = inject(DASHBOARD_MOCK_CONFIG);
  private readonly summaries = new Map<DashboardTimeRange, DashboardSummary>();
  constructor() {
    this.reset();
    const unregister = this.realtime?.registerConsumer((event) => {
      for (const [range, data] of this.summaries)
        this.summaries.set(range, {
          ...applyDashboardEvent(data, event),
          realtimeRevision: this.realtime!.currentRevision,
        });
    });
    effect(() => {
      if (this.realtime?.connectionState() === 'disconnected') this.reset();
    });
    inject(DestroyRef).onDestroy(() => unregister?.());
  }
  private reset(): void {
    for (const range of ['24h', '7d', '30d'] as const)
      this.summaries.set(range, {
        ...createDashboardSummary(range, new Date()),
        realtimeRevision: 0,
      });
  }
  getSummary(range: DashboardTimeRange): Observable<DashboardSummary | null> {
    return timer(this.config.latency).pipe(
      map(() => {
        if (this.config.scenario === 'error') throw new Error('Mock dashboard unavailable');
        if (this.config.scenario === 'empty') return null;
        return this.realtime
          ? this.summaries.get(range)!
          : createDashboardSummary(range, new Date());
      }),
    );
  }
}
