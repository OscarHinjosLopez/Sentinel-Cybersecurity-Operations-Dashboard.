import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Dashboard } from './dashboard';
import { DASHBOARD_REPOSITORY } from './data-access/dashboard.repository';
import { DashboardSummary } from './models/dashboard.models';
describe('Dashboard states', () => {
  let response: Subject<DashboardSummary | null>;
  beforeEach(() => {
    response = new Subject();
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: DASHBOARD_REPOSITORY, useValue: { getSummary: () => response } },
      ],
    });
  });
  it('shows skeletons and disables refresh while pending', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-skeleton')).toHaveLength(8);
    expect(element.querySelector('button')?.disabled).toBe(true);
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });
  it('shows empty state without KPI values', () => {
    const fixture = TestBed.createComponent(Dashboard);
    response.next(null);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No security activity yet');
    expect(element.querySelector('app-kpi-card')).toBeNull();
  });
  it('shows a generic alert and a working retry action', () => {
    const fixture = TestBed.createComponent(Dashboard);
    response.error(new Error('stack'));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role=alert]')?.textContent).toContain(
      'Unable to load security overview.',
    );
    expect(element.textContent).not.toContain('stack');
    response = new Subject();
    element.querySelector<HTMLButtonElement>('.state button')?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('app-skeleton')).toHaveLength(8);
  });
});
