import type { Severity } from '../../../shared/ui/severity-badge/severity-badge';
import type { Status } from '../../../shared/ui/status-indicator/status-indicator';
import type { IconName } from '../../../shared/ui/icon/icon';

export type DashboardTimeRange = '24h' | '7d' | '30d';
export interface KpiMetric {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly supplementaryValue?: number;
  readonly detail: string;
  readonly trend: number;
  readonly improvement: 'increase' | 'decrease';
  readonly icon: IconName;
}
export interface ThreatActivityPoint {
  readonly timestamp: string;
  readonly detected: number;
  readonly blocked: number;
}
export interface SeverityDistribution {
  readonly severity: Severity;
  readonly count: number;
}
export interface AttackVector {
  readonly name: string;
  readonly count: number;
}
export interface ThreatOrigin {
  readonly country: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly count: number;
}
export interface RecentThreat {
  readonly live?: boolean;
  readonly id: string;
  readonly severity: Severity;
  readonly title: string;
  readonly source: string;
  readonly target: string;
  readonly timestamp: string;
  readonly status: Status;
}
export interface DashboardSummary {
  readonly realtimeRevision?: number;
  readonly range: DashboardTimeRange;
  readonly generatedAt: string;
  readonly metrics: readonly KpiMetric[];
  readonly activity: readonly ThreatActivityPoint[];
  readonly severities: readonly SeverityDistribution[];
  readonly vectors: readonly AttackVector[];
  readonly origins: readonly ThreatOrigin[];
  readonly recent: readonly RecentThreat[];
}
