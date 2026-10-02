import { Component } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
@Component({
  selector: 'app-audit',
  imports: [PageHeader, EmptyState],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit {}
