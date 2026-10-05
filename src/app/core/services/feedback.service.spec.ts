import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FeedbackService } from './feedback.service';

describe('Lazy feedback', () => {
  it('does not instantiate the overlay until requested and shares it between concurrent messages', async () => {
    const open = vi.fn();
    const factory = vi.fn(() => ({ open }));
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useFactory: factory }] });
    const feedback = TestBed.inject(FeedbackService);
    expect(factory).not.toHaveBeenCalled();
    await Promise.all([
      feedback.open('First', 'Dismiss', { politeness: 'polite' }),
      feedback.open('Second', 'Dismiss', { duration: 4000 }),
    ]);
    expect(factory).toHaveBeenCalledOnce();
    expect(open.mock.calls).toEqual([
      ['First', 'Dismiss', { politeness: 'polite' }],
      ['Second', 'Dismiss', { duration: 4000 }],
    ]);
  });

  it('contains overlay failures and permits a later feedback attempt', async () => {
    const open = vi.fn().mockImplementationOnce(() => {
      throw new Error('Overlay failed');
    });
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: { open } }] });
    const feedback = TestBed.inject(FeedbackService);
    await expect(feedback.open('First', 'Dismiss', {})).resolves.toBeUndefined();
    await feedback.open('Retry', 'Dismiss', {});
    expect(open).toHaveBeenCalledTimes(2);
  });
});
