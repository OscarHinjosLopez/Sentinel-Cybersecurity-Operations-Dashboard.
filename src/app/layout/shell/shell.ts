import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, NavigationSkipped, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { NotificationStore } from '../../core/notifications/notification.store';
import { CommandRegistry } from '../../core/commands/command-registry';
import { UxDialogService } from '../../core/commands/ux-dialog.service';
import { KeyboardShortcutsService } from '../../core/commands/keyboard-shortcuts.service';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';
@Component({
  selector: 'app-shell',
  imports: [Header, Sidebar, RouterOutlet, MatSidenavModule],
  providers: [NotificationStore, CommandRegistry, UxDialogService, KeyboardShortcutsService],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly viewport = toSignal(this.breakpoints.observe('(max-width: 767px)'), {
    initialValue: { matches: this.breakpoints.isMatched('(max-width: 767px)'), breakpoints: {} },
  });
  readonly mobile = computed(() => this.viewport().matches);
  readonly drawerOpen = signal(false);
  skipToContent(event: Event, content: HTMLElement): void {
    event.preventDefault();
    content.focus();
  }
  constructor() {
    inject(UserPreferencesService);
    inject(KeyboardShortcutsService);
    effect(() => {
      if (!this.mobile()) this.drawerOpen.set(false);
    });
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationSkipped),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.drawerOpen.set(false));
  }
}
