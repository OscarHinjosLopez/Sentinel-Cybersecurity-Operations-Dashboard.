import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ConnectionState } from '../../../core/realtime/realtime.models';
import { RealtimeStatus } from './realtime-status';
describe('RealtimeStatus', () => {
  it('maps every state to accessible text and exposes timestamp/attempt details', () => {
    const state = signal<ConnectionState>('connected');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RealtimeService,
          useValue: {
            connectionState: state,
            lastEventAt: signal(new Date('2026-10-03T15:00:00Z')),
            reconnectAttempt: signal(3),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(RealtimeStatus);
    for (const [value, label] of [
      ['connected', 'Live'],
      ['connecting', 'Connecting'],
      ['reconnecting', 'Reconnecting'],
      ['error', 'Offline'],
      ['disconnected', 'Offline'],
    ] as const) {
      state.set(value);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain(label);
      expect(element.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
      expect(fixture.componentInstance.detail()).toContain('Reconnect attempt: 3');
    }
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.compact .label')?.textContent,
    ).toBe('Offline');
  });
  it('renders an offline fallback when realtime is not configured', () => {
    const fixture = TestBed.createComponent(RealtimeStatus);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Offline');
  });
});
