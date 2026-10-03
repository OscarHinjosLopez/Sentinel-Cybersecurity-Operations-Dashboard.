import { Component, computed, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RealtimeService } from '../../../core/realtime/realtime.service';
@Component({
  selector: 'app-realtime-status',
  imports: [MatTooltipModule],
  template: `<span
    class="connection"
    [class.compact]="compact()"
    role="status"
    aria-live="polite"
    [attr.data-state]="state()"
    [matTooltip]="detail()"
    tabindex="0"
    ><span class="dot" aria-hidden="true"></span><span class="label">{{ label() }}</span
    ><span class="sr-only"> · Realtime connection</span></span
  >`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    .connection {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.4rem;
      color: var(--sentinel-text-secondary);
      font-size: var(--sentinel-font-caption);
      border-radius: var(--sentinel-radius-sm);
    }
    .connection:focus-visible {
      outline: 2px solid var(--sentinel-primary);
      outline-offset: 2px;
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      flex-shrink: 0;
      border-radius: 50%;
      border: 1px solid var(--sentinel-text-muted);
      background: transparent;
    }
    [data-state='connected'] .dot {
      border-color: var(--sentinel-success);
      background: var(--sentinel-success);
    }
    [data-state='connecting'] .dot,
    [data-state='reconnecting'] .dot {
      border-color: var(--sentinel-warning);
    }
    @media (max-width: 767px) {
      .connection {
        padding: 0.35rem 0.2rem;
      }
      .compact .label {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    }
  `,
})
export class RealtimeStatus {
  readonly compact = input(false);
  readonly realtime = inject(RealtimeService, { optional: true });
  readonly state = computed(() => this.realtime?.connectionState() ?? 'disconnected');
  readonly label = computed(
    () =>
      ({
        connected: 'Live',
        connecting: 'Connecting',
        reconnecting: 'Reconnecting',
        disconnected: 'Offline',
        error: 'Offline',
      })[this.state()],
  );
  readonly detail = computed(
    () =>
      `${this.label()} · Last event: ${this.realtime?.lastEventAt()?.toLocaleTimeString() ?? 'none'} · Reconnect attempt: ${this.realtime?.reconnectAttempt() ?? 0}`,
  );
}
