import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';
@Component({
  selector: 'app-settings',
  imports: [PageHeader, MatSlideToggleModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  readonly preferences = inject(UserPreferencesService);
  theme(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'light' || value === 'dark') this.preferences.setTheme(value);
  }
  motion(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'system' || value === 'reduce' || value === 'full')
      this.preferences.update({ motion: value });
  }
  pageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (value === 10 || value === 25 || value === 50)
      this.preferences.update({ defaultPageSize: value });
  }
}
