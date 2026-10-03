import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { Threats } from './threats';
import { THREAT_REPOSITORY } from './data-access/threat.repository';
import { ThreatListResponse } from './models/threat.models';
import { createThreats } from './data-access/threat.fixtures';
describe('Threat list URL and presentation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'threats', component: Threats }]),
        {
          provide: THREAT_REPOSITORY,
          useValue: { list: () => of({ items: createThreats().slice(0, 25), total: 200 }) },
        },
      ],
    }),
  );
  it('restores filters, pagination and sorting from a direct URL', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(
      '/threats?severity=critical&status=investigating&page=2&pageSize=10&sort=confidence&direction=asc',
      Threats,
    );
    expect(component.store.query()).toMatchObject({
      severities: ['critical'],
      statuses: ['investigating'],
      page: 2,
      pageSize: 10,
      sortBy: 'confidence',
      sortDirection: 'asc',
    });
    expect(harness.routeNativeElement?.textContent).toContain('Clear all');
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#status-filter')?.value,
    ).toBe('investigating');
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#threat-page-size')?.value,
    ).toBe('10');
  });
  it('writes store actions to query parameters without extra loads', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/threats', Threats);
    component.store.setSeverityFilter(['high']);
    await harness.fixture.whenStable();
    const tree = TestBed.inject(Router).parseUrl(TestBed.inject(Router).url);
    expect(tree.queryParams['severity']).toBe('high');
    component.store.setPage(3);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('page=3');
  });
  it('normalizes invalid URL values with replace navigation', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/threats?page=-99&pageSize=99999&sort=invalid&severity=unknown');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/threats');
  });
  it('responds to subsequent route state and preserves explicit valid page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/threats?severity=critical&status=investigating&page=2');
    const component = await harness.navigateByUrl('/threats?search=identity&pageSize=50', Threats);
    expect(component.store.query().search).toBe('identity');
    await harness.navigateByUrl('/threats?severity=critical&status=investigating&page=2');
    expect(component.store.query().page).toBe(2);
    expect(TestBed.inject(Router).url).toContain('page=2');
  });
  it('uses semantic sortable headers and real detail links', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/threats');
    const element = harness.routeNativeElement!;
    expect(element.querySelector('th[aria-sort=descending]')?.textContent).toContain('Detected');
    expect(element.querySelector('tbody a')?.getAttribute('href')).toContain('/threats/THR-00001');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
  });
  it('distinguishes general and filtered empty states', async () => {
    TestBed.overrideProvider(THREAT_REPOSITORY, {
      useValue: { list: () => of({ items: [], total: 0 }) },
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/threats');
    expect(harness.routeNativeElement?.textContent).toContain('No threats detected');
    await harness.navigateByUrl('/threats?search=nomatch');
    expect(harness.routeNativeElement?.textContent).toContain('No threats match your filters');
  });
  it('shows retry on list error and skeletons while loading', async () => {
    const response = new Subject<ThreatListResponse>();
    TestBed.overrideProvider(THREAT_REPOSITORY, { useValue: { list: () => response } });
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/threats', Threats);
    expect(harness.routeNativeElement?.querySelectorAll('app-skeleton').length).toBe(6);
    response.error(new Error('private'));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Unable to load threats.');
    expect(component.store.error()).toBe('Unable to load threats.');
  });
});
