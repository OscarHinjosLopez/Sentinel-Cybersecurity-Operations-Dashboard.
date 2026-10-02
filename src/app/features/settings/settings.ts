import { Component } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-settings',
  imports: [PageHeader, EmptyState],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {}
