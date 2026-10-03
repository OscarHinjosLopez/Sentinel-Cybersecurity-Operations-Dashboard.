import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
export const SESSION_STORAGE_KEY = 'sentinel-session';
@Injectable({ providedIn: 'root' })
export class SessionStorage {
  private readonly document = inject(DOCUMENT);
  readToken(): string | null {
    try {
      const token = this.document.defaultView?.sessionStorage.getItem(SESSION_STORAGE_KEY);
      return token && token.length <= 2048 && !/[\r\n]/.test(token) ? token : null;
    } catch {
      return null;
    }
  }
  writeToken(token: string): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch {
      /* Session remains in memory if storage is blocked. */
    }
  }
  clear(): void {
    try {
      this.document.defaultView?.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* Logout still clears in-memory state. */
    }
  }
}
