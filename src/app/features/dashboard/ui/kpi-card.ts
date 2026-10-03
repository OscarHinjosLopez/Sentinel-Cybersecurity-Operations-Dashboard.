import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Icon } from '../../../shared/ui/icon/icon';
import { KpiMetric } from '../models/dashboard.models';
import { securityScoreLabel } from '../../../shared/utils/security-score';
@Component({
  selector: 'app-kpi-card',
  imports: [DecimalPipe, Icon],
  template: `<article>
    <div class="label">
      <span>{{ metric().label }}</span
      ><app-icon [name]="metric().icon" />
    </div>
    <p class="value">
      {{ metric().value | number }}
      @if (metric().supplementaryValue !== undefined) {
        <span>/ {{ metric().supplementaryValue | number }}</span>
      }
    </p>
    <p class="detail">{{ detail() }}</p>
    <p class="trend" [attr.data-tone]="tone()">
      <strong
        >{{ metric().trend > 0 ? '↑ +' : metric().trend < 0 ? '↓ ' : '— '
        }}{{ metric().trend | number: '1.1-1' }}%</strong
      >
      <span
        >vs previous period ·
        {{
          tone() === 'success' ? 'Improved' : tone() === 'danger' ? 'Needs attention' : 'Unchanged'
        }}</span
      >
    </p>
  </article>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    article {
      height: 100%;
      box-sizing: border-box;
      padding: 1.25rem;
      background: var(--sentinel-surface);
      border: 1px solid var(--sentinel-border);
      border-radius: var(--sentinel-radius-lg);
    }
    .label {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--sentinel-text-secondary);
    }
    app-icon {
      color: var(--sentinel-primary);
    }
    p {
      margin: 0;
    }
    .value {
      font-size: 2rem;
      font-weight: 700;
      margin-top: 1rem;
      font-variant-numeric: tabular-nums;
    }
    .value span {
      font-size: 1rem;
      color: var(--sentinel-text-muted);
      font-weight: 400;
    }
    .detail {
      font-size: 0.8125rem;
      color: var(--sentinel-text-secondary);
      margin: 0.25rem 0 1rem;
    }
    .trend {
      font-size: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .trend span {
      color: var(--sentinel-text-muted);
    }
    [data-tone='success'] strong {
      color: var(--sentinel-success);
    }
    [data-tone='danger'] strong {
      color: var(--sentinel-danger);
    }
  `,
})
export class KpiCard {
  readonly metric = input.required<KpiMetric>();
  readonly tone = computed(() =>
    this.metric().trend === 0
      ? 'neutral'
      : this.metric().trend > 0 === (this.metric().improvement === 'increase')
        ? 'success'
        : 'danger',
  );
  readonly detail = computed(() => {
    const metric = this.metric();
    if (metric.id === 'protected' && metric.supplementaryValue)
      return `${((metric.value / metric.supplementaryValue) * 100).toFixed(1)}% of fleet protected`;
    if (metric.id === 'score') return securityScoreLabel(metric.value);
    return metric.detail;
  });
}
