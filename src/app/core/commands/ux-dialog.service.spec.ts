import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { NotificationStore } from '../notifications/notification.store';
import { CommandRegistry } from './command-registry';
import { UxDialogService } from './ux-dialog.service';
import { CommandId } from './command.models';
describe('UX dialog lifecycle', () => {
  let service: UxDialogService;
  let authenticated: ReturnType<typeof signal<boolean>>;
  let opened: ReturnType<typeof signal<boolean>>;
  let execute: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  let closed: Subject<CommandId | undefined>;
  let help: Subject<void>;
  let active: unknown[];
  beforeEach(() => {
    authenticated = signal(true);
    opened = signal(false);
    execute = vi.fn();
    closed = new Subject();
    help = new Subject();
    active = [];
    open = vi.fn(() => {
      const ref = {
        afterClosed: () => closed,
        close: () => {
          active.splice(0);
          closed.next(undefined);
        },
      };
      active.push(ref);
      return ref;
    });
    TestBed.configureTestingModule({
      providers: [
        UxDialogService,
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        {
          provide: NotificationStore,
          useValue: { isOpen: opened, close: () => opened.set(false) },
        },
        { provide: CommandRegistry, useValue: { helpRequested: help, execute } },
        { provide: MatDialog, useValue: { open, openDialogs: active } },
      ],
    });
    service = TestBed.inject(UxDialogService);
    TestBed.tick();
  });
  it('opens one named, trapped palette with initial search focus and restore focus, then executes the result', async () => {
    await service.openPalette();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][1]).toMatchObject({
      ariaLabelledBy: 'palette-title',
      autoFocus: '#command-search',
      restoreFocus: true,
    });
    closed.next('threats');
    expect(execute).toHaveBeenCalledWith('threats');
  });
  it('toggling an open palette closes it and opening while logged out is ignored', async () => {
    await service.openPalette();
    await service.openPalette();
    expect(active).toEqual([]);
    authenticated.set(false);
    TestBed.tick();
    await service.openPalette();
    expect(open).toHaveBeenCalledTimes(1);
  });
  it('cancels a pending palette request when logout occurs during lazy loading', async () => {
    const request = service.openPalette();
    authenticated.set(false);
    TestBed.tick();
    await request;
    expect(open).not.toHaveBeenCalled();
  });
  it('does not open another palette on top of an existing dialog', async () => {
    active.push({});
    await service.openPalette();
    expect(open).not.toHaveBeenCalled();
  });
  it('opens shortcut help with an accessible name and focus restoration', async () => {
    await service.openHelp();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][1]).toMatchObject({
      ariaLabel: 'Keyboard shortcuts',
      restoreFocus: true,
    });
  });
});
