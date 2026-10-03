import { Routes } from '@angular/router';
import { DASHBOARD_REPOSITORY, MockDashboardRepository } from './data-access/dashboard.repository';
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    data: { breadcrumb: null },
    providers: [{ provide: DASHBOARD_REPOSITORY, useExisting: MockDashboardRepository }],
    loadComponent: () => import('./dashboard').then((m) => m.Dashboard),
  },
];
