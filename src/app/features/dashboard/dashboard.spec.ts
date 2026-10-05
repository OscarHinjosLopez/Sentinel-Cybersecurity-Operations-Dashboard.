import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Dashboard } from './dashboard';
import { DASHBOARD_REPOSITORY } from './data-access/dashboard.repository';
import { DashboardSummary } from './models/dashboard.models';
import { createDashboardSummary } from './data-access/dashboard.fixtures';
describe('Dashboard states', () => {
  let response: Subject<DashboardSummary | null>;
  beforeEach(() => {
    response = new Subject();
    TestBed.configureTestingModule({
      deferBlockBehavior: DeferBlockBehavior.Manual,
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: DASHBOARD_REPOSITORY, useValue: { getSummary: () => response } },
      ],
    });
  });
  it('keeps exact data available while charts are deferred, loading or unable to load', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    response.next(createDashboardSummary('24h', new Date('2026-10-03T12:00:00Z')));
    fixture.detectChanges();
    const blocks = await fixture.getDeferBlocks();
    expect(blocks).toHaveLength(3);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-dashboard-chart')).toHaveLength(0);
    expect(element.querySelectorAll('.chart-placeholder')).toHaveLength(3);
    expect(element.querySelector('details')?.textContent).toContain('Detected 42');
    await blocks[0].render(DeferBlockState.Loading);
    expect(element.querySelector('[role=status].chart-placeholder')?.textContent).toContain(
      'Loading activity',
    );
    await blocks[0].render(DeferBlockState.Error);
    expect(element.querySelector('.chart-error')?.textContent).toContain(
      'Exact values remain available',
    );
    expect(element.querySelector('details')?.textContent).toContain('Detected 42');
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
