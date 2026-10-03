import { Device, DeviceType, OperatingSystem, DeviceVulnerability } from '../models/device.models';
const departments = [
  'Engineering',
  'Finance',
  'Operations',
  'Human Resources',
  'Sales',
  'Security',
  'Executive',
];
const owners = [
  'Alex Morgan',
  'Jordan Lee',
  'Taylor Reed',
  'Sam Rivera',
  'Casey Chen',
  'Robin Patel',
  'Jamie Wilson',
];
const types: readonly DeviceType[] = [
  'laptop',
  'workstation',
  'laptop',
  'server',
  'virtual-machine',
  'laptop',
  'mobile',
  'workstation',
  'laptop',
  'server',
];
const apps = [
  ['Sentinel Agent', '5.4.2', 'Sentinel'],
  ['Endpoint Browser', '128.2', 'Example Software'],
  ['Workspace Client', '4.8', 'Example Collaboration'],
  ['Credential Vault', '3.1', 'Example Security'],
  ['VPN Client', '7.2', 'Example Networks'],
  ['Productivity Suite', '24.1', 'Example Office'],
  ['Backup Agent', '6.3', 'Example Storage'],
  ['Asset Monitor', '2.9', 'Example Operations'],
  ['Developer Toolkit', '12.0', 'Example Development'],
  ['PDF Reader', '11.4', 'Example Documents'],
  ['Terminal Client', '8.1', 'Example Systems'],
  ['Device Diagnostics', '2.2', 'Example Diagnostics'],
];
export function createDevices(now = new Date()): Device[] {
  const anchor = Math.floor(now.getTime() / 86400000) * 86400000;
  return Array.from({ length: 463 }, (_, i) => {
    const type = types[i % types.length];
    const mobile = type === 'mobile';
    const operatingSystem: OperatingSystem = mobile
      ? Math.floor(i / 10) % 2
        ? 'ios'
        : 'android'
      : type === 'server' || type === 'virtual-machine'
        ? i % 3
          ? 'linux'
          : 'windows'
        : i % 4
          ? 'windows'
          : 'macos';
    const osVersion =
      operatingSystem === 'windows'
        ? type === 'server'
          ? 'Windows Server 2025'
          : i % 3
            ? 'Windows 11 Pro'
            : 'Windows 10 Enterprise'
        : operatingSystem === 'linux'
          ? i % 2
            ? 'Ubuntu 24.04 LTS'
            : 'RHEL 9'
          : operatingSystem === 'macos'
            ? 'macOS 15'
            : operatingSystem === 'ios'
              ? 'iOS 19'
              : 'Android 16';
    const status =
      i % 23 === 0 ? 'isolated' : i % 19 === 0 ? 'inactive' : i % 9 === 0 ? 'offline' : 'online';
    const protectionStatus =
      i % 29 === 0
        ? 'unknown'
        : i % 17 === 0
          ? 'unprotected'
          : i % 7 === 0
            ? 'at-risk'
            : 'protected';
    const securityScore =
      protectionStatus === 'protected'
        ? 78 + (i % 23)
        : protectionStatus === 'at-risk'
          ? 52 + (i % 23)
          : 25 + (i % 24);
    const risk =
      securityScore < 50
        ? 'critical'
        : securityScore < 75
          ? 'high'
          : securityScore < 90
            ? 'medium'
            : 'low';
    const lastScanAt = new Date(anchor - (i % 12) * 86400000).toISOString();
    const vulnerabilities: DeviceVulnerability[] = Array.from({ length: i % 9 }, (_, j) => ({
      id: `vuln-${i}-${j}`,
      cve: `DEMO-CVE-${String(i + 1).padStart(5, '0')}-${j + 1}`,
      title: [
        'Unpatched service component',
        'Outdated encryption library',
        'Insecure application configuration',
        'Privilege boundary weakness',
      ][j % 4],
      severity: (['critical', 'high', 'medium', 'low'] as const)[j % 4],
      cvss: [9.4, 8.1, 5.8, 3.2][j % 4],
      detectedAt: lastScanAt,
      status: j % 5 === 4 ? 'remediated' : j % 7 === 6 ? 'accepted-risk' : 'open',
      description:
        'Fictitious assessment finding for this demo endpoint. This identifier is not a real CVE and does not assert an actual software vulnerability.',
    }));
    vulnerabilities.sort((a, b) => b.cvss - a.cvss);
    const department = departments[i % 7];
    const hostname = `${['ENG', 'FIN', 'OPS', 'HR', 'SLS', 'SEC', 'EXE'][i % 7]}-${type === 'laptop' ? 'LT' : type === 'server' ? 'SRV' : type === 'mobile' ? 'MOB' : type === 'virtual-machine' ? 'VM' : 'WS'}-${String(i + 1).padStart(3, '0')}`;
    return {
      id: `DEV-${String(i + 1).padStart(5, '0')}`,
      hostname,
      displayName: `${department} ${type.replace('-', ' ')}`,
      type,
      status,
      risk,
      protectionStatus,
      securityScore,
      operatingSystem,
      osVersion,
      ipAddress: `192.0.2.${(i % 254) + 1}`,
      macAddress: `02:00:00:${Math.floor(i / 256)
        .toString(16)
        .padStart(2, '0')}:${(i % 256).toString(16).padStart(2, '0')}:01`,
      owner: owners[(i * 3) % 7],
      department,
      lastSeenAt: new Date(
        anchor - (status === 'online' ? (i % 60) * 60000 : ((i % 10) + 1) * 86400000),
      ).toISOString(),
      lastScanAt,
      agentVersion: i % 11 === 0 ? '5.2.0' : '5.4.2',
      vulnerabilities,
      installedSoftware: apps.slice(0, 8 + (i % 5)).map(([name, version, publisher]) => ({
        name,
        version: name === 'Sentinel Agent' ? (i % 11 === 0 ? '5.2.0' : '5.4.2') : version,
        publisher,
        installedAt: new Date(anchor - 45 * 86400000).toISOString(),
      })),
      activity: [
        {
          timestamp: lastScanAt,
          type: 'scan',
          label: 'Security scan completed',
          description: 'Mock posture assessment completed.',
        },
        {
          timestamp: new Date(anchor - 2 * 86400000).toISOString(),
          type: 'policy',
          label: 'Policy applied',
          description: 'Standard endpoint baseline evaluated.',
        },
        {
          timestamp: new Date(anchor - 3 * 86400000).toISOString(),
          type: 'agent',
          label: 'Agent checked in',
          description: 'Endpoint telemetry received by the demo environment.',
        },
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)) as Device['activity'],
    };
  });
}
