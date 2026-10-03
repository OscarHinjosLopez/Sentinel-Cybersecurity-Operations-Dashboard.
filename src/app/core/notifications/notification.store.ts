import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PERMISSIONS } from '../auth/auth.models';
import { UserPreferencesService } from '../preferences/user-preferences.service';
import { RealtimeService } from '../realtime/realtime.service';
import { Notification, NotificationId } from './notification.models';
import { notificationFromEvent } from './notification-rules';
@Injectable()
export class NotificationStore {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly preferences = inject(UserPreferencesService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly records = signal<readonly Notification[]>([]);
  private readonly opened = signal(false);
  private readonly seen = new Set<string>();
  private owner: string | null = this.auth.currentUser()?.id ?? null;
  readonly notifications = this.records.asReadonly();
  readonly isOpen = this.opened.asReadonly();
  readonly unreadCount = computed(() => this.records().filter((item) => !item.readAt).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);
  constructor() {
    effect(() => {
      const owner = this.auth.currentUser()?.id ?? null;
      const authenticated = this.auth.isAuthenticated();
      untracked(() => {
        if (owner !== this.owner || !authenticated) {
          this.owner = owner;
          this.records.set([]);
          this.seen.clear();
          this.close();
        }
      });
    });
    this.realtime?.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!this.auth.isAuthenticated() || !this.preferences.realtimeNotifications()) return;
      const notification = notificationFromEvent(event);
      if (notification) this.add(notification);
    });
    if (this.auth.isAuthenticated() && this.preferences.realtimeNotifications()) {
      for (const event of this.realtime?.snapshot().events ?? []) {
        const notification = notificationFromEvent(event);
        if (notification) this.add(notification);
      }
    }
  }
  add(notification: Notification): void {
    if (!this.auth.isAuthenticated() || this.seen.has(notification.id)) return;
    this.seen.add(notification.id);
    while (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value!);
    this.records.update((records) =>
      [notification, ...records]
        .sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id),
        )
        .slice(0, 100),
    );
  }
  markAsRead(id: NotificationId): void {
    this.records.update((records) =>
      records.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
  }
  markAllAsRead(): void {
    const readAt = new Date().toISOString();
    this.records.update((records) =>
      records.map((item) => (item.readAt ? item : { ...item, readAt })),
    );
  }
  remove(id: NotificationId): void {
    this.records.update((records) => records.filter((item) => item.id !== id));
  }
  clearRead(): void {
    this.records.update((records) => records.filter((item) => !item.readAt));
  }
  open(): void {
    if (this.auth.isAuthenticated()) this.opened.set(true);
  }
  close(): void {
    this.opened.set(false);
  }
  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }
  canNavigate(notification: Notification): boolean {
    return (
      !!notification.action &&
      this.auth.hasPermission(
        notification.action.kind === 'view-threat'
          ? PERMISSIONS.THREATS_VIEW
          : PERMISSIONS.DEVICES_VIEW,
      )
    );
  }
  async navigate(id: NotificationId): Promise<boolean> {
    const item = this.records().find((item) => item.id === id);
    if (!item || !this.canNavigate(item) || !item.action) return false;
    const prefix = item.action.kind === 'view-threat' ? 'threats' : 'devices';
    const pattern = item.action.kind === 'view-threat' ? /^THR-\d{5}$/ : /^DEV-\d{5}$/;
    if (!pattern.test(item.action.entityId)) return false;
    this.markAsRead(id);
    this.close();
    return this.router.navigate(['/', prefix, item.action.entityId]);
  }
}
