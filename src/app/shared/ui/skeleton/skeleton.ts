import { Component, input } from '@angular/core';
@Component({
  selector: 'app-skeleton',
  template: `<span class="sr-only" role="status">{{ label() }}</span
    ><span class="placeholder" aria-hidden="true" [class.card]="variant() === 'card'"></span>`,
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly variant = input<'line' | 'card'>('line');
  readonly label = input('Loading');
}
