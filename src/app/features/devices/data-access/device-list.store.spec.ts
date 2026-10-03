import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { DEVICE_REPOSITORY } from './device.repository';
import { DeviceListStore } from './device-list.store';
import { DeviceListResponse, DeviceQuery } from '../models/device.models';
import { DEFAULT_DEVICE_QUERY } from '../utils/device-query';
import { createDevices } from './device.fixtures';
describe('DeviceListStore', () => {
  let store: DeviceListStore;
  let requests: { query: DeviceQuery; response: Subject<DeviceListResponse> }[];
  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({
      providers: [
        DeviceListStore,
        {
          provide: DEVICE_REPOSITORY,
          useValue: {
            list: (query: DeviceQuery) => {
              const response = new Subject<DeviceListResponse>();
              requests.push({ query, response });
              return response;
            },
          },
        },
      ],
    });
    store = TestBed.inject(DeviceListStore);
  });
  afterEach(() => vi.useRealTimers());
  it('loads and exposes repository summary and derived pagination', () => {
    store.load();
    expect(store.isLoading()).toBe(true);
    const summary = { total: 463, protected: 350, atRisk: 60, offline: 30, criticalRisk: 15 };
    requests[0].response.next({ items: createDevices().slice(0, 25), total: 463, summary });
    expect(store.summary()).toEqual(summary);
    expect(store.start()).toBe(1);
    expect(store.end()).toBe(25);
    expect(store.pageCount()).toBe(19);
    store.load();
    expect(store.isRefreshing()).toBe(true);
  });
  it('debounces search by 300 ms and uses only the latest input', () => {
    vi.useFakeTimers();
    store.search('a');
    vi.advanceTimersByTime(200);
    store.search('engineering');
    vi.advanceTimersByTime(299);
    expect(requests).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(requests[0].query.search).toBe('engineering');
    expect(requests).toHaveLength(1);
  });
  it('combines filters, resets pagination, and publishes query changes', () => {
    store.applyQuery({ ...DEFAULT_DEVICE_QUERY, page: 4 });
    store.setRiskFilter('high');
    store.setStatusFilter('online');
    store.setProtectionFilter('at-risk');
    store.setOsFilter('windows');
    expect(store.query()).toMatchObject({
      page: 1,
      risk: 'high',
      status: 'online',
      protection: 'at-risk',
      os: 'windows',
    });
    expect(store.hasFilters()).toBe(true);
  });
  it('sorts, changes page size and resets query', () => {
    store.setSort('securityScore');
    expect(store.query().sortDirection).toBe('asc');
    store.setSort('securityScore');
    expect(store.query().sortDirection).toBe('desc');
    store.setPage(3);
    store.setPageSize(50);
    expect(store.query().page).toBe(1);
    store.resetFilters();
    expect(store.query()).toEqual(DEFAULT_DEVICE_QUERY);
  });
  it('cancels prior requests and cannot overwrite the newer query', () => {
    store.applyQuery({ ...DEFAULT_DEVICE_QUERY, search: 'old' });
    store.applyQuery({ ...DEFAULT_DEVICE_QUERY, search: 'new' });
    expect(requests[0].response.observed).toBe(false);
    const response = {
      items: [],
      total: 0,
      summary: { total: 0, protected: 0, atRisk: 0, offline: 0, criticalRisk: 0 },
    };
    requests[1].response.next(response);
    requests[0].response.next({ ...response, total: 200 });
    expect(store.total()).toBe(0);
    expect(store.query().search).toBe('new');
  });
  it('retries generic errors and cancels pending search on URL changes', () => {
    store.load();
    requests[0].response.error(new Error('internal'));
    expect(store.error()).toBe('Unable to load devices.');
    store.retry();
    expect(store.error()).toBeNull();
    vi.useFakeTimers();
    store.search('old');
    store.applyQuery({ ...DEFAULT_DEVICE_QUERY, search: 'url' });
    vi.advanceTimersByTime(400);
    expect(store.query().search).toBe('url');
  });
  it('cleans requests, events and debounce timers on destroy', () => {
    vi.useFakeTimers();
    store.load();
    store.search('pending');
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(400);
    expect(requests).toHaveLength(1);
    expect(requests[0].response.observed).toBe(false);
  });
  it('does not issue duplicate requests when URL parsing changes object property order', () => {
    store.applyQuery({ ...DEFAULT_DEVICE_QUERY, os: 'windows', risk: 'high' });
    store.applyQuery({
      search: '',
      status: '',
      risk: 'high',
      os: 'windows',
      protection: '',
      page: 1,
      pageSize: 25,
      sortBy: 'hostname',
      sortDirection: 'asc',
    });
    expect(requests).toHaveLength(1);
  });
});
