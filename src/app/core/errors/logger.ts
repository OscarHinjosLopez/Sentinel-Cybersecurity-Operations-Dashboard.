import { Injectable, InjectionToken, inject, isDevMode } from '@angular/core';

export interface ErrorDiagnostic {
  readonly source: 'angular' | 'http';
  readonly category: 'unexpected' | 'recoverable';
  readonly name: string;
  readonly status?: number;
}

export const DEVELOPMENT_LOGGING = new InjectionToken<boolean>('DevelopmentLogging', {
  providedIn: 'root',
  factory: () => isDevMode(),
});

// Replace this adapter to connect observability. Never accepts headers, tokens or response bodies.
@Injectable({ providedIn: 'root' })
export class Logger {
  private readonly development = inject(DEVELOPMENT_LOGGING);
  report(diagnostic: ErrorDiagnostic): void {
    if (this.development) console.error('[Sentinel]', diagnostic);
  }
}
