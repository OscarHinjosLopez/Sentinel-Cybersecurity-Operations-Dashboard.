import {
  ApplicationConfig,
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
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_API, useExisting: MockAuthApi },
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
