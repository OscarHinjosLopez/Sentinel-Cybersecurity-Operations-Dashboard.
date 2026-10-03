import { ParamMap, Params } from '@angular/router';
import { DeviceQuery, DeviceSort } from '../models/device.models';
import { DEVICE_RISKS, DEVICE_STATUSES, OS_FAMILIES, PROTECTIONS } from './device-rules';
export const DEFAULT_DEVICE_QUERY: DeviceQuery = {
  search: '',
  status: '',
  risk: '',
  protection: '',
  os: '',
  page: 1,
  pageSize: 25,
  sortBy: 'hostname',
  sortDirection: 'asc',
};
export const DEVICE_SORTS: readonly { key: DeviceSort; label: string }[] = [
  { key: 'hostname', label: 'Device' },
  { key: 'risk', label: 'Risk' },
  { key: 'status', label: 'Status' },
  { key: 'securityScore', label: 'Security score' },
  { key: 'lastSeenAt', label: 'Last seen' },
  { key: 'lastScanAt', label: 'Last scan' },
];
function enumValue<T extends string>(raw: string | null, values: readonly T[]): T | '' {
  return values.find((item) => item === raw) ?? '';
}
export function parseDeviceQuery(params: ParamMap): DeviceQuery {
  const raw = params.get('page') ?? '1';
  const page = /^\d+$/.test(raw) ? Number(raw) : 1;
  const size = Number(params.get('pageSize'));
  return {
    search: (params.get('search') ?? '').trim().slice(0, 200),
    status: enumValue(params.get('status'), DEVICE_STATUSES),
    risk: enumValue(params.get('risk'), DEVICE_RISKS),
    os: enumValue(params.get('os'), OS_FAMILIES),
    protection: enumValue(params.get('protection'), PROTECTIONS),
    page: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
    pageSize: size === 10 || size === 50 ? size : 25,
    sortBy: DEVICE_SORTS.find((item) => item.key === params.get('sort'))?.key ?? 'hostname',
    sortDirection: params.get('direction') === 'desc' ? 'desc' : 'asc',
  };
}
export function serializeDeviceQuery(query: DeviceQuery): Params {
  const params: Params = {};
  for (const key of ['search', 'status', 'risk', 'protection', 'os'] as const)
    if (query[key]) params[key] = query[key];
  if (query.page !== 1) params['page'] = query.page;
  if (query.pageSize !== 25) params['pageSize'] = query.pageSize;
  if (query.sortBy !== 'hostname') params['sort'] = query.sortBy;
  if (query.sortDirection !== 'asc') params['direction'] = query.sortDirection;
  return params;
}
