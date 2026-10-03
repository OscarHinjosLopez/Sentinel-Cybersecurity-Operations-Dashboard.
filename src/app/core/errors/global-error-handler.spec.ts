import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { GlobalErrorHandler, RecoverableUiError } from './global-error-handler';
import { Logger } from './logger';

describe('Global error handling', () => {
  let handler: GlobalErrorHandler;
  let report: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    report = vi.fn();
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: Logger, useValue: { report } },
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });
  afterEach(() => vi.restoreAllMocks());
  it('reports an unexpected failure without surfacing sensitive messages or blanket snackbars', () => {
    handler.handleError(new TypeError('Bearer secret-token user@example.test'));
    expect(report).toHaveBeenCalledWith({
      source: 'angular',
      category: 'unexpected',
      name: 'TypeError',
    });
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/secret-token|user@example/);
    expect(open).not.toHaveBeenCalled();
  });
  it('uses generic polite feedback for explicitly recoverable failures and throttles repeated feedback', () => {
    const time = vi.spyOn(Date, 'now').mockReturnValue(10000);
    handler.handleError(new RecoverableUiError('Private exception details'));
    handler.handleError(new RecoverableUiError('Repeated private details'));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('Something went wrong. Please try again.', 'Dismiss', {
      duration: 5000,
      politeness: 'polite',
    });
    time.mockReturnValue(20000);
    handler.handleError(new RecoverableUiError('Another failure'));
    expect(open).toHaveBeenCalledTimes(2);
  });
  it('does not throw recursively if diagnostics or the feedback overlay fail', () => {
    report.mockImplementation(() => {
      throw new Error('Reporting failed');
    });
    open.mockImplementation(() => {
      throw new Error('Overlay failed');
    });
    expect(() => handler.handleError(new RecoverableUiError('Recoverable'))).not.toThrow();
  });
  it('handles non-Error rejections and RangeError without serializing arbitrary values', () => {
    handler.handleError({ token: 'secret-token' });
    handler.handleError(new RangeError('Private details'));
    expect(report.mock.calls.map(([entry]) => entry.name)).toEqual(['UnknownError', 'RangeError']);
    expect(open).not.toHaveBeenCalled();
  });
});
