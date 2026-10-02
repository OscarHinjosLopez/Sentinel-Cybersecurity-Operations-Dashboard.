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
        title: 'Dashboard | Sentinel',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'threats',
        title: 'Threats | Sentinel',
        loadComponent: () => import('./features/threats/threats').then((m) => m.Threats),
      },
      {
        path: 'devices',
        title: 'Devices | Sentinel',
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices),
      },
      {
        path: 'audit',
        title: 'Audit | Sentinel',
        loadComponent: () => import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'settings',
        title: 'Settings | Sentinel',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
