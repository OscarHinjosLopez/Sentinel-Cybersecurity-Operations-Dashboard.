import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FeedbackService } from './core/services/feedback.service';
import { filter, throttleTime } from 'rxjs';
import { RealtimeService } from './core/realtime/realtime.service';
import { RouterOutlet } from '@angular/router';
import { notificationFromEvent } from './core/notifications/notification-rules';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    const realtime = inject(RealtimeService, { optional: true });
    const snack = inject(FeedbackService);
    realtime?.events$
      .pipe(
        filter((event) => notificationFromEvent(event)?.priority === 'critical'),
        throttleTime(10000),
        takeUntilDestroyed(),
      )
      .subscribe(
        () =>
          void snack.open('Critical threat detected. Review recent threat activity.', 'Dismiss', {
            duration: 4500,
            politeness: 'polite',
          }),
      );
  }
}
