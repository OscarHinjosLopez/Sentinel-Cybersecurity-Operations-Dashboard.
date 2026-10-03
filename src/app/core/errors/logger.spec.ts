import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DEVELOPMENT_LOGGING, Logger } from './logger';

describe('Centralized diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());
  for (const development of [true, false]) {
    it(`${development ? 'logs sanitized diagnostics in development' : 'does not log diagnostics in production'}`, () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [{ provide: DEVELOPMENT_LOGGING, useValue: development }],
      });
      const diagnostic = { source: 'angular', category: 'unexpected', name: 'TypeError' } as const;
      TestBed.inject(Logger).report(diagnostic);
      if (development) expect(consoleError).toHaveBeenCalledWith('[Sentinel]', diagnostic);
      else expect(consoleError).not.toHaveBeenCalled();
    });
  }
});
