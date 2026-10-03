import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { DeviceDetail } from './device-detail';
import { DeviceDetailStore } from '../data-access/device-detail.store';
import { DEVICE_REPOSITORY } from '../data-access/device.repository';
import { createDevices } from '../data-access/device.fixtures';
import { Device } from '../models/device.models';
describe('Device detail and management boundary', () => {
  let response: Subject<Device | null>;
  let mutation: Subject<Device>;
  let permitted: ReturnType<typeof signal<boolean>>;
  let scan: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  const device = createDevices(new Date('2026-10-03'))[141];
  beforeEach(() => {
    response = new Subject();
    mutation = new Subject();
    permitted = signal(true);
    scan = vi.fn(() => mutation);
    update = vi.fn(() => mutation);
    TestBed.configureTestingModule({
      imports: [DeviceDetail],
      providers: [
        DeviceDetailStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: device.id })) },
        },
        { provide: AuthService, useValue: { hasPermission: () => permitted() } },
        {
          provide: DEVICE_REPOSITORY,
          useValue: { getById: () => response, runMockScan: scan, updateProtectionStatus: update },
        },
      ],
    });
  });
  it('renders structural skeletons while loading', () => {
    const fixture = TestBed.createComponent(DeviceDetail);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-skeleton')).toHaveLength(2);
  });
  it('loads information, posture, vulnerabilities, software and activity directly', () => {
    const fixture = TestBed.createComponent(DeviceDetail);
    response.next(device);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe(device.hostname);
    expect(element.textContent).toContain('Security posture');
    expect(element.querySelectorAll('.vulnerabilities li')).toHaveLength(
      device.vulnerabilities.length,
    );
    expect(element.querySelectorAll('.software li')).toHaveLength(device.installedSoftware.length);
    expect(element.querySelectorAll('.timeline li')).toHaveLength(3);
  });
  it('renders retryable generic error and not found distinctly', () => {
    const fixture = TestBed.createComponent(DeviceDetail);
    response.error(new Error('private'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Unable to load device details.',
    );
    response = new Subject();
    fixture.componentInstance.store.retry();
    response.next(null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(
      'Device not found',
    );
  });
  it('derives posture and filters software locally', () => {
    const fixture = TestBed.createComponent(DeviceDetail);
    response.next(device);
    fixture.detectChanges();
    fixture.componentInstance.softwareSearch.set('Sentinel');
    fixture.detectChanges();
    expect(fixture.componentInstance.software()).toHaveLength(1);
    expect(fixture.componentInstance.store.posture()?.softwareCount).toBe(
      device.installedSoftware.length,
    );
  });
  it.each(['Analyst', 'Viewer'])('hides actions and blocks programmatic execution for %s', () => {
    permitted.set(false);
    const fixture = TestBed.createComponent(DeviceDetail);
    response.next(device);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Read-only access');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.device-actions button'),
    ).toBeNull();
    fixture.componentInstance.store.perform('scan');
    fixture.componentInstance.store.perform('isolate');
    expect(scan).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.store.actionError()).toContain('permission');
  });
  it('allows Admin scan and prevents duplicate submissions', () => {
    const store = TestBed.inject(DeviceDetailStore);
    store.load(device.id);
    response.next(device);
    const success = vi.fn();
    store.perform('scan', success);
    store.perform('scan');
    expect(scan).toHaveBeenCalledTimes(1);
    expect(store.isUpdating()).toBe(true);
    mutation.next({ ...device, lastScanAt: new Date().toISOString() });
    expect(store.isUpdating()).toBe(false);
    expect(success).toHaveBeenCalledTimes(1);
  });
  it('isolates/restores and rejects invalid isolation', () => {
    const store = TestBed.inject(DeviceDetailStore);
    store.load(device.id);
    response.next(device);
    store.perform('isolate');
    expect(update).toHaveBeenCalledWith(device.id, 'isolated');
    mutation.next({ ...device, status: 'isolated' });
    store.perform('isolate');
    expect(update).toHaveBeenCalledTimes(1);
    expect(store.actionError()).toContain('not available');
    store.perform('restore');
    expect(update).toHaveBeenLastCalledWith(device.id, 'online');
  });
  it('preserves device data after an action error', () => {
    const store = TestBed.inject(DeviceDetailStore);
    store.load(device.id);
    response.next(device);
    store.perform('scan');
    mutation.error(new Error('private'));
    expect(store.data()).toBe(device);
    expect(store.isUpdating()).toBe(false);
    expect(store.actionError()).toContain('Unable to update');
  });
  it('cancels old detail requests and mutations when navigating to another endpoint', () => {
    const store = TestBed.inject(DeviceDetailStore);
    store.load(device.id);
    response.next(device);
    store.perform('scan');
    store.load('DEV-00002');
    expect(mutation.observed).toBe(false);
    mutation.next({ ...device, status: 'isolated' });
    expect(store.data()).toBeNull();
  });
});
