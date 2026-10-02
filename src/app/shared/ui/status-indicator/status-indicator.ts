import { Component, computed, input } from '@angular/core';
export type Status = 'online' | 'offline' | 'investigating' | 'resolved' | 'active' | 'inactive';
const states: Record<Status, { label: string; tone: 'success' | 'muted' | 'warning' | 'info' }> = {
  online: { label: 'Online', tone: 'success' },
  offline: { label: 'Offline', tone: 'muted' },
  investigating: { label: 'Investigating', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  active: { label: 'Active', tone: 'info' },
  inactive: { label: 'Inactive', tone: 'muted' },
};
@Component({
  selector: 'app-status-indicator',
  template:
    '<span class="status" [attr.data-tone]="state().tone"><span class="dot" aria-hidden="true"></span>{{ state().label }}</span>',
  styleUrl: './status-indicator.scss',
})
export class StatusIndicator {
  readonly status = input.required<Status>();
  protected readonly state = computed(() => states[this.status()]);
}
