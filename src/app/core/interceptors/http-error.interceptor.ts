import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Logger } from '../errors/logger';
import { classifyHttpError } from '../errors/http-error';

// Opt-in diagnostics; features keep ownership of recovery and local feedback.
export const REPORT_HTTP_FAILURE = new HttpContextToken<boolean>(() => false);
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const logger = inject(Logger);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (request.context.get(REPORT_HTTP_FAILURE) && error instanceof HttpErrorResponse) {
        const failure = classifyHttpError(error);
        try {
          logger.report({
            source: 'http',
            category: 'recoverable',
            name: failure.kind,
            status: failure.status,
          });
        } catch {
          /* Preserve the original failure if diagnostics fail. */
        }
      }
      // No invented requests, redirects, automatic retries or blanket snackbars.
      return throwError(() => error);
    }),
  );
};
