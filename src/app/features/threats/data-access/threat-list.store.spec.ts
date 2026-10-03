import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ThreatListStore } from './threat-list.store';
import { THREAT_REPOSITORY } from './threat.repository';
import { ThreatListResponse, ThreatQuery } from '../models/threat.models';
import { DEFAULT_THREAT_QUERY } from '../utils/threat-query';
import { createThreats } from './threat.fixtures';
describe('ThreatListStore', () => {
  let store: ThreatListStore;
  let requests: { query: ThreatQuery; response: Subject<ThreatListResponse> }[];
  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({
      providers: [
        ThreatListStore,
        {
          provide: THREAT_REPOSITORY,
          useValue: {
            list: (query: ThreatQuery) => {
              const response = new Subject<ThreatListResponse>();
              requests.push({ query, response });
              return response;
            },
          },
        },
      ],
    });
    store = TestBed.inject(ThreatListStore);
  });
  afterEach(() => vi.useRealTimers());
  it('loads and derives total, page range and refreshing', () => {
    store.load();
    expect(store.isLoading()).toBe(true);
    requests[0].response.next({ items: createThreats().slice(0, 25), total: 200 });
    expect(store.start()).toBe(1);
    expect(store.end()).toBe(25);
    expect(store.pageCount()).toBe(8);
    store.load();
    expect(store.isRefreshing()).toBe(true);
    expect(store.data()).toHaveLength(25);
  });
  it('debounces text input for 300 ms and only loads the latest term', () => {
    vi.useFakeTimers();
    store.search('a');
    vi.advanceTimersByTime(200);
    store.search('malware');
    vi.advanceTimersByTime(299);
    expect(requests).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(requests).toHaveLength(1);
    expect(requests[0].query.search).toBe('malware');
  });
  it('cancels pending search when filters reset or history changes', () => {
    vi.useFakeTimers();
    store.search('old');
    store.resetFilters();
    vi.advanceTimersByTime(400);
    expect(store.query().search).toBe('');
    expect(requests).toHaveLength(1);
    store.search('later');
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, search: 'from-url' });
    vi.advanceTimersByTime(400);
    expect(store.query().search).toBe('from-url');
  });
  it('resets pagination on combined filter changes', () => {
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, page: 4 });
    store.setSeverityFilter(['critical']);
    store.setStatusFilter(['open']);
    store.setVectorFilter(['malware']);
    expect(store.query()).toMatchObject({
      page: 1,
      severities: ['critical'],
      statuses: ['open'],
      vectors: ['malware'],
    });
    expect(store.hasFilters()).toBe(true);
  });
  it('toggles sort, controls pages and resets page on size changes', () => {
    store.load();
    store.setSort('confidence');
    expect(store.query()).toMatchObject({ sortBy: 'confidence', sortDirection: 'desc' });
    store.setSort('confidence');
    expect(store.query().sortDirection).toBe('asc');
    store.setPage(3);
    expect(store.query().page).toBe(3);
    store.setPageSize(50);
    expect(store.query()).toMatchObject({ page: 1, pageSize: 50 });
  });
  it('resets query and emits URL change events', () => {
    const changes: ThreatQuery[] = [];
    store.changes.subscribe((query) => changes.push(query));
    store.setSeverityFilter(['high']);
    store.resetFilters();
    expect(store.query()).toEqual(DEFAULT_THREAT_QUERY);
    expect(changes).toHaveLength(2);
  });
  it('cancels older requests so late search results cannot overwrite new results', () => {
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, search: 'old' });
    store.applyQuery({ ...DEFAULT_THREAT_QUERY, search: 'new' });
    expect(requests[0].response.observed).toBe(false);
    requests[1].response.next({ items: [], total: 2 });
    requests[0].response.next({ items: [], total: 100 });
    expect(store.total()).toBe(2);
    expect(store.query().search).toBe('new');
  });
  it('retries errors without leaking internal details', () => {
    store.load();
    requests[0].response.error(new Error('database secrets'));
    expect(store.error()).toBe('Unable to load threats.');
    expect(store.isLoading()).toBe(false);
    store.retry();
    expect(store.error()).toBeNull();
    requests[1].response.next({ items: [], total: 0 });
    expect(store.total()).toBe(0);
  });
  it('does not re-request identical URL state', () => {
    store.applyQuery(DEFAULT_THREAT_QUERY);
    store.applyQuery({ ...DEFAULT_THREAT_QUERY });
    expect(requests).toHaveLength(1);
  });
  it('cleans timers, subscriptions and events on destruction', () => {
    vi.useFakeTimers();
    store.load();
    store.search('pending');
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(400);
    expect(requests).toHaveLength(1);
    expect(requests[0].response.observed).toBe(false);
  });
});
