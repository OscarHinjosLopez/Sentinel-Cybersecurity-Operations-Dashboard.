import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { AUTH_API } from '../../../core/auth/data-access/auth-api';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../../../core/auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../../../core/auth/session-storage';
import { DEVICE_MOCK_CONFIG, MockDeviceRepository } from './device.repository';
import { createDevices } from './device.fixtures';
import { DEFAULT_DEVICE_QUERY } from '../utils/device-query';
describe('MockDeviceRepository', () => {
  let repository: MockDeviceRepository;
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
        { provide: DEVICE_MOCK_CONFIG, useValue: { latency: 0, scenario: 'success' } },
      ],
    });
    repository = TestBed.inject(MockDeviceRepository);
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  const login = async (role: string) =>
    TestBed.inject(AuthService).login({ email: `${role}@sentinel.dev`, password: 'Sentinel123!' });
  it('generates deterministic, bounded and coherent device fixtures', () => {
    const date = new Date('2026-10-03');
    const records = createDevices(date);
    expect(records).toEqual(createDevices(date));
    expect(records).toHaveLength(463);
    expect(new Set(records.map((d) => d.id)).size).toBe(463);
    expect(
      records.every(
        (d) =>
          d.securityScore >= 0 &&
          d.securityScore <= 100 &&
          d.vulnerabilities.length <= 8 &&
          d.installedSoftware.length >= 8,
      ),
    ).toBe(true);
    expect(new Set(records.map((d) => d.operatingSystem)).size).toBe(5);
  });
  it('returns a full matching summary rather than current page counts', async () => {
    const result = await firstValueFrom(repository.list(DEFAULT_DEVICE_QUERY));
    expect(result.items).toHaveLength(25);
    expect(result.total).toBe(463);
    expect(result.summary.total).toBe(463);
    expect(result.summary.protected).toBeGreaterThan(25);
  });
  it.each(['ENG-LT', 'engineering', 'Alex Morgan', 'Finance', '192.0.2.1'])(
    'searches hostname, name, owner, department and IP: %s',
    async (search) => {
      const result = await firstValueFrom(repository.list({ ...DEFAULT_DEVICE_QUERY, search }));
      expect(result.total).toBeGreaterThan(0);
      expect(
        result.items.every((d) =>
          [d.hostname, d.displayName, d.owner, d.department, d.ipAddress].some((value) =>
            value.toLowerCase().includes(search.toLowerCase()),
          ),
        ),
      ).toBe(true);
    },
  );
  it('combines all filters and derives matching counts', async () => {
    const result = await firstValueFrom(
      repository.list({
        ...DEFAULT_DEVICE_QUERY,
        status: 'online',
        risk: 'high',
        protection: 'at-risk',
        os: 'windows',
      }),
    );
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every(
        (d) =>
          d.status === 'online' &&
          d.risk === 'high' &&
          d.protectionStatus === 'at-risk' &&
          d.operatingSystem === 'windows',
      ),
    ).toBe(true);
    expect(result.summary.atRisk).toBe(result.total);
  });
  it('sorts globally before pagination with no duplicates between pages', async () => {
    const query = {
      ...DEFAULT_DEVICE_QUERY,
      sortBy: 'securityScore' as const,
      sortDirection: 'desc' as const,
      pageSize: 10 as const,
    };
    const first = await firstValueFrom(repository.list(query));
    const second = await firstValueFrom(repository.list({ ...query, page: 2 }));
    expect(first.items.at(-1)!.securityScore).toBeGreaterThanOrEqual(second.items[0].securityScore);
    expect(new Set([...first.items, ...second.items].map((d) => d.id)).size).toBe(20);
  });
  it('orders critical risk first with descending priority', async () => {
    const result = await firstValueFrom(
      repository.list({ ...DEFAULT_DEVICE_QUERY, sortBy: 'risk', sortDirection: 'desc' }),
    );
    expect(result.items.every((d) => d.risk === 'critical')).toBe(true);
  });
  it('loads a direct device and distinguishes unknown IDs', async () => {
    expect((await firstValueFrom(repository.getById('DEV-00142')))?.id).toBe('DEV-00142');
    expect(await firstValueFrom(repository.getById('DEV-99999'))).toBeNull();
  });
  it('allows Admin to scan and updates timestamp/activity immutably', async () => {
    await login('admin');
    const before = await firstValueFrom(repository.getById('DEV-00142'));
    const updated = await firstValueFrom(repository.runMockScan('DEV-00142'));
    expect(updated.lastScanAt).not.toBe(before?.lastScanAt);
    expect(updated.activity).toHaveLength(before!.activity.length + 1);
    expect(before?.activity).toHaveLength(3);
  });
  it('isolates and restores with centralized transitions and matching list state', async () => {
    await login('admin');
    const isolated = await firstValueFrom(
      repository.updateProtectionStatus('DEV-00142', 'isolated'),
    );
    expect(isolated.status).toBe('isolated');
    await expect(
      firstValueFrom(repository.updateProtectionStatus('DEV-00142', 'isolated')),
    ).rejects.toThrow('Invalid device action');
    const restored = await firstValueFrom(repository.updateProtectionStatus('DEV-00142', 'online'));
    expect(restored.status).toBe('online');
    expect(restored.activity[0].label).toBe('Device restored');
    await expect(
      firstValueFrom(repository.updateProtectionStatus('DEV-00142', 'online')),
    ).rejects.toThrow('Invalid device action');
  });
  it.each(['analyst', 'viewer'])(
    'denies %s programmatic actions in the repository',
    async (role) => {
      await login(role);
      const before = await firstValueFrom(repository.getById('DEV-00142'));
      await expect(firstValueFrom(repository.runMockScan('DEV-00142'))).rejects.toThrow(
        'Not authorized',
      );
      await expect(
        firstValueFrom(repository.updateProtectionStatus('DEV-00142', 'isolated')),
      ).rejects.toThrow('Not authorized');
      expect(await firstValueFrom(repository.getById('DEV-00142'))).toEqual(before);
    },
  );
  it('rechecks permission at completion before a pending mutation can write', async () => {
    await login('admin');
    const before = await firstValueFrom(repository.getById('DEV-00142'));
    const result = firstValueFrom(repository.updateProtectionStatus('DEV-00142', 'isolated'));
    const assertion = expect(result).rejects.toThrow('Not authorized');
    vi.spyOn(TestBed.inject(AuthService), 'hasPermission').mockReturnValue(false);
    await assertion;
    expect(await firstValueFrom(repository.getById('DEV-00142'))).toEqual(before);
  });
});
