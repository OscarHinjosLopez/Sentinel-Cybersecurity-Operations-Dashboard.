import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AUTH_API } from '../../../core/auth/data-access/auth-api';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../../../core/auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../../../core/auth/session-storage';
import { MockThreatRepository, THREAT_MOCK_CONFIG } from './threat.repository';
import { DEFAULT_THREAT_QUERY } from '../utils/threat-query';
import { createThreats } from './threat.fixtures';
describe('MockThreatRepository', () => {
  let repository: MockThreatRepository;
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
        { provide: THREAT_MOCK_CONFIG, useValue: { latency: 0, scenario: 'success' } },
      ],
    });
    repository = TestBed.inject(MockThreatRepository);
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  it('generates 200 stable bounded threats', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    const data = createThreats(now);
    expect(data).toEqual(createThreats(now));
    expect(data).toHaveLength(200);
    expect(new Set(data.map((item) => item.id)).size).toBe(200);
    expect(data.every((item) => item.confidence >= 0 && item.confidence <= 100)).toBe(true);
  });
  it.each(['THR-00001', 'credential', '203.0.113.1', 'Identity Gateway'])(
    'searches ID, title, source and target for %s',
    async (search) => {
      const result = await firstValueFrom(repository.list({ ...DEFAULT_THREAT_QUERY, search }));
      expect(result.total).toBeGreaterThan(0);
      expect(
        result.items.every((item) =>
          [item.id, item.title, item.source, item.target].some((value) =>
            value.toLowerCase().includes(search.toLowerCase()),
          ),
        ),
      ).toBe(true);
    },
  );
  it('combines severity, status and vector filters', async () => {
    const result = await firstValueFrom(
      repository.list({
        ...DEFAULT_THREAT_QUERY,
        severities: ['critical'],
        statuses: ['open'],
        vectors: ['credential-attack'],
      }),
    );
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every(
        (item) =>
          item.severity === 'critical' &&
          item.status === 'open' &&
          item.vector === 'credential-attack',
      ),
    ).toBe(true);
  });
  it('sorts the whole dataset before paginating and uses stable ID ties', async () => {
    const query = {
      ...DEFAULT_THREAT_QUERY,
      sortBy: 'confidence' as const,
      sortDirection: 'desc' as const,
      pageSize: 10 as const,
    };
    const first = await firstValueFrom(repository.list(query));
    const second = await firstValueFrom(repository.list({ ...query, page: 2 }));
    expect(first.items.at(-1)!.confidence).toBeGreaterThanOrEqual(second.items[0].confidence);
    expect(first.total).toBe(200);
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(20);
  });
  it('orders critical severity first in descending priority', async () => {
    const result = await firstValueFrom(
      repository.list({ ...DEFAULT_THREAT_QUERY, sortBy: 'severity' }),
    );
    expect(result.items.every((item) => item.severity === 'critical')).toBe(true);
  });
  it('filters inclusive calendar dates', async () => {
    const date = createThreats()[0].detectedAt.slice(0, 10);
    const result = await firstValueFrom(
      repository.list({ ...DEFAULT_THREAT_QUERY, dateFrom: date, dateTo: date }),
    );
    expect(result.total).toBe(1);
  });
  it('loads details directly and distinguishes unknown IDs', async () => {
    expect((await firstValueFrom(repository.getById('THR-00001')))?.id).toBe('THR-00001');
    expect(await firstValueFrom(repository.getById('THR-99999'))).toBeNull();
  });
  it.each(['admin', 'analyst'] as const)(
    'allows %s to investigate and resolve immutably',
    async (role) => {
      await TestBed.inject(AuthService).login({
        email: `${role}@sentinel.dev`,
        password: 'Sentinel123!',
      });
      const before = await firstValueFrom(repository.getById('THR-00001'));
      const investigated = await firstValueFrom(
        repository.updateStatus('THR-00001', 'investigating'),
      );
      expect(investigated.status).toBe('investigating');
      expect(before?.status).toBe('open');
      const resolved = await firstValueFrom(repository.updateStatus('THR-00001', 'resolved'));
      expect(resolved.timeline).toHaveLength(4);
      expect(resolved.timeline.at(-1)?.actor).toBeTruthy();
      expect(
        (await firstValueFrom(repository.list({ ...DEFAULT_THREAT_QUERY, search: 'THR-00001' })))
          .items[0].status,
      ).toBe('resolved');
    },
  );
  it('denies Viewer mutation inside the repository', async () => {
    await TestBed.inject(AuthService).login({
      email: 'viewer@sentinel.dev',
      password: 'Sentinel123!',
    });
    await expect(
      firstValueFrom(repository.updateStatus('THR-00001', 'investigating')),
    ).rejects.toThrow('Not authorized');
    expect((await firstValueFrom(repository.getById('THR-00001')))?.status).toBe('open');
  });
  it('rejects invalid transitions and missing threats', async () => {
    await TestBed.inject(AuthService).login({
      email: 'admin@sentinel.dev',
      password: 'Sentinel123!',
    });
    await expect(firstValueFrom(repository.updateStatus('THR-00001', 'resolved'))).rejects.toThrow(
      'Invalid transition',
    );
    await expect(
      firstValueFrom(repository.updateStatus('THR-99999', 'investigating')),
    ).rejects.toThrow();
  });
  it('checks authorization at completion after logout', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await TestBed.inject(AuthService).login({
      email: 'admin@sentinel.dev',
      password: 'Sentinel123!',
    });
    const result = firstValueFrom(repository.updateStatus('THR-00001', 'investigating'));
    const assertion = expect(result).rejects.toThrow('Not authorized');
    await TestBed.inject(AuthService).logout();
    await assertion;
  });
});
