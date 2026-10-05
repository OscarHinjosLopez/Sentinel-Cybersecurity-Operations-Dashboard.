import { DestroyRef, effect, inject, Injectable, Injector, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import type { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';
import { NotificationStore } from '../notifications/notification.store';
import type { CommandPalette } from '../../shared/ui/command-palette/command-palette';
import type { NotificationCenter } from '../../shared/ui/notification-center/notification-center';
import type { ShortcutHelp } from '../../shared/ui/shortcut-help/shortcut-help';
import { CommandRegistry } from './command-registry';
import { CommandId } from './command.models';
@Injectable()
export class UxDialogService {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly store = inject(NotificationStore);
  private readonly registry = inject(CommandRegistry);
  private readonly snack = inject(MatSnackBar);
  private dialogs?: MatDialog;
  private engine?: Promise<MatDialog>;
  private palette?: MatDialogRef<CommandPalette, CommandId>;
  private center?: MatDialogRef<NotificationCenter>;
  private help?: MatDialogRef<ShortcutHelp>;
  private palettePending = false;
  private centerPending = false;
  private helpPending = false;
  private destroyed = false;
  constructor() {
    effect(() => {
      const opened = this.store.isOpen(),
        authenticated = this.auth.isAuthenticated();
      untracked(() => {
        if (!authenticated) {
          this.palettePending = false;
          this.palette?.close();
          this.help?.close();
          this.center?.close();
        } else if (opened) void this.openCenter();
        else this.center?.close();
      });
    });
    this.registry.helpRequested.pipe(takeUntilDestroyed()).subscribe(() => void this.openHelp());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.palette?.close();
      this.help?.close();
      this.center?.close();
    });
  }
  private loadEngine(): Promise<MatDialog> {
    return (this.engine ??= import('@angular/material/dialog').then(
      ({ MatDialog }) => (this.dialogs = this.injector.get(MatDialog)),
    ));
  }
  private loadFailed(): void {
    this.engine = undefined;
    if (!this.destroyed && this.auth.isAuthenticated())
      this.snack.open('Unable to open this panel. Please try again.', 'Dismiss', {
        duration: 4000,
        politeness: 'polite',
      });
  }
  hasOpenDialog(): boolean {
    return (
      !!this.dialogs?.openDialogs.length ||
      !!this.document.querySelector('[role="dialog"], [role="alertdialog"]')
    );
  }
  private async openCenter(): Promise<void> {
    if (this.center || this.centerPending) return;
    this.centerPending = true;
    try {
      const [dialogs, { NotificationCenter }] = await Promise.all([
        this.loadEngine(),
        import('../../shared/ui/notification-center/notification-center'),
      ]);
      if (this.destroyed || !this.auth.isAuthenticated() || !this.store.isOpen()) return;
      if (dialogs.openDialogs.length) {
        this.store.close();
        return;
      }
      this.center = dialogs.open(NotificationCenter, {
        injector: this.injector,
        width: '480px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - var(--sentinel-notification-offset) - 24px)',
        position: { right: '12px', top: 'var(--sentinel-notification-offset)' },
        ariaLabelledBy: 'notification-title',
        autoFocus: 'button',
        restoreFocus: true,
        panelClass: 'notification-dialog',
      });
      this.center.afterClosed().subscribe(() => {
        this.center = undefined;
        this.store.close();
      });
    } catch {
      this.store.close();
      this.loadFailed();
    } finally {
      this.centerPending = false;
    }
  }
  async openPalette(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    if (this.palette) {
      this.palette.close();
      return;
    }
    if (this.palettePending) {
      this.palettePending = false;
      return;
    }
    this.palettePending = true;
    try {
      const [dialogs, { CommandPalette }] = await Promise.all([
        this.loadEngine(),
        import('../../shared/ui/command-palette/command-palette'),
      ]);
      if (
        this.destroyed ||
        !this.auth.isAuthenticated() ||
        !this.palettePending ||
        dialogs.openDialogs.length
      )
        return;
      this.palette = dialogs.open(CommandPalette, {
        injector: this.injector,
        width: '620px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 24px)',
        ariaLabelledBy: 'palette-title',
        autoFocus: '#command-search',
        restoreFocus: true,
      });
      this.palette.afterClosed().subscribe((id) => {
        this.palette = undefined;
        if (id) void this.registry.execute(id);
      });
    } catch {
      this.loadFailed();
    } finally {
      this.palettePending = false;
    }
  }
  async openHelp(): Promise<void> {
    if (!this.auth.isAuthenticated() || this.helpPending || this.hasOpenDialog()) return;
    this.helpPending = true;
    try {
      const [dialogs, { ShortcutHelp }] = await Promise.all([
        this.loadEngine(),
        import('../../shared/ui/shortcut-help/shortcut-help'),
      ]);
      if (this.destroyed || !this.auth.isAuthenticated() || dialogs.openDialogs.length) return;
      this.help = dialogs.open(ShortcutHelp, {
        injector: this.injector,
        width: '480px',
        maxWidth: 'calc(100vw - 24px)',
        ariaLabel: 'Keyboard shortcuts',
        autoFocus: 'button',
        restoreFocus: true,
      });
      this.help.afterClosed().subscribe(() => (this.help = undefined));
    } catch {
      this.loadFailed();
    } finally {
      this.helpPending = false;
    }
  }
}
