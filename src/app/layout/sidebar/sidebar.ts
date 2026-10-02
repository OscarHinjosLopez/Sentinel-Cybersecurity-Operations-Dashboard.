import { Component, input, output } from '@angular/core';
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
  protected readonly primary = PRIMARY_NAVIGATION;
  protected readonly secondary = SECONDARY_NAVIGATION;
}
