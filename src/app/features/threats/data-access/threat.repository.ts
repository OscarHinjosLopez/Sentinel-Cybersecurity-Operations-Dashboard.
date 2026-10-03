import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, timer, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import {
  Threat,
  ThreatId,
  ThreatListResponse,
  ThreatQuery,
  ThreatStatus,
} from '../models/threat.models';
import { canTransition, SEVERITIES, STATUSES } from '../utils/threat-rules';
import { createThreats } from './threat.fixtures';
export interface ThreatRepository {
  list(query: ThreatQuery): Observable<ThreatListResponse>;
  getById(id: ThreatId): Observable<Threat | null>;
  updateStatus(id: ThreatId, status: ThreatStatus): Observable<Threat>;
}
export const THREAT_REPOSITORY = new InjectionToken<ThreatRepository>('ThreatRepository');
export const THREAT_MOCK_CONFIG = new InjectionToken<{
  latency: number;
  scenario: 'success' | 'error' | 'empty';
}>('ThreatMockConfig', {
  providedIn: 'root',
  factory: () => ({ latency: 450, scenario: 'success' }),
});
@Injectable({ providedIn: 'root' })
export class MockThreatRepository implements ThreatRepository {
  private readonly config = inject(THREAT_MOCK_CONFIG);
  private readonly auth = inject(AuthService);
  private readonly records = this.config.scenario === 'empty' ? [] : createThreats();
  private delayed<T>(operation: () => T): Observable<T> {
    return timer(this.config.latency).pipe(
      map(() => {
        if (this.config.scenario === 'error') throw new Error('Mock service unavailable');
        return operation();
      }),
    );
  }
  list(query: ThreatQuery): Observable<ThreatListResponse> {
    return this.delayed(() => {
      const search = query.search.toLowerCase();
      const filtered = this.records.filter(
        (threat) =>
          (!search ||
            [threat.id, threat.title, threat.source, threat.target].some((value) =>
              value.toLowerCase().includes(search),
            )) &&
          (!query.severities.length || query.severities.includes(threat.severity)) &&
          (!query.statuses.length || query.statuses.includes(threat.status)) &&
          (!query.vectors.length || query.vectors.includes(threat.vector)) &&
          (!query.dateFrom || threat.detectedAt.slice(0, 10) >= query.dateFrom) &&
          (!query.dateTo || threat.detectedAt.slice(0, 10) <= query.dateTo),
      );
      filtered.sort((a, b) => {
        let compared: number;
        if (query.sortBy === 'severity')
          compared = SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity);
        else if (query.sortBy === 'status')
          compared = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
        else if (query.sortBy === 'confidence') compared = a.confidence - b.confidence;
        else compared = a.detectedAt.localeCompare(b.detectedAt);
        return (query.sortDirection === 'asc' ? compared : -compared) || a.id.localeCompare(b.id);
      });
      return {
        items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: filtered.length,
      };
    });
  }
  getById(id: ThreatId): Observable<Threat | null> {
    return this.delayed(() => this.records.find((threat) => threat.id === id) ?? null);
  }
  updateStatus(id: ThreatId, status: ThreatStatus): Observable<Threat> {
    return this.delayed(() => {
      if (!this.auth.hasPermission(PERMISSIONS.THREATS_INVESTIGATE))
        throw new Error('Not authorized');
      const index = this.records.findIndex((threat) => threat.id === id);
      const threat = this.records[index];
      if (!threat || !canTransition(threat.status, status)) throw new Error('Invalid transition');
      const timestamp = new Date().toISOString();
      const updated: Threat = {
        ...threat,
        status,
        updatedAt: timestamp,
        timeline: [
          ...threat.timeline,
          {
            timestamp,
            type: status === 'investigating' ? 'investigation' : 'status',
            label: status === 'investigating' ? 'Investigation started' : 'Status changed',
            description: `${threat.status} → ${status}`,
            actor: this.auth.currentUser()?.name,
          },
        ],
      };
      this.records[index] = updated;
      return updated;
    });
  }
}
