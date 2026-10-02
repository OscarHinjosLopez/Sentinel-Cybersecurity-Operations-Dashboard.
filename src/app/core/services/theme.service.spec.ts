import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';
describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    TestBed.inject(DOCUMENT).documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('starts in light mode and applies it to the document', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.mode()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
  it('switches the document between dark and light and persists the preference', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    expect(theme.mode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    theme.toggle();
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
  it('uses a saved preference before the system preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(TestBed.inject(ThemeService).mode()).toBe('light');
  });
  it('restores a saved dark theme on startup', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
  it('uses the system dark theme when no preference is saved', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
  });
  it('ignores an invalid stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
  });
  it('remains usable when reading and writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Unavailable');
    });
    const theme = TestBed.inject(ThemeService);
    expect(() => theme.toggle()).not.toThrow();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
