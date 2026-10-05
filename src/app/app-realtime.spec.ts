import { TestBed } from '@angular/core/testing';
import { FeedbackService } from './core/services/feedback.service';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { RealtimeEvent } from './core/realtime/realtime.models';
import { RealtimeService } from './core/realtime/realtime.service';
import { createdEvent, liveThreat, updatedEvent } from './core/realtime/realtime.test-fixtures';
describe('Critical live notifications', () => {
  afterEach(() => vi.useRealTimers());
  it('only announces critical creates, limits bursts and removes its listener on destroy', () => {
    vi.useFakeTimers();
    const events = new Subject<RealtimeEvent>();
    const open = vi.fn();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: RealtimeService, useValue: { events$: events } },
        { provide: FeedbackService, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(App);
    events.next(createdEvent('high', liveThreat('THR-22002', { severity: 'high' })));
    events.next(updatedEvent());
    expect(open).not.toHaveBeenCalled();
    events.next(createdEvent());
    events.next(createdEvent('another-critical', liveThreat('THR-22003')));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('Critical threat detected'),
      'Dismiss',
      expect.objectContaining({ politeness: 'polite' }),
    );
    vi.advanceTimersByTime(10000);
    events.next(createdEvent('later', liveThreat('THR-22004')));
    expect(open).toHaveBeenCalledTimes(2);
    fixture.destroy();
    expect(events.observed).toBe(false);
  });
});
