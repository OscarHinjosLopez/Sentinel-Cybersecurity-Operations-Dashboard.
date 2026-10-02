import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        title: 'Dashboard | Sentinel',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'threats',
        data: { breadcrumb: 'Threats' },
        title: 'Threats | Sentinel',
        loadComponent: () => import('./features/threats/threats').then((m) => m.Threats),
      },
      {
        path: 'devices',
        data: { breadcrumb: 'Devices' },
        title: 'Devices | Sentinel',
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices),
      },
      {
        path: 'audit',
        data: { breadcrumb: 'Audit' },
        title: 'Audit | Sentinel',
        loadComponent: () => import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'settings',
        data: { breadcrumb: 'Settings' },
        title: 'Settings | Sentinel',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: '**',
        title: 'Page not found | Sentinel',
        data: { breadcrumb: 'Not found' },
        loadComponent: () => import('./shared/ui/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
