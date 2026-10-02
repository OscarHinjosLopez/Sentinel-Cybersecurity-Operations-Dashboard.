import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
describe('ThemeService', () => {
  afterEach(() => {
    TestBed.inject(DOCUMENT).documentElement.removeAttribute('data-theme');
  });
  it('starts in light mode and applies it to the document', () => {
    const theme = TestBed.inject(ThemeService);
    TestBed.tick();
    expect(theme.mode()).toBe('light');
    expect(TestBed.inject(DOCUMENT).documentElement.getAttribute('data-theme')).toBe('light');
  });
  it('switches the document between dark and light', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
    expect(TestBed.inject(DOCUMENT).documentElement.getAttribute('data-theme')).toBe('dark');
    theme.toggle();
    TestBed.tick();
    expect(TestBed.inject(DOCUMENT).documentElement.getAttribute('data-theme')).toBe('light');
  });
});
