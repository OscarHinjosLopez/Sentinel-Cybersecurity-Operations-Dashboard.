import { AuthService } from '../../core/auth/auth.service';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Icon } from '../../shared/ui/icon/icon';
import { PRIMARY_NAVIGATION, SECONDARY_NAVIGATION } from './navigation';
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatTooltipModule, MatButtonModule, Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly mobile = input(false);
  readonly closeRequested = output<void>();
  private readonly auth = inject(AuthService);
  protected readonly primary = computed(() =>
    PRIMARY_NAVIGATION.filter((item) => this.auth.hasPermission(item.permission)),
  );
  protected readonly secondary = computed(() =>
    SECONDARY_NAVIGATION.filter((item) => this.auth.hasPermission(item.permission)),
  );
}
