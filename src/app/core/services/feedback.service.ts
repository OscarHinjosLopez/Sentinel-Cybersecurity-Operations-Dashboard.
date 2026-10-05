import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import type { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/** Keep the overlay engine off the bootstrap path; feedback is best effort. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private engine?: Promise<MatSnackBar>;

  async open(message: string, action: string, config: MatSnackBarConfig): Promise<void> {
    try {
      const snackbar = await (this.engine ??= import('@angular/material/snack-bar').then(
        ({ MatSnackBar }) => this.injector.get(MatSnackBar),
      ));
      if (!this.destroy.destroyed) snackbar.open(message, action, config);
    } catch {
      // A failed overlay must not recursively trigger global error handling. Allow retry.
      this.engine = undefined;
    }
  }
}
