import { Component, computed, input } from '@angular/core';
import { securityScoreLabel } from '../../../shared/utils/security-score';
@Component({
  selector: 'app-device-score',
  template: '<span class="score">{{ value() }}<small>{{ label() }}</small></span>',
  styles:
    ':host{display:inline-block}.score{font-weight:600;font-variant-numeric:tabular-nums}small{display:block;color:var(--sentinel-text-secondary);font-size:.6875rem;font-weight:400;margin-top:.25rem}',
})
export class DeviceScore {
  readonly value = input.required<number>();
  readonly label = computed(() => securityScoreLabel(this.value()));
}
