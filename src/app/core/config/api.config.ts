import { InjectionToken } from '@angular/core';
// Future API requests must be same-origin and within this path boundary.
export const API_BASE_PATH = new InjectionToken<string>('API_BASE_PATH', {
  providedIn: 'root',
  factory: () => '/api',
});
