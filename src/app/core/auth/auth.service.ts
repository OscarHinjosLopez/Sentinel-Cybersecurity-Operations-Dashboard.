import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResult, AuthSession, LoginCredentials, Permission, UserRole } from './auth.models';
import { AUTH_API } from './data-access/auth-api';
import { ROLE_PERMISSIONS } from './permissions';
import { SessionStorage } from './session-storage';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AUTH_API);
  private readonly storage = inject(SessionStorage);
  private readonly router = inject(Router);
  private readonly currentSession = signal<AuthSession | null>(null);
  private readonly ready = signal(false);
  private readonly phase = signal<'restoring' | 'idle' | 'login'>('restoring');
  private restorePromise: Promise<void> | undefined;
  private operation = 0;
  private logoutVersion = 0;
  readonly session = this.currentSession.asReadonly();
  readonly initialized = this.ready.asReadonly();
  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.initialized() && this.session() !== null);
  readonly isLoading = computed(() => this.phase() !== 'idle');
  restoreSession(): Promise<void> {
    if (this.initialized()) return Promise.resolve();
    if (this.restorePromise) return this.restorePromise;
    const operation = ++this.operation;
    this.restorePromise = this.restore(operation);
    return this.restorePromise;
  }
  private async restore(operation: number): Promise<void> {
    const token = this.storage.readToken();
    try {
      const result = token ? await firstValueFrom(this.api.restoreSession(token)) : null;
      if (operation !== this.operation) return;
      if (result?.success) this.currentSession.set(result.session);
      else {
        this.currentSession.set(null);
        this.storage.clear();
      }
    } catch {
      if (operation === this.operation) {
        this.currentSession.set(null);
        this.storage.clear();
      }
    } finally {
      if (operation === this.operation) {
        this.ready.set(true);
        this.phase.set('idle');
      }
    }
  }
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const logoutVersion = this.logoutVersion;
    await this.restoreSession();
    if (logoutVersion !== this.logoutVersion) return { success: false, error: 'cancelled' };
    if (this.phase() === 'login') return { success: false, error: 'busy' };
    const operation = ++this.operation;
    this.phase.set('login');
    this.currentSession.set(null);
    this.storage.clear();
    try {
      const result = await firstValueFrom(this.api.login(credentials));
      if (operation !== this.operation) return { success: false, error: 'cancelled' };
      if (result.success) {
        this.currentSession.set(result.session);
        this.storage.writeToken(result.session.accessToken);
      }
      return result;
    } catch {
      return { success: false, error: operation === this.operation ? 'unavailable' : 'cancelled' };
    } finally {
      if (operation === this.operation) this.phase.set('idle');
    }
  }
  async logout(): Promise<void> {
    ++this.logoutVersion;
    ++this.operation;
    this.currentSession.set(null);
    this.storage.clear();
    this.ready.set(true);
    this.phase.set('idle');
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  hasRole(role: UserRole): boolean {
    return this.isAuthenticated() && this.currentUser()?.role === role;
  }
  hasPermission(permission: Permission): boolean {
    const user = this.currentUser();
    return (
      this.isAuthenticated() && user !== null && ROLE_PERMISSIONS[user.role].includes(permission)
    );
  }
}
