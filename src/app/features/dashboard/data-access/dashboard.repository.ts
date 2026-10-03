import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { DashboardSummary, DashboardTimeRange } from '../models/dashboard.models';
import { createDashboardSummary } from './dashboard.fixtures';

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
@Injectable()
export class MockDashboardRepository implements DashboardRepository {
  private readonly config = inject(DASHBOARD_MOCK_CONFIG);
  getSummary(range: DashboardTimeRange): Observable<DashboardSummary | null> {
    return timer(this.config.latency).pipe(
      map(() => {
        if (this.config.scenario === 'error') throw new Error('Mock dashboard unavailable');
        return this.config.scenario === 'empty' ? null : createDashboardSummary(range, new Date());
      }),
    );
  }
}
