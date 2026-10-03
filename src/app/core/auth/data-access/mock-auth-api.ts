import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timer } from 'rxjs';
import { AuthResult, LoginCredentials, User } from '../auth.models';
import { AuthApi } from './auth-api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo-accounts';
export const MOCK_AUTH_LATENCY = new InjectionToken<number>('MOCK_AUTH_LATENCY', {
  providedIn: 'root',
  factory: () => 350,
});
@Injectable({ providedIn: 'root' })
export class MockAuthApi implements AuthApi {
  private readonly latency = inject(MOCK_AUTH_LATENCY);
  login(credentials: LoginCredentials): Observable<AuthResult> {
    return timer(this.latency).pipe(
      map(() => {
        const user = DEMO_ACCOUNTS.find(
          (account) => account.email === credentials.email.trim().toLowerCase(),
        );
        return user && credentials.password === DEMO_PASSWORD
          ? this.result(user)
          : { success: false, error: 'invalid-credentials' };
      }),
    );
  }
  restoreSession(accessToken: string): Observable<AuthResult> {
    return timer(this.latency).pipe(
      map(() => {
        const user = DEMO_ACCOUNTS.find((account) => this.token(account) === accessToken);
        return user ? this.result(user) : { success: false, error: 'invalid-session' };
      }),
    );
  }
  private token(user: User): string {
    return 'sentinel-demo-token-' + user.id;
  }
  private result(user: User): AuthResult {
    return { success: true, session: { user: { ...user }, accessToken: this.token(user) } };
  }
}
