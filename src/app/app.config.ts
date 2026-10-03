import {
  ApplicationConfig,
  EnvironmentInjector,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AUTH_API } from './core/auth/data-access/auth-api';
import { MockAuthApi } from './core/auth/data-access/mock-auth-api';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { RealtimeService } from './core/realtime/realtime.service';
import { MockRealtimeTransport } from './core/realtime/mock-realtime.transport';
import { REALTIME_TRANSPORT } from './core/realtime/realtime.transport';
import { MockDashboardRepository } from './features/dashboard/data-access/dashboard.repository';
export const appConfig: ApplicationConfig = {
  providers: [
    RealtimeService,
    MockRealtimeTransport,
    { provide: REALTIME_TRANSPORT, useExisting: MockRealtimeTransport },
    provideAppInitializer(() => {
      inject(MockDashboardRepository);
    }),
    provideAppInitializer(async () => {
      const injector = inject(EnvironmentInjector);
      const [{ MockThreatRepository }, { MockDeviceRepository }] = await Promise.all([
        import('./features/threats/data-access/threat.repository'),
        import('./features/devices/data-access/device.repository'),
      ]);
      injector.get(MockThreatRepository);
      injector.get(MockDeviceRepository);
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_API, useExisting: MockAuthApi },
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
