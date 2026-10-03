import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ThreatDetail } from './threat-detail';
import { ThreatDetailStore } from '../data-access/threat-detail.store';
import { THREAT_REPOSITORY } from '../data-access/threat.repository';
import { createThreats } from '../data-access/threat.fixtures';
import { Threat } from '../models/threat.models';
describe('Threat details and mutation boundary', () => {
  let response: Subject<Threat | null>;
  let mutation: Subject<Threat>;
  let permitted: ReturnType<typeof signal<boolean>>;
  let update: ReturnType<typeof vi.fn>;
  const threat = createThreats(new Date('2026-10-03T12:00:00Z'))[0];
  beforeEach(() => {
    response = new Subject();
    mutation = new Subject();
    permitted = signal(true);
    update = vi.fn(() => mutation);
    TestBed.configureTestingModule({
      imports: [ThreatDetail],
      providers: [
        ThreatDetailStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: threat.id })) },
        },
        { provide: AuthService, useValue: { hasPermission: () => permitted() } },
        { provide: THREAT_REPOSITORY, useValue: { getById: () => response, updateStatus: update } },
      ],
    });
  });
  it('renders loading skeletons before data', () => {
    const fixture = TestBed.createComponent(ThreatDetail);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-skeleton')).toHaveLength(2);
  });
  it('renders overview, technical indicators and timeline after direct load', () => {
    const fixture = TestBed.createComponent(ThreatDetail);
    response.next(threat);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe(threat.title);
    expect(element.textContent).toContain(threat.id);
    expect(element.querySelectorAll('.indicators li')).toHaveLength(3);
    expect(element.querySelectorAll('.timeline li')).toHaveLength(2);
  });
  it('renders a retryable generic error', () => {
    const fixture = TestBed.createComponent(ThreatDetail);
    response.error(new Error('private'));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Unable to load threat details.');
    expect(element.querySelector('[role=alert]')).not.toBeNull();
  });
  it('shows not found without silent navigation', () => {
    const fixture = TestBed.createComponent(ThreatDetail);
    response.next(null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(
      'Threat not found',
    );
  });
  it('hides actions from a Viewer', () => {
    permitted.set(false);
    const fixture = TestBed.createComponent(ThreatDetail);
    response.next(threat);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Read-only access');
    expect(element.querySelector('.investigation .actions')).toBeNull();
  });
  it('denies Viewer calls to the mutation function', () => {
    permitted.set(false);
    const store = TestBed.inject(ThreatDetailStore);
    store.load(threat.id);
    response.next(threat);
    store.updateStatus('investigating');
    expect(update).not.toHaveBeenCalled();
    expect(store.actionError()).toContain('permission');
    expect(store.data()?.status).toBe('open');
  });
  it('rejects invalid transitions before invoking the repository', () => {
    const store = TestBed.inject(ThreatDetailStore);
    store.load(threat.id);
    response.next(threat);
    store.updateStatus('resolved');
    expect(update).not.toHaveBeenCalled();
    expect(store.actionError()).toBe('This status change is not available.');
  });
  it('prevents double submit and updates the detail after success', () => {
    const store = TestBed.inject(ThreatDetailStore);
    store.load(threat.id);
    response.next(threat);
    const success = vi.fn();
    store.updateStatus('investigating', success);
    store.updateStatus('investigating');
    expect(update).toHaveBeenCalledTimes(1);
    expect(store.isUpdating()).toBe(true);
    mutation.next({ ...threat, status: 'investigating' });
    expect(store.isUpdating()).toBe(false);
    expect(store.data()?.status).toBe('investigating');
    expect(success).toHaveBeenCalledTimes(1);
  });
  it('preserves data and permits retry after mutation failure', () => {
    const store = TestBed.inject(ThreatDetailStore);
    store.load(threat.id);
    response.next(threat);
    store.updateStatus('investigating');
    mutation.error(new Error('private'));
    expect(store.data()).toBe(threat);
    expect(store.isUpdating()).toBe(false);
    expect(store.actionError()).toContain('Unable to update');
  });
  it('cancels a mutation when navigating to another threat', () => {
    const store = TestBed.inject(ThreatDetailStore);
    store.load(threat.id);
    response.next(threat);
    store.updateStatus('investigating');
    store.load('THR-00002');
    expect(mutation.observed).toBe(false);
    mutation.next({ ...threat, status: 'investigating' });
    expect(store.data()).toBeNull();
  });
});
