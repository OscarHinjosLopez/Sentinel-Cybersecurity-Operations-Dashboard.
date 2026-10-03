import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { Device, DeviceId, DeviceListResponse, DeviceQuery } from '../models/device.models';
import { canDeviceAct, DEVICE_RISKS, DEVICE_STATUSES } from '../utils/device-rules';
import { createDevices } from './device.fixtures';
export interface DeviceRepository {
  list(query: DeviceQuery): Observable<DeviceListResponse>;
  getById(id: DeviceId): Observable<Device | null>;
  updateProtectionStatus(id: DeviceId, status: 'isolated' | 'online'): Observable<Device>;
  runMockScan(id: DeviceId): Observable<Device>;
}
export const DEVICE_REPOSITORY = new InjectionToken<DeviceRepository>('DeviceRepository');
export const DEVICE_MOCK_CONFIG = new InjectionToken<{
  latency: number;
  scenario: 'success' | 'error' | 'empty';
}>('DeviceMockConfig', {
  providedIn: 'root',
  factory: () => ({ latency: 500, scenario: 'success' }),
});
@Injectable({ providedIn: 'root' })
export class MockDeviceRepository implements DeviceRepository {
  private readonly auth = inject(AuthService);
  private readonly config = inject(DEVICE_MOCK_CONFIG);
  private readonly records = this.config.scenario === 'empty' ? [] : createDevices();
  private delayed<T>(fn: () => T): Observable<T> {
    return timer(this.config.latency).pipe(
      map(() => {
        if (this.config.scenario === 'error') throw new Error('Mock device service unavailable');
        return fn();
      }),
    );
  }
  list(query: DeviceQuery): Observable<DeviceListResponse> {
    return this.delayed(() => {
      const search = query.search.toLowerCase();
      const filtered = this.records.filter(
        (d) =>
          (!search ||
            [d.hostname, d.displayName, d.owner, d.department, d.ipAddress].some((value) =>
              value.toLowerCase().includes(search),
            )) &&
          (!query.status || d.status === query.status) &&
          (!query.risk || d.risk === query.risk) &&
          (!query.protection || d.protectionStatus === query.protection) &&
          (!query.os || d.operatingSystem === query.os),
      );
      const summary = {
        total: filtered.length,
        protected: filtered.filter((d) => d.protectionStatus === 'protected').length,
        atRisk: filtered.filter(
          (d) => d.protectionStatus === 'at-risk' || d.protectionStatus === 'unprotected',
        ).length,
        offline: filtered.filter((d) => d.status === 'offline').length,
        criticalRisk: filtered.filter((d) => d.risk === 'critical').length,
      };
      filtered.sort((a, b) => {
        let result: number;
        if (query.sortBy === 'risk')
          result = DEVICE_RISKS.indexOf(b.risk) - DEVICE_RISKS.indexOf(a.risk);
        else if (query.sortBy === 'status')
          result = DEVICE_STATUSES.indexOf(a.status) - DEVICE_STATUSES.indexOf(b.status);
        else if (query.sortBy === 'securityScore') result = a.securityScore - b.securityScore;
        else result = a[query.sortBy].localeCompare(b[query.sortBy]);
        return (query.sortDirection === 'asc' ? result : -result) || a.id.localeCompare(b.id);
      });
      return {
        items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: filtered.length,
        summary,
      };
    });
  }
  getById(id: DeviceId): Observable<Device | null> {
    return this.delayed(() => this.records.find((d) => d.id === id) ?? null);
  }
  private authorized(id: DeviceId): { device: Device; index: number } {
    if (!this.auth.hasPermission(PERMISSIONS.DEVICES_MANAGE)) throw new Error('Not authorized');
    const index = this.records.findIndex((d) => d.id === id);
    if (index < 0) throw new Error('Device not found');
    return { device: this.records[index], index };
  }
  updateProtectionStatus(id: DeviceId, status: 'isolated' | 'online'): Observable<Device> {
    return this.delayed(() => {
      const { device, index } = this.authorized(id);
      const action = status === 'isolated' ? 'isolate' : 'restore';
      if (!canDeviceAct(device.status, action)) throw new Error('Invalid device action');
      const timestamp = new Date().toISOString();
      const updated: Device = {
        ...device,
        status,
        lastSeenAt: status === 'online' ? timestamp : device.lastSeenAt,
        activity: [
          {
            timestamp,
            type: 'status',
            label: status === 'isolated' ? 'Device isolated' : 'Device restored',
            description: 'Simulated network containment change. No real endpoint was modified.',
          },
          ...device.activity,
        ],
      };
      this.records[index] = updated;
      return updated;
    });
  }
  runMockScan(id: DeviceId): Observable<Device> {
    return this.delayed(() => {
      const { device, index } = this.authorized(id);
      if (!canDeviceAct(device.status, 'scan'))
        throw new Error('Device is not available for scanning');
      const timestamp = new Date().toISOString();
      const updated: Device = {
        ...device,
        lastScanAt: timestamp,
        activity: [
          {
            timestamp,
            type: 'scan',
            label: 'Security scan completed',
            description: 'Mock assessment refreshed. No remediation or real scan was performed.',
          },
          ...device.activity,
        ],
      };
      this.records[index] = updated;
      return updated;
    });
  }
}
