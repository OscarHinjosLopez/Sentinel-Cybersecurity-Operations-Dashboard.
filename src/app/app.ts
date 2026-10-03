import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, throttleTime } from 'rxjs';
import { RealtimeService } from './core/realtime/realtime.service';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    const realtime = inject(RealtimeService, { optional: true });
    const snack = inject(MatSnackBar);
    realtime?.events$
      .pipe(
        filter(
          (event) =>
            event.type === 'threat.created' && event.payload.threat.severity === 'critical',
        ),
        throttleTime(10000),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        snack.open('Critical threat detected. Review recent threat activity.', 'Dismiss', {
          duration: 4500,
          politeness: 'polite',
        }),
      );
  }
}
