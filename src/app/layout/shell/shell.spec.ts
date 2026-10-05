import { AuthService } from '../../core/auth/auth.service';
import { AUTH_API } from '../../core/auth/data-access/auth-api';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../../core/auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../../core/auth/session-storage';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { Shell } from './shell';
describe('Responsive shell', () => {
  let viewport: BehaviorSubject<BreakpointState>;
  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    viewport = new BehaviorSubject<BreakpointState>({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => viewport, isMatched: () => viewport.value.matches },
        },
      ],
    });
    await TestBed.inject(AuthService).login({
      email: 'admin@sentinel.dev',
      password: 'Sentinel123!',
    });
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  it('opens mobile navigation and closes it after route navigation', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    await fixture.whenStable();
    const shell = fixture.debugElement.query(By.directive(Shell)).componentInstance as Shell;
    const element = fixture.nativeElement as HTMLElement;
    const menu = element.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');
    expect(menu).not.toBeNull();
    expect(shell.drawerOpen()).toBe(false);
    menu?.click();
    await fixture.whenStable();
    expect(shell.drawerOpen()).toBe(true);
    expect(menu?.getAttribute('aria-expanded')).toBe('true');
    element.querySelector<HTMLAnchorElement>('app-sidebar a[href="/threats"]')?.click();
    await fixture.whenStable();
    expect(router.url).toBe('/threats');
    expect(shell.drawerOpen()).toBe(false);
    expect(element.querySelector('main h1')?.textContent).toBe('Threats');
  });

  it('closes mobile navigation when the current route is selected again', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/threats');
    await fixture.whenStable();
    const shell = fixture.debugElement.query(By.directive(Shell)).componentInstance as Shell;
    shell.drawerOpen.set(true);
    await fixture.whenStable();
    await router.navigateByUrl('/threats');
    await fixture.whenStable();
    expect(shell.drawerOpen()).toBe(false);
  });
  it('moves focus to main without reloading or changing the route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/devices');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const main = element.querySelector<HTMLElement>('main');
    if (!main) throw new Error('Main landmark missing');
    const focus = vi.spyOn(main, 'focus');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.querySelector('.skip-link')?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(router.url).toBe('/devices');
  });
  it('focuses the destination landmark after path changes but preserves focus during query updates', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/threats');
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('main')!;
    const focus = vi.spyOn(main, 'focus');
    await router.navigateByUrl('/threats?severity=critical');
    await fixture.whenStable();
    expect(focus).not.toHaveBeenCalled();
    await router.navigateByUrl('/devices');
    await fixture.whenStable();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('keeps a single navigation instance and resets drawer state on desktop', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    await fixture.whenStable();
    const shell = fixture.debugElement.query(By.directive(Shell)).componentInstance as Shell;
    shell.drawerOpen.set(true);
    await fixture.whenStable();
    viewport.next({ matches: false, breakpoints: {} });
    await fixture.whenStable();
    expect(shell.mobile()).toBe(false);
    expect(shell.drawerOpen()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-sidebar')).toHaveLength(1);
    viewport.next({ matches: true, breakpoints: {} });
    await fixture.whenStable();
    expect(shell.drawerOpen()).toBe(false);
  });
});
