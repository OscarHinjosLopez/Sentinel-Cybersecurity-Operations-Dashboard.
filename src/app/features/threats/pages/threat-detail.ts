import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { SeverityBadge } from '../../../shared/ui/severity-badge/severity-badge';
import { StatusIndicator } from '../../../shared/ui/status-indicator/status-indicator';
import { ThreatDetailStore } from '../data-access/threat-detail.store';
import { ThreatStatus } from '../models/threat.models';
import { VECTOR_LABELS } from '../utils/threat-rules';
import { StatusConfirmation } from '../ui/status-confirmation';
@Component({
  selector: 'app-threat-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    PageHeader,
    Skeleton,
    EmptyState,
    SeverityBadge,
    StatusIndicator,
  ],
  providers: [ThreatDetailStore],
  templateUrl: './threat-detail.html',
  styleUrl: './threat-detail.scss',
})
export class ThreatDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly actionRegion = viewChild<ElementRef<HTMLElement>>('actionRegion');
  readonly store = inject(ThreatDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  readonly vectors = VECTOR_LABELS;
  readonly actionLabels: Record<ThreatStatus, string> = {
    open: 'Open',
    investigating: 'Start investigation',
    resolved: 'Resolve threat',
    'false-positive': 'Mark as false positive',
  };
  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.store.load(params.get('id') ?? ''));
  }
  act(status: ThreatStatus): void {
    if (this.store.isUpdating()) return;
    if (status === 'investigating') {
      this.mutate(status);
      return;
    }
    const id = this.store.data()?.id;
    if (!id) return;
    this.dialog
      .open(StatusConfirmation, {
        data: { id, status },
        width: '28rem',
        maxWidth: 'calc(100vw - 2rem)',
        autoFocus: 'button',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (confirmed && this.store.data()?.id === id) this.mutate(status);
      });
  }
  private mutate(status: ThreatStatus): void {
    this.store.updateStatus(status, () => {
      this.snackbar.open('Threat status updated locally.', 'Dismiss', { duration: 3500 });
      afterNextRender(() => this.actionRegion()?.nativeElement.focus(), {
        injector: this.injector,
      });
    });
  }
}
