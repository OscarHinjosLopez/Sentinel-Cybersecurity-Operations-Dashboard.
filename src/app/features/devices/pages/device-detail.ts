import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { StatusIndicator } from '../../../shared/ui/status-indicator/status-indicator';
import { SeverityBadge } from '../../../shared/ui/severity-badge/severity-badge';
import { DeviceConfirmation } from '../ui/device-confirmation';
import { DeviceDetailStore } from '../data-access/device-detail.store';
import { DeviceAction } from '../models/device.models';
import { ACTION_LABELS, OS_LABELS, PROTECTION_LABELS } from '../utils/device-rules';
@Component({
  selector: 'app-device-detail',
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink,
    MatButtonModule,
    PageHeader,
    EmptyState,
    Skeleton,
    StatusIndicator,
    SeverityBadge,
  ],
  providers: [DeviceDetailStore],
  templateUrl: './device-detail.html',
  styleUrl: './device-detail.scss',
})
export class DeviceDetail {
  readonly store = inject(DeviceDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly actionRegion = viewChild<ElementRef<HTMLElement>>('actionRegion');
  readonly osLabels = OS_LABELS;
  readonly protections = PROTECTION_LABELS;
  readonly labels = ACTION_LABELS;
  readonly softwareSearch = signal('');
  readonly software = computed(() => {
    const text = this.softwareSearch().toLowerCase();
    return (
      this.store
        .data()
        ?.installedSoftware.filter(
          (item) =>
            !text || `${item.name} ${item.publisher} ${item.version}`.toLowerCase().includes(text),
        ) ?? []
    );
  });
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.softwareSearch.set('');
      this.store.load(params.get('id') ?? '');
    });
  }
  searchSoftware(event: Event): void {
    this.softwareSearch.set((event.target as HTMLInputElement).value);
  }
  act(action: DeviceAction): void {
    if (this.store.isUpdating()) return;
    if (action === 'scan') {
      this.mutate(action);
      return;
    }
    const device = this.store.data();
    if (!device) return;
    this.dialog
      .open(DeviceConfirmation, {
        data: { hostname: device.hostname, action },
        width: '28rem',
        maxWidth: 'calc(100vw - 2rem)',
        autoFocus: 'button',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (confirmed && this.store.data()?.id === device.id) this.mutate(action);
      });
  }
  private mutate(action: DeviceAction): void {
    this.store.perform(action, () => {
      this.snackbar.open(
        action === 'scan' ? 'Mock security scan completed.' : 'Device status updated locally.',
        'Dismiss',
        { duration: 3500 },
      );
      afterNextRender(() => this.actionRegion()?.nativeElement.focus(), {
        injector: this.injector,
      });
    });
  }
}
