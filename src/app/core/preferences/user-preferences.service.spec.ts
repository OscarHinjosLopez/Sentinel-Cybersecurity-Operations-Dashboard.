import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  PREFERENCES_KEY,
  UserPreferencesService,
} from './user-preferences.service';
import { ThemeService, THEME_STORAGE_KEY } from '../services/theme.service';
import { parseThreatQuery } from '../../features/threats/utils/threat-query';
import { parseDeviceQuery } from '../../features/devices/utils/device-query';
describe('User preferences', () => {
  beforeEach(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.removeItem(PREFERENCES_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
  });
  it('provides safe defaults and applies density/motion to the document', () => {
    const service = TestBed.inject(UserPreferencesService);
    expect(service.preferences()).toEqual(DEFAULT_PREFERENCES);
    expect(document.documentElement.dataset['density']).toBe('comfortable');
    expect(service.motion()).toBe('system');
  });
  it('persists versioned non-sensitive fields and restores them', () => {
    let service = TestBed.inject(UserPreferencesService);
    service.update({
      compactMode: true,
      motion: 'reduce',
      defaultPageSize: 50,
      realtimeNotifications: false,
    });
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual({
      ...DEFAULT_PREFERENCES,
      compactMode: true,
      motion: 'reduce',
      defaultPageSize: 50,
      realtimeNotifications: false,
    });
    TestBed.resetTestingModule();
    service = TestBed.inject(UserPreferencesService);
    expect(service.compactMode()).toBe(true);
    expect(service.defaultPageSize()).toBe(50);
    expect(service.reducedMotion()).toBe(true);
    expect(service.realtimeNotifications()).toBe(false);
  });
  it('reuses ThemeService and its existing persistence key', () => {
    const preferences = TestBed.inject(UserPreferencesService);
    const theme = TestBed.inject(ThemeService);
    preferences.setTheme('dark');
    expect(theme.mode()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    theme.toggle();
    expect(preferences.themeMode()).toBe('light');
  });
  it.each(['{invalid', 'null', '42', '[]', '{"version":2,"defaultPageSize":50}'])(
    'falls back safely for corrupt storage %s',
    (raw) => {
      localStorage.setItem(PREFERENCES_KEY, raw);
      expect(TestBed.inject(UserPreferencesService).preferences()).toEqual(DEFAULT_PREFERENCES);
    },
  );
  it('validates individual fields and drops arbitrary storage properties', () => {
    expect(
      parsePreferences({
        version: 1,
        compactMode: 'true',
        motion: 'invalid',
        defaultPageSize: 500,
        realtimeNotifications: 0,
        accessToken: 'ignored',
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });
  it('works in memory when storage reads and writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(UserPreferencesService);
    expect(() => service.update({ compactMode: true, defaultPageSize: 10 })).not.toThrow();
    service.setTheme('dark');
    expect(service.defaultPageSize()).toBe(10);
    expect(service.themeMode()).toBe('dark');
  });
  it.each([10, 25, 50] as const)(
    'uses %s as default for both queries and respects explicit page size',
    (pageSize) => {
      const params = convertToParamMap({});
      expect(parseThreatQuery(params, pageSize).pageSize).toBe(pageSize);
      expect(parseDeviceQuery(params, pageSize).pageSize).toBe(pageSize);
      for (const explicit of [10, 25, 50]) {
        expect(parseThreatQuery(convertToParamMap({ pageSize: explicit }), pageSize).pageSize).toBe(
          explicit,
        );
        expect(parseDeviceQuery(convertToParamMap({ pageSize: explicit }), pageSize).pageSize).toBe(
          explicit,
        );
      }
    },
  );
  it('tracks the system preference, honors explicit full/reduce and cleans up its listener', () => {
    const original = window.matchMedia;
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const remove = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: true,
        addEventListener: (_type: string, callback: (event: MediaQueryListEvent) => void) =>
          (listener = callback),
        removeEventListener: remove,
      }),
    });
    try {
      const service = TestBed.inject(UserPreferencesService);
      expect(service.reducedMotion()).toBe(true);
      service.update({ motion: 'full' });
      expect(service.reducedMotion()).toBe(false);
      service.update({ motion: 'reduce' });
      expect(service.reducedMotion()).toBe(true);
      service.update({ motion: 'system' });
      listener?.({ matches: false } as MediaQueryListEvent);
      expect(service.reducedMotion()).toBe(false);
      TestBed.resetTestingModule();
      expect(remove).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});
