import { Routes } from '@angular/router';
import { DEVICE_REPOSITORY, MockDeviceRepository } from './data-access/device.repository';
export const DEVICE_ROUTES: Routes = [
  {
    path: '',
    data: { breadcrumb: null },
    providers: [{ provide: DEVICE_REPOSITORY, useExisting: MockDeviceRepository }],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { breadcrumb: null },
        loadComponent: () => import('./devices').then((m) => m.Devices),
      },
      {
        path: ':id',
        data: { breadcrumb: 'Device details' },
        loadComponent: () => import('./pages/device-detail').then((m) => m.DeviceDetail),
      },
    ],
  },
];
