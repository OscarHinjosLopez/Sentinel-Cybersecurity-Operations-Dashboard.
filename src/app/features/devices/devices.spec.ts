import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { Devices } from './devices';
import { DEVICE_REPOSITORY } from './data-access/device.repository';
import { DeviceListResponse } from './models/device.models';
import { createDevices } from './data-access/device.fixtures';
describe('Device inventory URL and presentation', () => {
  const response = {
    items: createDevices().slice(0, 25),
    total: 463,
    summary: { total: 463, protected: 350, atRisk: 60, offline: 30, criticalRisk: 15 },
  };
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'devices', component: Devices }]),
        { provide: DEVICE_REPOSITORY, useValue: { list: () => of(response) } },
      ],
    }),
  );
  it('restores query and visible controls from a direct URL', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(
      '/devices?risk=high&status=online&os=windows&page=2&pageSize=10',
      Devices,
    );
    await harness.fixture.whenStable();
    expect(component.store.query()).toMatchObject({
      risk: 'high',
      status: 'online',
      os: 'windows',
      page: 2,
      pageSize: 10,
    });
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#device-risk')?.value,
    ).toBe('high');
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#device-page-size')?.value,
    ).toBe('10');
  });
  it('publishes store changes into URL state', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/devices', Devices);
    component.store.setRiskFilter('high');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('risk=high');
    component.store.setPage(2);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('page=2');
  });
  it('normalizes invalid query parameters without loops', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/devices?page=-99&pageSize=99999&status=evil&sort=secret');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/devices');
  });
  it('responds to subsequent URL changes and history-style restoration', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/devices?risk=high&page=2', Devices);
    await harness.navigateByUrl('/devices?status=offline');
    expect(component.store.query().risk).toBe('');
    await harness.navigateByUrl('/devices?risk=high&page=2');
    expect(component.store.query()).toMatchObject({ risk: 'high', page: 2 });
  });
  it('renders semantic sortable headers, real links and matching summary', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/devices');
    const element = harness.routeNativeElement!;
    expect(element.querySelector('th[aria-sort=ascending]')?.textContent).toContain('Device');
    expect(element.querySelector('tbody a')?.getAttribute('href')).toContain('/devices/DEV-00001');
    expect(element.querySelector('.inventory-summary')?.textContent).toContain('463');
  });
  it('distinguishes empty inventory from unmatched filters', async () => {
    TestBed.overrideProvider(DEVICE_REPOSITORY, {
      useValue: { list: () => of({ ...response, items: [], total: 0 }) },
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/devices');
    expect(harness.routeNativeElement?.textContent).toContain('No devices enrolled');
    await harness.navigateByUrl('/devices?search=nomatch');
    expect(harness.routeNativeElement?.textContent).toContain('No devices match your filters');
  });
  it('shows loading and retryable error without blocking the shell', async () => {
    const pending = new Subject<DeviceListResponse>();
    TestBed.overrideProvider(DEVICE_REPOSITORY, { useValue: { list: () => pending } });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/devices');
    expect(harness.routeNativeElement?.querySelectorAll('app-skeleton')).toHaveLength(6);
    pending.error(new Error('private'));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Unable to load devices.');
  });
});
