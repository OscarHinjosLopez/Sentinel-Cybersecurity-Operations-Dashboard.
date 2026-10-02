import { Component, computed, input } from '@angular/core';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
const labels: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
@Component({
  selector: 'app-severity-badge',
  template:
    '<span class="badge" [attr.data-severity]="severity()"><span class="dot" aria-hidden="true"></span>{{ label() }}</span>',
  styleUrl: './severity-badge.scss',
})
export class SeverityBadge {
  readonly severity = input.required<Severity>();
  protected readonly label = computed(() => labels[this.severity()]);
}
