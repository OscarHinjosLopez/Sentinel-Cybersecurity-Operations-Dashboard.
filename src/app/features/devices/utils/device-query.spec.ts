import { convertToParamMap } from '@angular/router';
import { DEFAULT_DEVICE_QUERY, parseDeviceQuery, serializeDeviceQuery } from './device-query';
import { canDeviceAct, devicePosture } from './device-rules';
import { securityScoreLabel } from '../../../shared/utils/security-score';
import { createDevices } from '../data-access/device.fixtures';
describe('Device URL and posture', () => {
  it('round trips the complete query state', () => {
    const query = {
      ...DEFAULT_DEVICE_QUERY,
      search: 'Engineering',
      status: 'online' as const,
      risk: 'high' as const,
      protection: 'at-risk' as const,
      os: 'windows' as const,
      page: 2,
      pageSize: 10 as const,
      sortBy: 'lastScanAt' as const,
      sortDirection: 'desc' as const,
    };
    expect(parseDeviceQuery(convertToParamMap(serializeDeviceQuery(query)))).toEqual(query);
  });
  it.each([
    { page: '-99', pageSize: '99999' },
    { page: '1.5', pageSize: '11' },
    { page: 'Infinity', pageSize: 'abc' },
    { page: '9007199254740993', pageSize: '-1' },
  ])('normalizes invalid pagination %j', (params) => {
    const query = parseDeviceQuery(convertToParamMap(params));
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(25);
  });
  it('drops unsupported enum and sort values', () => {
    expect(
      parseDeviceQuery(
        convertToParamMap({
          status: 'evil',
          os: 'OSX',
          risk: 'severe',
          protection: 'unsafe',
          sort: 'secret',
          direction: 'up',
        }),
      ),
    ).toEqual(DEFAULT_DEVICE_QUERY);
  });
  it('omits defaults and bounds search', () => {
    expect(serializeDeviceQuery(DEFAULT_DEVICE_QUERY)).toEqual({});
    expect(parseDeviceQuery(convertToParamMap({ search: 'a'.repeat(1000) })).search).toHaveLength(
      200,
    );
  });
  it.each([
    { score: 100, label: 'Excellent' },
    { score: 90, label: 'Excellent' },
    { score: 89, label: 'Good' },
    { score: 75, label: 'Good' },
    { score: 74, label: 'Needs attention' },
    { score: 50, label: 'Needs attention' },
    { score: 49, label: 'Critical' },
    { score: 0, label: 'Critical' },
  ])('classifies score $score as $label', ({ score, label }) =>
    expect(securityScoreLabel(score)).toBe(label),
  );
  it('derives findings from actual vulnerabilities, scan age and agent version', () => {
    const date = new Date('2026-10-03');
    const device = createDevices(date)[11];
    const posture = devicePosture(device, date);
    expect(posture.agentOutdated).toBe(true);
    expect(posture.findings).toContain('Security agent is outdated.');
    expect(posture.findings).toContain('Device has not completed a scan in 11 days.');
    expect(posture.criticalVulnerabilityCount).toBe(1);
    expect(posture.softwareCount).toBe(device.installedSoftware.length);
  });
  it('clears stale-scan findings after a scan without pretending remediation', () => {
    const date = new Date('2026-10-03');
    const device = createDevices(date)[11];
    const after = devicePosture({ ...device, lastScanAt: date.toISOString() }, date);
    expect(after.findings.some((value) => value.includes('scan in'))).toBe(false);
    expect(after.criticalVulnerabilityCount).toBeGreaterThan(0);
  });
  it('defines valid and invalid device actions centrally', () => {
    expect(canDeviceAct('online', 'isolate')).toBe(true);
    expect(canDeviceAct('isolated', 'isolate')).toBe(false);
    expect(canDeviceAct('isolated', 'restore')).toBe(true);
    expect(canDeviceAct('online', 'restore')).toBe(false);
    expect(canDeviceAct('offline', 'scan')).toBe(false);
  });
});
