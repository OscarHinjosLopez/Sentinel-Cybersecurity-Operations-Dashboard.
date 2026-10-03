import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthResult, LoginCredentials } from '../auth.models';
// Replace this provider with a REST implementation when the backend exists.
export interface AuthApi {
  login(credentials: LoginCredentials): Observable<AuthResult>;
  restoreSession(accessToken: string): Observable<AuthResult>;
}
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
