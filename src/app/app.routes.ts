import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { PERMISSIONS } from './core/auth/auth.models';
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | Sentinel',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    canActivateChild: [authGuard, permissionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
        title: 'Dashboard | Sentinel',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'threats',
        data: { breadcrumb: 'Threats', permission: PERMISSIONS.THREATS_VIEW },
        title: 'Threats | Sentinel',
        loadComponent: () => import('./features/threats/threats').then((m) => m.Threats),
      },
      {
        path: 'devices',
        data: { breadcrumb: 'Devices', permission: PERMISSIONS.DEVICES_VIEW },
        title: 'Devices | Sentinel',
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices),
      },
      {
        path: 'audit',
        data: { breadcrumb: 'Audit', permission: PERMISSIONS.AUDIT_VIEW },
        title: 'Audit | Sentinel',
        loadComponent: () => import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'settings',
        data: { breadcrumb: 'Settings', permission: PERMISSIONS.SETTINGS_VIEW },
        title: 'Settings | Sentinel',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'forbidden',
        title: 'Access denied | Sentinel',
        data: { breadcrumb: 'Access denied' },
        loadComponent: () => import('./shared/ui/forbidden/forbidden').then((m) => m.Forbidden),
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
