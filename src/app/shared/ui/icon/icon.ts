import { Component, computed, input } from '@angular/core';
const paths = {
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z M8 12l3 3 5-6',
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  threats: 'm12 3 10 18H2L12 3Z M12 9v5 M12 17h.01',
  devices: 'M3 4h18v13H3z M8 21h8 M12 17v4',
  audit: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
  settings:
    'm10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-3-1-3 2-3-3-3-3-1-1-3h-3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  sun: 'M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  moon: 'M20 14a8 8 0 0 1-10-10A9 9 0 1 0 20 14Z',
  help: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4 M12 16h.01',
  arrow: 'M19 12H5 M11 6l-6 6 6 6',
  chevron: 'm9 5 7 7-7 7',
  box: 'M3 7 12 3l9 4v10l-9 4-9-4V7Z M3 7l9 4 9-4 M12 11v10',
};
export type IconName = keyof typeof paths;
@Component({
  selector: 'app-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="path()" /></svg>',
  styles:
    ':host { display:inline-flex; flex-shrink:0; width:var(--sentinel-icon-size); height:var(--sentinel-icon-size); } svg { width:100%; height:100%; }',
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => paths[this.name()]);
}
