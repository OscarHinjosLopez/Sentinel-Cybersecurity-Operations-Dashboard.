import type { Severity } from '../../../shared/ui/severity-badge/severity-badge';
export type DeviceId = string;
export type DeviceRisk = Severity;
export type DeviceStatus = 'online' | 'offline' | 'isolated' | 'inactive';
export type DeviceType = 'workstation' | 'laptop' | 'server' | 'mobile' | 'virtual-machine';
export type OperatingSystem = 'windows' | 'macos' | 'linux' | 'ios' | 'android';
export type ProtectionStatus = 'protected' | 'at-risk' | 'unprotected' | 'unknown';
export type DeviceAction = 'scan' | 'isolate' | 'restore';
export interface DeviceVulnerability {
  readonly id: string;
  readonly cve: string;
  readonly title: string;
  readonly severity: DeviceRisk;
  readonly cvss: number;
  readonly detectedAt: string;
  readonly status: 'open' | 'remediated' | 'accepted-risk';
  readonly description: string;
}
export interface InstalledSoftware {
  readonly name: string;
  readonly version: string;
  readonly publisher: string;
  readonly installedAt?: string;
  readonly risk?: DeviceRisk;
}
export interface DeviceActivityEvent {
  readonly timestamp: string;
  readonly type: 'scan' | 'threat' | 'agent' | 'status' | 'policy' | 'vulnerability';
  readonly label: string;
  readonly description: string;
}
export interface Device {
  readonly id: DeviceId;
  readonly hostname: string;
  readonly displayName: string;
  readonly type: DeviceType;
  readonly status: DeviceStatus;
  readonly risk: DeviceRisk;
  readonly protectionStatus: ProtectionStatus;
  readonly securityScore: number;
  readonly operatingSystem: OperatingSystem;
  readonly osVersion: string;
  readonly ipAddress: string;
  readonly macAddress: string;
  readonly owner: string;
  readonly department: string;
  readonly lastSeenAt: string;
  readonly lastScanAt: string;
  readonly agentVersion: string;
  readonly vulnerabilities: readonly DeviceVulnerability[];
  readonly installedSoftware: readonly InstalledSoftware[];
  readonly activity: readonly DeviceActivityEvent[];
}
export interface SecurityPosture {
  readonly score: number;
  readonly label: string;
  readonly vulnerabilityCount: number;
  readonly criticalVulnerabilityCount: number;
  readonly softwareCount: number;
  readonly agentOutdated: boolean;
  readonly findings: readonly string[];
}
export type DeviceSort =
  'hostname' | 'risk' | 'status' | 'securityScore' | 'lastSeenAt' | 'lastScanAt';
export interface DeviceQuery {
  readonly search: string;
  readonly status: DeviceStatus | '';
  readonly risk: DeviceRisk | '';
  readonly protection: ProtectionStatus | '';
  readonly os: OperatingSystem | '';
  readonly page: number;
  readonly pageSize: 10 | 25 | 50;
  readonly sortBy: DeviceSort;
  readonly sortDirection: 'asc' | 'desc';
}
export interface InventorySummary {
  readonly total: number;
  readonly protected: number;
  readonly atRisk: number;
  readonly offline: number;
  readonly criticalRisk: number;
}
export interface DeviceListResponse {
  readonly items: readonly Device[];
  readonly total: number;
  readonly summary: InventorySummary;
}
