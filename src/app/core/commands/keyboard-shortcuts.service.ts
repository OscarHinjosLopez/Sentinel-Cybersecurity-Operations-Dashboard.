import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { CommandRegistry } from './command-registry';
import { UxDialogService } from './ux-dialog.service';
export function isEditableTarget(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.matches('input,textarea,select,[role="textbox"],[role="combobox"]') ||
          target.isContentEditable ||
          !!target.closest('[contenteditable]:not([contenteditable="false"])')),
    );
}
@Injectable()
export class KeyboardShortcutsService {
  private readonly document = inject(DOCUMENT);
  private readonly auth = inject(AuthService);
  private readonly registry = inject(CommandRegistry);
  private readonly dialogs = inject(UxDialogService);
  private prefixAt: number | null = null;
  constructor() {
    const listener = (event: KeyboardEvent) => this.handle(event);
    this.document.addEventListener('keydown', listener);
    inject(DestroyRef).onDestroy(() => this.document.removeEventListener('keydown', listener));
  }
  handle(event: KeyboardEvent): void {
    if (!this.auth.isAuthenticated() || event.defaultPrevented || event.isComposing || event.repeat)
      return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key === 'k') {
      event.preventDefault();
      this.prefixAt = null;
      this.dialogs.openPalette();
      return;
    }
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditableTarget(event) ||
      this.dialogs.hasOpenDialog()
    ) {
      this.prefixAt = null;
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      this.prefixAt = null;
      this.dialogs.openHelp();
      return;
    }
    const pending = this.prefixAt;
    this.prefixAt = null;
    if (pending !== null && Date.now() - pending <= 1000) {
      const id =
        key === 'd' ? 'dashboard' : key === 't' ? 'threats' : key === 'v' ? 'devices' : null;
      if (id && this.registry.canExecute(id)) {
        event.preventDefault();
        void this.registry.execute(id);
        return;
      }
    }
    if (key === 'g') {
      this.prefixAt = Date.now();
      event.preventDefault();
    }
  }
}
