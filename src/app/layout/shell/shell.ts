import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, NavigationSkipped, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
@Component({
  selector: 'app-shell',
  imports: [Header, Sidebar, RouterOutlet, MatSidenavModule],
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
