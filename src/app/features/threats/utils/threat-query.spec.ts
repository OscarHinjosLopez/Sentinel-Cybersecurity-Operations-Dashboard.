import { convertToParamMap } from '@angular/router';
import { DEFAULT_THREAT_QUERY, parseThreatQuery, serializeThreatQuery } from './threat-query';
import { canTransition } from './threat-rules';
describe('Threat URL query', () => {
  it('round trips all meaningful fields', () => {
    const query = {
      ...DEFAULT_THREAT_QUERY,
      search: 'Identity',
      severities: ['critical', 'high'] as const,
      statuses: ['investigating'] as const,
      vectors: ['malware'] as const,
      page: 2,
      pageSize: 10 as const,
      sortBy: 'confidence' as const,
      sortDirection: 'asc' as const,
      dateFrom: '2026-09-01',
      dateTo: '2026-10-03',
    };
    expect(parseThreatQuery(convertToParamMap(serializeThreatQuery(query)))).toEqual(query);
  });
  it.each([
    { page: '-99', pageSize: '99999' },
    { page: '1.5', pageSize: '12' },
    { page: 'Infinity', pageSize: 'wat' },
    { page: '9007199254740993', pageSize: '-1' },
  ])('normalizes invalid pagination %j', (params) => {
    const query = parseThreatQuery(convertToParamMap(params));
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(25);
  });
  it('deduplicates and drops unknown enum values', () => {
    const query = parseThreatQuery(
      convertToParamMap({
        severity: 'critical,critical,evil',
        status: 'unknown',
        vector: 'malware,network',
        sort: 'password',
        direction: 'up',
      }),
    );
    expect(query.severities).toEqual(['critical']);
    expect(query.statuses).toEqual([]);
    expect(query.vectors).toEqual(['malware', 'network']);
    expect(query.sortBy).toBe('detectedAt');
    expect(query.sortDirection).toBe('desc');
  });
  it.each(['2026-99-99', '2026-02-31', 'invalid'])('rejects invalid date %s safely', (from) =>
    expect(parseThreatQuery(convertToParamMap({ from })).dateFrom).toBeUndefined(),
  );
  it('drops reversed dates and limits search length', () => {
    const query = parseThreatQuery(
      convertToParamMap({ from: '2026-10-03', to: '2026-09-01', search: 'a'.repeat(1000) }),
    );
    expect(query.dateFrom).toBeUndefined();
    expect(query.search).toHaveLength(200);
  });
  it('omits defaults for compact URLs', () =>
    expect(serializeThreatQuery(DEFAULT_THREAT_QUERY)).toEqual({}));
  it('centralizes valid and terminal status transitions', () => {
    expect(canTransition('open', 'investigating')).toBe(true);
    expect(canTransition('investigating', 'resolved')).toBe(true);
    expect(canTransition('open', 'false-positive')).toBe(true);
    expect(canTransition('open', 'resolved')).toBe(false);
    expect(canTransition('resolved', 'open')).toBe(false);
    expect(canTransition('false-positive', 'investigating')).toBe(false);
  });
});
