import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, Subject, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthResult, PERMISSIONS, USER_ROLES } from './auth.models';
import { AUTH_API } from './data-access/auth-api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './data-access/demo-accounts';
import { MockAuthApi, MOCK_AUTH_LATENCY } from './data-access/mock-auth-api';
import { SessionStorage, SESSION_STORAGE_KEY } from './session-storage';
describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });
  it.each(DEMO_ACCOUNTS)(
    'signs in the $role demo account and persists only its token',
    async (user) => {
      const auth = TestBed.inject(AuthService);
      const result = await auth.login({ email: user.email, password: DEMO_PASSWORD });
      expect(result.success).toBe(true);
      expect(auth.currentUser()).toEqual(user);
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.isLoading()).toBe(false);
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(auth.session()?.accessToken);
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    },
  );
  it('rejects incorrect credentials without revealing which field failed', async () => {
    const auth = TestBed.inject(AuthService);
    const result = await auth.login({ email: 'admin@sentinel.dev', password: 'wrong' });
    expect(result).toEqual({ success: false, error: 'invalid-credentials' });
    expect(auth.session()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
  it('restores a session once and reconstructs the user from the mock API', async () => {
    const api = TestBed.inject(MockAuthApi);
    const result = await firstValueFrom(
      api.login({ email: 'analyst@sentinel.dev', password: DEMO_PASSWORD }),
    );
    if (!result.success) throw new Error('Demo login failed');
    TestBed.inject(SessionStorage).writeToken(result.session.accessToken);
    const restore = vi.spyOn(api, 'restoreSession');
    const auth = TestBed.inject(AuthService);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.isLoading()).toBe(true);
    await Promise.all([auth.restoreSession(), auth.restoreSession()]);
    expect(restore).toHaveBeenCalledOnce();
    expect(auth.currentUser()?.role).toBe(USER_ROLES.ANALYST);
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('discards an invalid stored token and initializes anonymously', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'invalid');
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    expect(auth.initialized()).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
  it('clears state and storage before redirecting on logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login({ email: 'admin@sentinel.dev', password: DEMO_PASSWORD });
    await auth.logout();
    expect(auth.currentUser()).toBeNull();
    expect(auth.session()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/login', {
      replaceUrl: true,
    });
  });
  it.each([
    { email: 'admin@sentinel.dev', allowed: Object.values(PERMISSIONS) },
    {
      email: 'analyst@sentinel.dev',
      allowed: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.THREATS_VIEW,
        PERMISSIONS.THREATS_INVESTIGATE,
        PERMISSIONS.DEVICES_VIEW,
        PERMISSIONS.AUDIT_VIEW,
      ],
    },
    {
      email: 'viewer@sentinel.dev',
      allowed: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.THREATS_VIEW, PERMISSIONS.DEVICES_VIEW],
    },
  ])('checks the complete permission matrix for $email', async ({ email, allowed }) => {
    const auth = TestBed.inject(AuthService);
    await auth.login({ email, password: DEMO_PASSWORD });
    for (const permission of Object.values(PERMISSIONS))
      expect(auth.hasPermission(permission)).toBe(allowed.includes(permission));
    expect(auth.hasRole(auth.currentUser()?.role ?? USER_ROLES.VIEWER)).toBe(true);
  });
  it('denies all permissions and roles when anonymous', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    expect(auth.hasPermission(PERMISSIONS.DASHBOARD_VIEW)).toBe(false);
    expect(auth.hasRole(USER_ROLES.ADMIN)).toBe(false);
  });
  it('prevents duplicate login requests and exposes pending state', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    const response = new Subject<AuthResult>();
    const login = vi.spyOn(TestBed.inject(MockAuthApi), 'login').mockReturnValue(response);
    const credentials = { email: 'admin@sentinel.dev', password: DEMO_PASSWORD };
    const pending = auth.login(credentials);
    await Promise.resolve();
    expect(auth.isLoading()).toBe(true);
    expect(await auth.login(credentials)).toEqual({ success: false, error: 'busy' });
    expect(login).toHaveBeenCalledOnce();
    response.next({ success: false, error: 'invalid-credentials' });
    await pending;
    expect(auth.isLoading()).toBe(false);
  });
  it('ignores a late successful login after logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    const response = new Subject<AuthResult>();
    vi.spyOn(TestBed.inject(MockAuthApi), 'login').mockReturnValue(response);
    const pending = auth.login({ email: 'admin@sentinel.dev', password: DEMO_PASSWORD });
    await Promise.resolve();
    await auth.logout();
    const user = DEMO_ACCOUNTS[0];
    if (!user) throw new Error('Missing demo account');
    response.next({ success: true, session: { user, accessToken: 'late-demo-token' } });
    expect(await pending).toEqual({ success: false, error: 'cancelled' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
  it('does not start a deferred login after an immediate logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    const login = vi.spyOn(TestBed.inject(MockAuthApi), 'login');
    const pending = auth.login({ email: 'admin@sentinel.dev', password: DEMO_PASSWORD });
    await auth.logout();
    expect(await pending).toEqual({ success: false, error: 'cancelled' });
    expect(login).not.toHaveBeenCalled();
  });
  it('initializes anonymously if session restoration fails', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'unavailable');
    vi.spyOn(TestBed.inject(MockAuthApi), 'restoreSession').mockReturnValue(
      throwError(() => new Error('Unavailable')),
    );
    const auth = TestBed.inject(AuthService);
    await auth.restoreSession();
    expect(auth.initialized()).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.isLoading()).toBe(false);
  });
  it('can sign in and out even when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    const auth = TestBed.inject(AuthService);
    expect(
      (await auth.login({ email: 'viewer@sentinel.dev', password: DEMO_PASSWORD })).success,
    ).toBe(true);
    await auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
  });
});
