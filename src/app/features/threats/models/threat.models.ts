import type { Severity } from '../../../shared/ui/severity-badge/severity-badge';
export type ThreatId = string;
export type ThreatSeverity = Severity;
export type ThreatStatus = 'open' | 'investigating' | 'resolved' | 'false-positive';
export type ThreatVector =
  'credential-attack' | 'malware' | 'phishing' | 'exploit' | 'network' | 'insider' | 'other';
export interface ThreatIndicator {
  readonly type: 'ip' | 'domain' | 'email' | 'hash' | 'url' | 'process';
  readonly value: string;
}
export interface ThreatTimelineEvent {
  readonly timestamp: string;
  readonly type: 'detected' | 'enriched' | 'investigation' | 'status';
  readonly label: string;
  readonly description?: string;
  readonly actor?: string;
}
export interface Threat {
  readonly id: ThreatId;
  readonly title: string;
  readonly description: string;
  readonly severity: ThreatSeverity;
  readonly status: ThreatStatus;
  readonly vector: ThreatVector;
  readonly source: string;
  readonly target: string;
  readonly detectedAt: string;
  readonly updatedAt: string;
  readonly confidence: number;
  readonly indicators: readonly ThreatIndicator[];
  readonly timeline: readonly ThreatTimelineEvent[];
}
export type ThreatSort = 'detectedAt' | 'severity' | 'status' | 'confidence';
export interface ThreatQuery {
  readonly search: string;
  readonly severities: readonly ThreatSeverity[];
  readonly statuses: readonly ThreatStatus[];
  readonly vectors: readonly ThreatVector[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly sortBy: ThreatSort;
  readonly sortDirection: 'asc' | 'desc';
  readonly page: number;
  readonly pageSize: 10 | 25 | 50;
}
export interface ThreatListResponse {
  readonly items: readonly Threat[];
  readonly total: number;
}
