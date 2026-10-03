import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/auth.models';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvent } from '../realtime/realtime.models';
import { createdEvent, liveThreat, resolvedEvent } from '../realtime/realtime.test-fixtures';
import { PREFERENCES_KEY, UserPreferencesService } from '../preferences/user-preferences.service';
import { NotificationStore } from './notification.store';
import { Notification } from './notification.models';
import { notificationFromEvent } from './notification-rules';
const user: User = { id: 'user-1', name: 'Test user', email: 'test@example.test', role: 'admin' };
describe('Notification store and realtime rules', () => {
  let store: NotificationStore;
  let events: Subject<RealtimeEvent>;
  let authenticated: ReturnType<typeof signal<boolean>>;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let navigate: ReturnType<typeof vi.fn>;
  let permission: boolean;
  const notification = (id: string, time = 0): Notification => ({
    id,
    type: 'system',
    priority: 'normal',
    title: 'System update',
    message: 'Fictional update',
    createdAt: new Date(100000 + time).toISOString(),
    source: 'system',
  });
  beforeEach(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    events = new Subject();
    authenticated = signal(true);
    currentUser = signal(user);
    permission = true;
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        NotificationStore,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated,
            currentUser,
            hasPermission: () => authenticated() && permission,
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: RealtimeService,
          useValue: { events$: events, snapshot: () => ({ revision: 0, events: [] }) },
        },
      ],
    });
    store = TestBed.inject(NotificationStore);
    TestBed.tick();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(PREFERENCES_KEY);
  });
  it('adds unread records, deduplicates IDs and marks an individual record only once', () => {
    store.add(notification('a'));
    store.add(notification('a'));
    expect(store.notifications()).toHaveLength(1);
    expect(store.unreadCount()).toBe(1);
    store.markAsRead('a');
    const read = store.notifications()[0];
    store.markAsRead('a');
    expect(store.notifications()[0]).toBe(read);
    expect(store.hasUnread()).toBe(false);
  });
  it('marks all as read and clearRead preserves unread notifications', () => {
    store.add(notification('a'));
    store.add(notification('b'));
    store.markAllAsRead();
    expect(store.unreadCount()).toBe(0);
    store.add(notification('c'));
    store.clearRead();
    expect(store.notifications().map((item) => item.id)).toEqual(['c']);
    expect(store.unreadCount()).toBe(1);
  });
  it('orders by timestamp consistently and retains the latest one hundred', () => {
    for (let i = 0; i < 105; i++) store.add(notification(`item-${i}`, i));
    store.add(notification('very-old', -1));
    expect(store.notifications()).toHaveLength(100);
    expect(store.notifications()[0].id).toBe('item-104');
    expect(store.notifications().at(-1)?.id).toBe('item-5');
  });
  it('orders timestamps by their instant even when offsets differ', () => {
    store.add({ ...notification('earlier'), createdAt: '2026-10-03T15:00:00+02:00' });
    store.add({ ...notification('later'), createdAt: '2026-10-03T14:00:00Z' });
    expect(store.notifications().map((item) => item.id)).toEqual(['later', 'earlier']);
  });
  it('supports open, close, toggle and remove without regenerating removed duplicates', () => {
    store.open();
    expect(store.isOpen()).toBe(true);
    store.toggle();
    expect(store.isOpen()).toBe(false);
    store.toggle();
    store.close();
    store.add(notification('a'));
    store.remove('a');
    store.add(notification('a'));
    expect(store.notifications()).toEqual([]);
  });
  it('creates selective notifications and ignores repeated event IDs', () => {
    events.next(createdEvent());
    events.next(createdEvent());
    events.next(createdEvent('high', liveThreat('THR-22002', { severity: 'high' })));
    events.next(createdEvent('medium', liveThreat('THR-22003', { severity: 'medium' })));
    events.next(resolvedEvent());
    expect(store.notifications()).toHaveLength(2);
    expect(
      store
        .notifications()
        .map((item) => item.priority)
        .sort(),
    ).toEqual(['critical', 'high']);
  });
  it('disabling realtime notifications keeps the stream subscribed but creates no entries', () => {
    const preferences = TestBed.inject(UserPreferencesService);
    preferences.update({ realtimeNotifications: false });
    events.next(createdEvent());
    expect(store.notifications()).toEqual([]);
    expect(events.observed).toBe(true);
    preferences.update({ realtimeNotifications: true });
    events.next(createdEvent('after'));
    expect(store.unreadCount()).toBe(1);
  });
  it('clears private notification history and closes the center on logout or user change', () => {
    events.next(createdEvent());
    store.open();
    authenticated.set(false);
    TestBed.tick();
    expect(store.notifications()).toEqual([]);
    expect(store.isOpen()).toBe(false);
    events.next(createdEvent());
    expect(store.notifications()).toEqual([]);
    authenticated.set(true);
    currentUser.set({ ...user, id: 'another-user' });
    TestBed.tick();
    events.next(createdEvent());
    expect(store.notifications()).toHaveLength(1);
  });
  it('rechecks action permissions, marks read and navigates only to typed internal routes', async () => {
    const item = notificationFromEvent(createdEvent())!;
    store.add(item);
    store.open();
    permission = false;
    expect(await store.navigate(item.id)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(store.unreadCount()).toBe(1);
    permission = true;
    expect(await store.navigate(item.id)).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/', 'threats', 'THR-22001']);
    expect(store.unreadCount()).toBe(0);
    expect(store.isOpen()).toBe(false);
  });
  it('rejects malformed entity IDs and absent actions', async () => {
    store.add({
      ...notification('bad'),
      action: { kind: 'view-threat', entityId: 'https://example.test', label: 'View threat' },
    });
    expect(await store.navigate('bad')).toBe(false);
    expect(await store.navigate('missing')).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('maps offline/isolated devices and score priority without notifying ordinary online changes', () => {
    const base = {
      id: 'device',
      type: 'device.status.changed' as const,
      timestamp: new Date().toISOString(),
      payload: {
        deviceId: 'DEV-00142',
        previousStatus: 'online' as const,
        status: 'offline' as const,
      },
    };
    expect(notificationFromEvent(base)?.priority).toBe('normal');
    expect(
      notificationFromEvent({ ...base, payload: { ...base.payload, status: 'isolated' } })?.title,
    ).toBe('Device isolated');
    expect(
      notificationFromEvent({ ...base, payload: { ...base.payload, status: 'online' } }),
    ).toBeNull();
    for (const [score, priority] of [
      [40, 'high'],
      [60, 'normal'],
      [90, 'low'],
    ] as const)
      expect(
        notificationFromEvent({
          id: 'score',
          type: 'security.score.changed',
          timestamp: base.timestamp,
          payload: { score },
        })?.priority,
      ).toBe(priority);
  });
  it('unsubscribes the central integration on destruction', () => {
    TestBed.resetTestingModule();
    expect(events.observed).toBe(false);
  });
});
