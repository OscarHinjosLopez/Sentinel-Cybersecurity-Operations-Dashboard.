import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/auth/auth.models';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/ui/icon/icon';
import { Breadcrumbs } from '../../shared/ui/breadcrumbs/breadcrumbs';
import { RealtimeStatus } from '../../shared/ui/realtime-status/realtime-status';
import { MatBadgeModule } from '@angular/material/badge';
import { NotificationStore } from '../../core/notifications/notification.store';
import { UxDialogService } from '../../core/commands/ux-dialog.service';
@Component({
  selector: 'app-header',
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    Icon,
    Breadcrumbs,
    RealtimeStatus,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly notifications = inject(NotificationStore, { optional: true });
  readonly dialogs = inject(UxDialogService, { optional: true });
  readonly mobile = input(false);
  readonly navigationOpen = input(false);
  readonly menuRequested = output<void>();
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  protected readonly roleLabel = computed(() => {
    const user = this.auth.currentUser();
    return user ? ROLE_LABELS[user.role] : '';
  });
  protected readonly initials = computed(() =>
    (this.auth.currentUser()?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join(''),
  );
}
