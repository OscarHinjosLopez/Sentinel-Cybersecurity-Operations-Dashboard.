import { Component } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-devices',
  imports: [PageHeader, EmptyState],
  templateUrl: './devices.html',
  styleUrl: './devices.scss',
})
export class Devices {}
