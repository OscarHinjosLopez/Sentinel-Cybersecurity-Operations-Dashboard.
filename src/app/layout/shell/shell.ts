import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
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
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('mainContent');
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private routePath = this.router.url.split(/[?#]/)[0];
  private focusAfterDrawer = false;
  restoreRouteFocus(): void {
    if (!this.focusAfterDrawer) return;
    this.focusAfterDrawer = false;
    this.focusContent();
  }
  private focusContent(): void {
    const content = this.content().nativeElement;
    content.scrollTop = 0;
    content.focus({ preventScroll: true });
  }
  skipToContent(event: Event, content: HTMLElement): void {
    event.preventDefault();
    content.focus();
  }
  constructor() {
    inject(UserPreferencesService);
    inject(KeyboardShortcutsService);
    afterNextRender(() => this.focusContent());
    effect(() => {
      if (!this.mobile()) this.drawerOpen.set(false);
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationSkipped),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // Filter and pagination query changes must keep focus on the active control.
          const path = event.urlAfterRedirects.split(/[?#]/)[0];
          if (path !== this.routePath) {
            this.routePath = path;
            this.focusAfterDrawer = this.mobile() && this.drawerOpen();
            afterNextRender(
              () => {
                if (!this.focusAfterDrawer) this.focusContent();
              },
              { injector: this.injector },
            );
          }
        }
        this.drawerOpen.set(false);
      });
  }
}
