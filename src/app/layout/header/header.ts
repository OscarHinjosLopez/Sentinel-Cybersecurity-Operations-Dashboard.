import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/ui/icon/icon';
import { Breadcrumbs } from '../../shared/ui/breadcrumbs/breadcrumbs';
@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatTooltipModule, MatMenuModule, Icon, Breadcrumbs],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly mobile = input(false);
  readonly navigationOpen = input(false);
  readonly menuRequested = output<void>();
  protected readonly theme = inject(ThemeService);
}
