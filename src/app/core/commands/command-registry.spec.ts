import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.models';
import { ROLE_PERMISSIONS } from '../auth/permissions';
import { NotificationStore } from '../notifications/notification.store';
import { ThemeService } from '../services/theme.service';
import { CommandRegistry } from './command-registry';
describe('Command registry', () => {
  let registry: CommandRegistry;
  let role: ReturnType<typeof signal<UserRole>>;
  let authenticated: ReturnType<typeof signal<boolean>>;
  let navigate: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    role = signal('admin');
    authenticated = signal(true);
    navigate = vi.fn().mockResolvedValue(true);
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CommandRegistry,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated,
            hasPermission: (permission: (typeof ROLE_PERMISSIONS.admin)[number]) =>
              authenticated() && ROLE_PERMISSIONS[role()].includes(permission),
          },
        },
        { provide: Router, useValue: { navigate } },
        { provide: NotificationStore, useValue: { open } },
      ],
    });
    registry = TestBed.inject(CommandRegistry);
  });
  it.each(['admin', 'analyst', 'viewer'] as const)(
    'filters Audit and Settings for %s and rejects hidden command execution',
    async (current) => {
      role.set(current);
      expect(registry.canExecute('audit')).toBe(current !== 'viewer');
      expect(registry.canExecute('settings')).toBe(current === 'admin');
      if (current !== 'admin') expect(await registry.execute('settings')).toBe(false);
    },
  );
  it('searches case-insensitively by labels, keywords and category', () => {
    expect(registry.search('SOC').map((command) => command.id)).toContain('dashboard');
    expect(
      registry.search('NAVIGATION').every((command) => command.category === 'Navigation'),
    ).toBe(true);
    expect(registry.search('appearance dark').map((command) => command.id)).toEqual([
      'toggle-theme',
    ]);
    expect(registry.search('no such command')).toEqual([]);
  });
  it('shares navigation and query actions with quick actions', async () => {
    await registry.execute('critical-threats');
    expect(navigate).toHaveBeenCalledWith(['/threats'], { queryParams: { severity: 'critical' } });
    await registry.execute('at-risk-devices');
    expect(navigate).toHaveBeenLastCalledWith(['/devices'], {
      queryParams: { protection: 'at-risk' },
    });
  });
  it('uses existing theme and notification stores and emits shortcut help centrally', async () => {
    const theme = TestBed.inject(ThemeService);
    const before = theme.mode();
    await registry.execute('toggle-theme');
    expect(theme.mode()).not.toBe(before);
    await registry.execute('notifications');
    expect(open).toHaveBeenCalledTimes(1);
    const help = vi.fn();
    registry.helpRequested.subscribe(help);
    await registry.execute('shortcuts');
    expect(help).toHaveBeenCalledTimes(1);
  });
  it('rechecks permissions after role/session changes', async () => {
    expect(registry.canExecute('settings')).toBe(true);
    role.set('viewer');
    expect(await registry.execute('settings')).toBe(false);
    authenticated.set(false);
    expect(registry.commands()).toEqual([]);
    expect(await registry.execute('toggle-theme')).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
