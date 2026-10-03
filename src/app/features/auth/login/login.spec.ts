import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthResult } from '../../../core/auth/auth.models';
import { AUTH_API } from '../../../core/auth/data-access/auth-api';
import { DEMO_PASSWORD } from '../../../core/auth/data-access/demo-accounts';
import { MockAuthApi, MOCK_AUTH_LATENCY } from '../../../core/auth/data-access/mock-auth-api';
import { SESSION_STORAGE_KEY } from '../../../core/auth/session-storage';
describe('Login', () => {
  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/devices' }) } },
        },
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
      ],
    });
    await TestBed.inject(AuthService).restoreSession();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });
  it('validates required fields and email syntax without making an auth request', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const login = vi.spyOn(TestBed.inject(AuthService), 'login');
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.email.touched).toBe(true);
    expect(fixture.componentInstance.form.controls.password.touched).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('#login-email')
        ?.getAttribute('aria-invalid'),
    ).toBe('true');
    fixture.componentInstance.form.setValue({ email: 'invalid', password: 'demo' });
    expect(fixture.componentInstance.form.controls.email.hasError('email')).toBe(true);
    expect(login).not.toHaveBeenCalled();
  });
  it('shows pending state and prevents duplicate submissions', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const response = new Subject<AuthResult>();
    const login = vi.spyOn(TestBed.inject(MockAuthApi), 'login').mockReturnValue(response);
    fixture.componentInstance.form.setValue({
      email: 'viewer@sentinel.dev',
      password: DEMO_PASSWORD,
    });
    const pending = fixture.componentInstance.submit();
    await Promise.resolve();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    expect(element.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(element.textContent).toContain('Signing in...');
    await fixture.componentInstance.submit();
    expect(login).toHaveBeenCalledOnce();
    response.next({ success: false, error: 'invalid-credentials' });
    await pending;
    await fixture.whenStable();
    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(false);
  });
  it('shows a generic credential error', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({ email: 'admin@sentinel.dev', password: 'wrong' });
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toBe('Invalid email or password.');
  });
  it('toggles password visibility with an accessible button', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('button[aria-label="Show password"]')?.click();
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#login-password')?.type).toBe('text');
    expect(
      element.querySelector('button[aria-label="Hide password"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });
  it('uses the validated return URL after a successful login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({
      email: 'admin@sentinel.dev',
      password: DEMO_PASSWORD,
    });
    await fixture.componentInstance.submit();
    expect(navigate).toHaveBeenCalledWith('/devices', { replaceUrl: true });
  });
});
