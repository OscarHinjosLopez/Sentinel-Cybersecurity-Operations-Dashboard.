import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FeedbackService } from '../services/feedback.service';
import { Logger } from './logger';

// Only explicitly classified recoverable errors request user feedback.
export class RecoverableUiError extends Error {
  override readonly name = 'RecoverableUiError';
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(Logger);
  private readonly snackbar = inject(FeedbackService);
  private lastFeedback = -Infinity;
  handleError(error: unknown): void {
    const recoverable = error instanceof RecoverableUiError;
    // Raw messages/stacks can contain application data. Do not forward them to UI or telemetry.
    try {
      this.logger.report({
        source: 'angular',
        category: recoverable ? 'recoverable' : 'unexpected',
        name:
          error instanceof TypeError
            ? 'TypeError'
            : error instanceof RangeError
              ? 'RangeError'
              : error instanceof Error
                ? 'Error'
                : 'UnknownError',
      });
    } catch {
      /* Reporting must not recursively break Angular's error handler. */
    }
    if (!recoverable || Date.now() - this.lastFeedback < 10000) return;
    this.lastFeedback = Date.now();
    try {
      void this.snackbar.open('Something went wrong. Please try again.', 'Dismiss', {
        duration: 5000,
        politeness: 'polite',
      });
    } catch {
      /* Feedback remains best effort if the overlay itself fails. */
    }
  }
}
