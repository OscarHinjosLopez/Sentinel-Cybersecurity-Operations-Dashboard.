import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AUTH_API } from '../auth/data-access/auth-api';
import { DEMO_PASSWORD } from '../auth/data-access/demo-accounts';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../auth/session-storage';
import { authInterceptor } from './auth.interceptor';
describe('Auth interceptor API boundary', () => {
  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
      ],
    });
    await TestBed.inject(AuthService).login({
      email: 'admin@sentinel.dev',
      password: DEMO_PASSWORD,
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });
  it.each(['/api', '/api/devices', '/api/audit?limit=10'])(
    'attaches the token to internal %s',
    (url) => {
      TestBed.inject(HttpClient).get(url).subscribe();
      const request = TestBed.inject(HttpTestingController).expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe(
        'Bearer ' + TestBed.inject(AuthService).session()?.accessToken,
      );
      request.flush({});
    },
  );
  it('allows same-origin absolute API URLs', () => {
    const url = document.location.origin + '/api/devices';
    TestBed.inject(HttpClient).get(url).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(true);
    request.flush({});
  });
  it.each([
    '/assets/icon.svg',
    '/apiculture',
    '/api-public/devices',
    'https://external.example/api/devices',
    '//external.example/api/devices',
    '/api/../public',
  ])('does not leak a token to %s', (url) => {
    TestBed.inject(HttpClient).get(url).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
  it('does not attach Authorization without a session', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await TestBed.inject(AuthService).logout();
    TestBed.inject(HttpClient).get('/api/devices').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/devices');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
