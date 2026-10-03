import { Routes } from '@angular/router';
import { MockThreatRepository, THREAT_REPOSITORY } from './data-access/threat.repository';
export const THREATS_ROUTES: Routes = [
  {
    path: '',
    data: { breadcrumb: null },
    providers: [{ provide: THREAT_REPOSITORY, useExisting: MockThreatRepository }],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { breadcrumb: null },
        loadComponent: () => import('./threats').then((m) => m.Threats),
      },
      {
        path: ':id',
        data: { breadcrumb: 'Threat details' },
        loadComponent: () => import('./pages/threat-detail').then((m) => m.ThreatDetail),
      },
    ],
  },
];
