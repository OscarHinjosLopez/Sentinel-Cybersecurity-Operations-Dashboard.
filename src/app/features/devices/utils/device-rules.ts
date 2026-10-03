import { Device, DeviceAction, DeviceStatus, SecurityPosture } from '../models/device.models';
import { securityScoreLabel } from '../../../shared/utils/security-score';
export const DEVICE_STATUSES = ['online', 'offline', 'isolated', 'inactive'] as const;
export const DEVICE_RISKS = ['critical', 'high', 'medium', 'low'] as const;
export const PROTECTIONS = ['protected', 'at-risk', 'unprotected', 'unknown'] as const;
export const OS_FAMILIES = ['windows', 'macos', 'linux', 'ios', 'android'] as const;
export const OS_LABELS = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
};
export const PROTECTION_LABELS = {
  protected: 'Protected',
  'at-risk': 'At risk',
  unprotected: 'Unprotected',
  unknown: 'Unknown',
};
export const ACTION_LABELS: Record<DeviceAction, string> = {
  scan: 'Run security scan',
  isolate: 'Isolate device',
  restore: 'Restore device',
};
const ACTIONS: Readonly<Record<DeviceStatus, readonly DeviceAction[]>> = {
  online: ['scan', 'isolate'],
  offline: ['isolate'],
  isolated: ['scan', 'restore'],
  inactive: ['isolate'],
};
export function allowedDeviceActions(status: DeviceStatus): readonly DeviceAction[] {
  return ACTIONS[status];
}
export function canDeviceAct(status: DeviceStatus, action: DeviceAction): boolean {
  return ACTIONS[status].includes(action);
}
export function devicePosture(device: Device, now: Date): SecurityPosture {
  const open = device.vulnerabilities.filter((item) => item.status === 'open');
  const critical = open.filter((item) => item.severity === 'critical').length;
  const agentOutdated = device.agentVersion !== '5.4.2';
  const findings: string[] = [];
  if (critical)
    findings.push(
      `${critical} critical ${critical === 1 ? 'vulnerability requires' : 'vulnerabilities require'} remediation.`,
    );
  if (agentOutdated) findings.push('Security agent is outdated.');
  const scanDays = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(device.lastScanAt)) / 86400000),
  );
  if (scanDays >= 7) findings.push(`Device has not completed a scan in ${scanDays} days.`);
  if (device.protectionStatus !== 'protected')
    findings.push(
      `Protection status is ${PROTECTION_LABELS[device.protectionStatus].toLowerCase()}; review endpoint coverage.`,
    );
  if (!findings.length)
    findings.push('No outstanding posture findings in the current demo assessment.');
  return {
    score: device.securityScore,
    label: securityScoreLabel(device.securityScore),
    vulnerabilityCount: open.length,
    criticalVulnerabilityCount: critical,
    softwareCount: device.installedSoftware.length,
    agentOutdated,
    findings,
  };
}
