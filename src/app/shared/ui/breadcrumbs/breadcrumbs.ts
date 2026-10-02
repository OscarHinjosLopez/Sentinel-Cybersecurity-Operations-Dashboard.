import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../icon/icon';
export interface BreadcrumbItem {
  readonly label: string;
  readonly url: string;
}
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink, Icon],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
})
export class Breadcrumbs {
  private readonly router = inject(Router);
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );
  protected readonly items = computed(() => {
    this.navigation();
    const items: BreadcrumbItem[] = [];
    let route = this.router.routerState.snapshot.root;
    const segments: string[] = [];
    while (route.firstChild) {
      route = route.firstChild;
      segments.push(...route.url.map((segment) => segment.path));
      const label: unknown = route.data['breadcrumb'];
      if (typeof label === 'string') items.push({ label, url: '/' + segments.join('/') });
    }
    return items;
  });
}
