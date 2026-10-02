import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
describe('Foundation routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] });
  });
  it.each([
    ['/dashboard', 'Dashboard'],
    ['/threats', 'Threats'],
    ['/devices', 'Devices'],
    ['/audit', 'Audit'],
    ['/settings', 'Settings'],
    ['/', 'Dashboard'],
    ['/unknown/path', 'Dashboard'],
  ])('renders %s inside the shell', async (url, title) => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-header')).not.toBeNull();
    expect(element.querySelector('app-sidebar')).not.toBeNull();
    expect(element.querySelector('main h1')?.textContent).toBe(title);
    expect(router.url).toBe(url === '/' || url === '/unknown/path' ? '/dashboard' : url);
  });
});
