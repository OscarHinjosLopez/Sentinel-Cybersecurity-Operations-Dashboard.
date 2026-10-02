import { TestBed } from '@angular/core/testing';
import { Severity, SeverityBadge } from './severity-badge';
describe('SeverityBadge', () => {
  it.each<Severity>(['critical', 'high', 'medium', 'low'])(
    'renders %s as text and a distinct style state',
    async (severity) => {
      const fixture = TestBed.createComponent(SeverityBadge);
      fixture.componentRef.setInput('severity', severity);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent?.trim()).toBe(severity[0]?.toUpperCase() + severity.slice(1));
      expect(element.querySelector('.badge')?.getAttribute('data-severity')).toBe(severity);
      expect(element.querySelector('.dot')?.getAttribute('aria-hidden')).toBe('true');
    },
  );
  it('updates the visible label when severity changes', async () => {
    const fixture = TestBed.createComponent(SeverityBadge);
    fixture.componentRef.setInput('severity', 'low');
    await fixture.whenStable();
    fixture.componentRef.setInput('severity', 'critical');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Critical');
  });
});
