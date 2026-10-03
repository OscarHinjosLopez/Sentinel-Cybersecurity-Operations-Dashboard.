import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../auth/auth.service';
import { AUTH_API } from '../auth/data-access/auth-api';
import { DEMO_PASSWORD } from '../auth/data-access/demo-accounts';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../auth/session-storage';
describe('Authentication and permission guards', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
            isMatched: () => false,
          },
        },
      ],
    });
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  it.each(['/dashboard', '/threats', '/devices'])(
    'redirects anonymous %s to login with a return URL',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      const tree = TestBed.inject(Router).parseUrl(TestBed.inject(Router).url);
      expect(tree.queryParams['returnUrl']).toBe(url);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(
        'Sign in to Sentinel',
      );
      expect(harness.routeNativeElement?.querySelector('app-shell')).toBeNull();
    },
  );
  it.each(['/dashboard', '/threats', '/devices', '/audit', '/settings'])(
    'allows an admin into %s',
    async (url) => {
      await TestBed.inject(AuthService).login({
        email: 'admin@sentinel.dev',
        password: DEMO_PASSWORD,
      });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(harness.routeNativeElement?.querySelector('app-sidebar')).not.toBeNull();
    },
  );
  it.each([
    { email: 'analyst@sentinel.dev', url: '/settings' },
    { email: 'viewer@sentinel.dev', url: '/settings' },
    { email: 'viewer@sentinel.dev', url: '/audit' },
  ])('denies $email direct access to $url', async ({ email, url }) => {
    await TestBed.inject(AuthService).login({ email, password: DEMO_PASSWORD });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe('/forbidden');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Access denied');
  });
  it('redirects authenticated login visits to dashboard', async () => {
    await TestBed.inject(AuthService).login({
      email: 'viewer@sentinel.dev',
      password: DEMO_PASSWORD,
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
  it('protects child navigation after logout even if the shell was already active', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login({ email: 'admin@sentinel.dev', password: DEMO_PASSWORD });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/devices');
    await auth.logout();
    await harness.navigateByUrl('/audit');
    expect(TestBed.inject(Router).url.startsWith('/login?')).toBe(true);
    expect(harness.routeNativeElement?.querySelector('app-sidebar')).toBeNull();
  });
});
