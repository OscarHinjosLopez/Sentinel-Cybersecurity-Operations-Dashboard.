import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
@Component({
  selector: 'app-page-header',
  imports: [Icon],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<IconName>();
}
