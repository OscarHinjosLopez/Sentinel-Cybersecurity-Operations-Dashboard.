import { Component } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-threats',
  imports: [PageHeader, EmptyState],
  templateUrl: './threats.html',
  styleUrl: './threats.scss',
})
export class Threats {}
