import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { ThemeMode, ThemeService } from '../services/theme.service';
export type MotionPreference = 'system' | 'reduce' | 'full';
export type PageSize = 10 | 25 | 50;
export interface UserPreferences {
  readonly version: 1;
  readonly compactMode: boolean;
  readonly motion: MotionPreference;
  readonly defaultPageSize: PageSize;
  readonly realtimeNotifications: boolean;
}
export const PREFERENCES_KEY = 'sentinel.preferences';
export const DEFAULT_PREFERENCES: UserPreferences = {
  version: 1,
  compactMode: false,
  motion: 'system',
  defaultPageSize: 25,
  realtimeNotifications: true,
};
export function parsePreferences(value: unknown): UserPreferences {
  if (typeof value !== 'object' || !value || !('version' in value) || value.version !== 1)
    return { ...DEFAULT_PREFERENCES };
  const data = value as Record<string, unknown>;
  return {
    version: 1,
    compactMode: typeof data['compactMode'] === 'boolean' ? data['compactMode'] : false,
    motion: data['motion'] === 'reduce' || data['motion'] === 'full' ? data['motion'] : 'system',
    defaultPageSize:
      data['defaultPageSize'] === 10 || data['defaultPageSize'] === 50
        ? data['defaultPageSize']
        : 25,
    realtimeNotifications:
      typeof data['realtimeNotifications'] === 'boolean' ? data['realtimeNotifications'] : true,
  };
}
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);
  private readonly state = signal(this.restore());
  private readonly systemMotion = signal(false);
  readonly preferences = this.state.asReadonly();
  readonly themeMode = this.theme.mode;
  readonly compactMode = computed(() => this.state().compactMode);
  readonly motion = computed(() => this.state().motion);
  readonly defaultPageSize = computed(() => this.state().defaultPageSize);
  readonly realtimeNotifications = computed(() => this.state().realtimeNotifications);
  readonly reducedMotion = computed(
    () => this.motion() === 'reduce' || (this.motion() === 'system' && this.systemMotion()),
  );
  constructor() {
    const media = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.systemMotion.set(media?.matches ?? false);
    const changed = (event: MediaQueryListEvent) => this.systemMotion.set(event.matches);
    media?.addEventListener('change', changed);
    inject(DestroyRef).onDestroy(() => media?.removeEventListener('change', changed));
    this.apply();
    effect(() => this.apply());
  }
  private apply(): void {
    this.document.documentElement.dataset['density'] = this.compactMode()
      ? 'compact'
      : 'comfortable';
    this.document.documentElement.dataset['motion'] = this.motion();
    this.document.documentElement.dataset['reducedMotion'] = String(this.reducedMotion());
  }
  private restore(): UserPreferences {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(PREFERENCES_KEY);
      return raw && raw.length <= 4096
        ? parsePreferences(JSON.parse(raw) as unknown)
        : { ...DEFAULT_PREFERENCES };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }
  update(patch: Partial<Omit<UserPreferences, 'version'>>): void {
    const next = parsePreferences({ ...this.state(), ...patch });
    this.state.set(next);
    try {
      this.document.defaultView?.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    } catch {
      /* Preferences remain available in memory. */
    }
  }
  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
