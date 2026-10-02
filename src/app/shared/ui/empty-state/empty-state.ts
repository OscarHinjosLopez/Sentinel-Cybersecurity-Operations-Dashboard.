import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly icon = input<IconName>('box');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
