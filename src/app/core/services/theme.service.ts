import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
export type ThemeMode = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'sentinel-theme';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly currentMode = signal<ThemeMode>(this.initialMode());
  readonly mode = this.currentMode.asReadonly();
  constructor() {
    this.apply(this.mode());
  }
  setMode(mode: ThemeMode): void {
    this.currentMode.set(mode);
    this.apply(mode);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* Theme remains usable when storage is blocked. */
    }
  }
  toggle(): void {
    this.setMode(this.mode() === 'light' ? 'dark' : 'light');
  }
  private apply(mode: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', mode);
  }
  private initialMode(): ThemeMode {
    const window = this.document.defaultView;
    try {
      const saved = window?.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* Fall back to the system preference. */
    }
    return window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
