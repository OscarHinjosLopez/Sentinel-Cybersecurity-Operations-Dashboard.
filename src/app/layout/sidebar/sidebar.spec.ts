import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AUTH_API } from '../../core/auth/data-access/auth-api';
import { DEMO_PASSWORD } from '../../core/auth/data-access/demo-accounts';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../../core/auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../../core/auth/session-storage';
import { Sidebar } from './sidebar';
describe('Authorized navigation', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
      ],
    });
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  it.each([
    { role: 'admin', paths: ['/dashboard', '/threats', '/devices', '/audit', '/settings'] },
    { role: 'analyst', paths: ['/dashboard', '/threats', '/devices', '/audit'] },
    { role: 'viewer', paths: ['/dashboard', '/threats', '/devices'] },
  ])('shows only allowed links for $role', async ({ role, paths }) => {
    await TestBed.inject(AuthService).login({
      email: role + '@sentinel.dev',
      password: DEMO_PASSWORD,
    });
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map(
      (a) => a.getAttribute('href'),
    );
    expect(links).toEqual(paths);
  });
});
