import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
describe('Foundation routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
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
  it.each([
    ['/dashboard', 'Security Overview'],
    ['/threats', 'Threats'],
    ['/devices', 'Devices'],
    ['/audit', 'Audit Log'],
    ['/settings', 'Settings'],
    ['/', 'Security Overview'],
    ['/unknown/path', 'Page not found'],
  ])('renders %s inside the shell', async (url, title) => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-header')).not.toBeNull();
    expect(element.querySelector('app-sidebar')).not.toBeNull();
    expect(element.querySelector('main h1')?.textContent).toBe(title);
    expect(router.url).toBe(url === '/' ? '/dashboard' : url);
    expect(element.querySelector('[aria-label="Breadcrumb"] [aria-current="page"]')).not.toBeNull();
    if (url !== '/unknown/path') {
      expect(
        element.querySelector('app-sidebar a[aria-current="page"]')?.getAttribute('href'),
      ).toBe(url === '/' ? '/dashboard' : url);
    }
  });
});
