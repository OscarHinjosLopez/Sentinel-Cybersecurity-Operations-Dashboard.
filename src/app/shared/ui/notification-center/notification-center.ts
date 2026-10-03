import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NotificationStore } from '../../../core/notifications/notification.store';
import { NotificationType } from '../../../core/notifications/notification.models';
import { Icon, IconName } from '../icon/icon';
import { EmptyState } from '../empty-state/empty-state';
@Component({
  selector: 'app-notification-center',
  imports: [MatDialogModule, MatButtonModule, Icon, EmptyState, DatePipe, TitleCasePipe],
  template: `<div class="heading">
      <h2 mat-dialog-title id="notification-title">Notification Center</h2>
      <button matIconButton aria-label="Close notifications" (click)="store.close()">
        <app-icon name="close" />
      </button>
    </div>
    <mat-dialog-content
      ><div class="toolbar">
        <span>{{ store.unreadCount() }} unread</span
        ><button mat-button [disabled]="!store.hasUnread()" (click)="store.markAllAsRead()">
          Mark all as read</button
        ><button mat-button [disabled]="!hasRead()" (click)="store.clearRead()">Clear read</button>
      </div>
      @if (!store.notifications().length) {
        <app-empty-state
          icon="bell"
          title="You're all caught up"
          description="No new security notifications."
        />
      } @else {
        <ul>
          @for (item of store.notifications(); track item.id) {
            <li [class.unread]="!item.readAt">
              <div class="item-heading">
                <app-icon [name]="icons[item.type]" /><strong>{{ item.title }}</strong
                ><button
                  matIconButton
                  [attr.aria-label]="'Remove notification: ' + item.title"
                  (click)="store.remove(item.id)"
                >
                  <app-icon name="close" />
                </button>
              </div>
              <p>{{ item.message }}</p>
              <div class="metadata">
                <span>{{ item.type | titlecase }} · {{ item.priority | titlecase }}</span
                ><span class="read-state">{{ item.readAt ? 'Read' : 'Unread' }}</span
                ><time [attr.datetime]="item.createdAt" [title]="item.createdAt | date: 'medium'">{{
                  relative(item.createdAt)
                }}</time>
              </div>
              <div class="item-actions">
                @if (item.action && store.canNavigate(item)) {
                  <button mat-button (click)="navigate(item.id)">{{ item.action.label }}</button>
                }
                @if (!item.readAt) {
                  <button
                    mat-button
                    [attr.aria-label]="'Mark as read: ' + item.title"
                    (click)="store.markAsRead(item.id)"
                  >
                    Mark as read
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>`,
  styleUrl: './notification-center.scss',
})
export class NotificationCenter {
  readonly store = inject(NotificationStore);
  readonly now = signal(Date.now());
  readonly icons: Record<NotificationType, IconName> = {
    threat: 'threats',
    device: 'devices',
    system: 'help',
    security: 'shield',
  };
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 30000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  hasRead(): boolean {
    return this.store.notifications().some((item) => !!item.readAt);
  }
  relative(timestamp: string): string {
    const seconds = Math.max(0, Math.floor((this.now() - Date.parse(timestamp)) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  navigate(id: string): void {
    void this.store.navigate(id);
  }
}
