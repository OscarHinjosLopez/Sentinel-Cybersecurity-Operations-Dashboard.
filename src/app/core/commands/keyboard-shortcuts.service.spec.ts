import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { CommandRegistry } from './command-registry';
import { KeyboardShortcutsService } from './keyboard-shortcuts.service';
import { UxDialogService } from './ux-dialog.service';
describe('Keyboard shortcuts', () => {
  let service: KeyboardShortcutsService;
  let execute: ReturnType<typeof vi.fn>;
  let palette: ReturnType<typeof vi.fn>;
  let help: ReturnType<typeof vi.fn>;
  let authenticated: ReturnType<typeof signal<boolean>>;
  let modal: boolean;
  beforeEach(() => {
    authenticated = signal(true);
    modal = false;
    execute = vi.fn();
    palette = vi.fn();
    help = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        KeyboardShortcutsService,
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        { provide: CommandRegistry, useValue: { canExecute: () => true, execute } },
        {
          provide: UxDialogService,
          useValue: { openPalette: palette, openHelp: help, hasOpenDialog: () => modal },
        },
      ],
    });
    service = TestBed.inject(KeyboardShortcutsService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  function key(value: string, options: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: value,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    document.dispatchEvent(event);
    return event;
  }
  it.each(['d', 't', 'v'])('executes G then %s', (letter) => {
    key('g');
    const event = key(letter);
    expect(execute).toHaveBeenCalledWith(
      letter === 'd' ? 'dashboard' : letter === 't' ? 'threats' : 'devices',
    );
    expect(event.defaultPrevented).toBe(true);
  });
  it('supports Ctrl and Cmd K plus shortcut help', () => {
    key('k', { ctrlKey: true });
    key('K', { metaKey: true });
    expect(palette).toHaveBeenCalledTimes(2);
    key('?');
    expect(help).toHaveBeenCalledTimes(1);
  });
  it('expires a navigation sequence after one second and clears it after an unrelated key', () => {
    vi.useFakeTimers();
    key('g');
    vi.advanceTimersByTime(1001);
    key('d');
    key('g');
    key('x');
    key('t');
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(['input', 'textarea', 'select', 'div'])(
    'ignores typing within %s but permits Ctrl K',
    (tag) => {
      const element = document.createElement(tag);
      if (tag === 'div') element.setAttribute('contenteditable', 'true');
      document.body.append(element);
      try {
        for (const value of ['g', 'd', '?'])
          element.dispatchEvent(
            new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
          );
        expect(execute).not.toHaveBeenCalled();
        expect(help).not.toHaveBeenCalled();
        element.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
        expect(palette).toHaveBeenCalledTimes(1);
      } finally {
        element.remove();
      }
    },
  );
  it('does not handle composition, repeats, modified navigation, existing dialogs or unauthenticated sessions', () => {
    service.handle(new KeyboardEvent('keydown', { key: '?', isComposing: true }));
    key('?', { repeat: true });
    key('g', { ctrlKey: true });
    key('d');
    modal = true;
    key('?');
    key('g');
    key('t');
    authenticated.set(false);
    key('k', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
    expect(help).not.toHaveBeenCalled();
    expect(palette).not.toHaveBeenCalled();
  });
  it('clears a pending sequence when focus moves to an editable control', () => {
    key('g');
    const input = document.createElement('input');
    document.body.append(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
    input.remove();
    key('d');
    expect(execute).not.toHaveBeenCalled();
  });
  it('removes its single global key listener when destroyed', () => {
    TestBed.resetTestingModule();
    key('k', { ctrlKey: true });
    expect(palette).not.toHaveBeenCalled();
  });
});
