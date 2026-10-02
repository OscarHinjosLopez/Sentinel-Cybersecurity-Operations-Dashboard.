import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
export type ThemeMode = 'light' | 'dark';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly currentMode = signal<ThemeMode>('light');
  readonly mode = this.currentMode.asReadonly();
  constructor() {
    effect(() => {
      this.document.documentElement.setAttribute('data-theme', this.mode());
    });
  }
  setMode(mode: ThemeMode): void {
    this.currentMode.set(mode);
  }
  toggle(): void {
    this.setMode(this.mode() === 'light' ? 'dark' : 'light');
  }
}
