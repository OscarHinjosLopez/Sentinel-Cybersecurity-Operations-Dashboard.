import { ThreatSeverity, ThreatStatus, ThreatVector } from '../models/threat.models';
export const SEVERITIES: readonly ThreatSeverity[] = ['critical', 'high', 'medium', 'low'];
export const STATUSES: readonly ThreatStatus[] = [
  'open',
  'investigating',
  'resolved',
  'false-positive',
];
export const VECTORS: readonly ThreatVector[] = [
  'credential-attack',
  'malware',
  'phishing',
  'exploit',
  'network',
  'insider',
  'other',
];
export const STATUS_LABELS: Record<ThreatStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  'false-positive': 'False positive',
};
export const VECTOR_LABELS: Record<ThreatVector, string> = {
  'credential-attack': 'Credential attacks',
  malware: 'Malware',
  phishing: 'Phishing',
  exploit: 'Exploit',
  network: 'Network',
  insider: 'Insider',
  other: 'Other',
};
export const TRANSITIONS: Readonly<Record<ThreatStatus, readonly ThreatStatus[]>> = {
  open: ['investigating', 'false-positive'],
  investigating: ['resolved', 'false-positive'],
  resolved: [],
  'false-positive': [],
};
export function canTransition(from: ThreatStatus, to: ThreatStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
