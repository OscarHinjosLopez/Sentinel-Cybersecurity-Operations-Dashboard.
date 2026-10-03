import { ParamMap, Params } from '@angular/router';
import { ThreatQuery, ThreatSort } from '../models/threat.models';
import { SEVERITIES, STATUSES, VECTORS } from './threat-rules';
export const DEFAULT_THREAT_QUERY: ThreatQuery = {
  search: '',
  severities: [],
  statuses: [],
  vectors: [],
  sortBy: 'detectedAt',
  sortDirection: 'desc',
  page: 1,
  pageSize: 25,
};
const SORTS: readonly ThreatSort[] = ['detectedAt', 'severity', 'status', 'confidence'];
function validValues<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  return allowed.filter((value) => raw?.split(',').includes(value));
}
function validDate(raw: string | null): string | undefined {
  const date = raw ? new Date(raw) : null;
  return raw &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    date &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === raw
    ? raw
    : undefined;
}
export function parseThreatQuery(params: ParamMap): ThreatQuery {
  const rawPage = params.get('page') ?? '1';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const size = Number(params.get('pageSize'));
  const sort = params.get('sort');
  let dateFrom = validDate(params.get('from'));
  let dateTo = validDate(params.get('to'));
  if (dateFrom && dateTo && dateFrom > dateTo) {
    dateFrom = undefined;
    dateTo = undefined;
  }
  return {
    search: (params.get('search') ?? '').trim().slice(0, 200),
    severities: validValues(params.get('severity'), SEVERITIES),
    statuses: validValues(params.get('status'), STATUSES),
    vectors: validValues(params.get('vector'), VECTORS),
    dateFrom,
    dateTo,
    sortBy: SORTS.includes(sort as ThreatSort) ? (sort as ThreatSort) : 'detectedAt',
    sortDirection: params.get('direction') === 'asc' ? 'asc' : 'desc',
    page: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
    pageSize: size === 10 || size === 50 ? size : 25,
  };
}
export function serializeThreatQuery(query: ThreatQuery): Params {
  const params: Params = {};
  if (query.search) params['search'] = query.search;
  if (query.severities.length) params['severity'] = query.severities.join(',');
  if (query.statuses.length) params['status'] = query.statuses.join(',');
  if (query.vectors.length) params['vector'] = query.vectors.join(',');
  if (query.dateFrom) params['from'] = query.dateFrom;
  if (query.dateTo) params['to'] = query.dateTo;
  if (query.page !== 1) params['page'] = query.page;
  if (query.pageSize !== 25) params['pageSize'] = query.pageSize;
  if (query.sortBy !== 'detectedAt') params['sort'] = query.sortBy;
  if (query.sortDirection !== 'desc') params['direction'] = query.sortDirection;
  return params;
}
