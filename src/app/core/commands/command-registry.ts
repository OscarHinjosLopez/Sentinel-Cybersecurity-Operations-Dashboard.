import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PERMISSIONS } from '../auth/auth.models';
import { ThemeService } from '../services/theme.service';
import { NotificationStore } from '../notifications/notification.store';
import { Command, CommandId } from './command.models';
export const COMMANDS: readonly Command[] = [
  {
    id: 'dashboard',
    label: 'Go to Dashboard',
    description: 'Open the security overview',
    category: 'Navigation',
    keywords: ['overview', 'home', 'soc'],
    icon: 'dashboard',
    shortcut: 'G then D',
    permission: PERMISSIONS.DASHBOARD_VIEW,
    action: { kind: 'navigate', route: '/dashboard' },
  },
  {
    id: 'threats',
    label: 'Go to Threats',
    description: 'Review and investigate detections',
    category: 'Navigation',
    keywords: ['incidents', 'detections'],
    icon: 'threats',
    shortcut: 'G then T',
    permission: PERMISSIONS.THREATS_VIEW,
    action: { kind: 'navigate', route: '/threats' },
  },
  {
    id: 'devices',
    label: 'Go to Devices',
    description: 'Browse device inventory',
    category: 'Navigation',
    keywords: ['endpoints', 'inventory'],
    icon: 'devices',
    shortcut: 'G then V',
    permission: PERMISSIONS.DEVICES_VIEW,
    action: { kind: 'navigate', route: '/devices' },
  },
  {
    id: 'audit',
    label: 'Go to Audit',
    description: 'Open the existing audit workspace',
    category: 'Navigation',
    keywords: ['log', 'history'],
    icon: 'audit',
    permission: PERMISSIONS.AUDIT_VIEW,
    action: { kind: 'navigate', route: '/audit' },
  },
  {
    id: 'settings',
    label: 'Go to Settings',
    description: 'Manage local preferences',
    category: 'Navigation',
    keywords: ['preferences', 'appearance', 'density'],
    icon: 'settings',
    permission: PERMISSIONS.SETTINGS_VIEW,
    action: { kind: 'navigate', route: '/settings' },
  },
  {
    id: 'toggle-theme',
    label: 'Toggle theme',
    description: 'Switch between light and dark',
    category: 'Actions',
    keywords: ['appearance', 'light', 'dark'],
    icon: 'moon',
    action: { kind: 'toggle-theme' },
  },
  {
    id: 'notifications',
    label: 'Open notifications',
    description: 'Review recent security notifications',
    category: 'Actions',
    keywords: ['alerts', 'unread', 'center'],
    icon: 'bell',
    action: { kind: 'notifications' },
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    description: 'Show available keyboard shortcuts',
    category: 'Actions',
    keywords: ['help', 'keys', 'keyboard'],
    icon: 'help',
    shortcut: '?',
    action: { kind: 'shortcuts' },
  },
  {
    id: 'critical-threats',
    label: 'Open critical threats',
    description: 'Filter threats by critical severity',
    category: 'Actions',
    keywords: ['priority', 'critical', 'incidents'],
    icon: 'threats',
    permission: PERMISSIONS.THREATS_VIEW,
    action: { kind: 'navigate', route: '/threats', query: { severity: 'critical' } },
  },
  {
    id: 'clear-threat-filters',
    label: 'Clear threat filters',
    description: 'Return to the unfiltered threat list',
    category: 'Actions',
    keywords: ['reset', 'clear', 'threats'],
    icon: 'close',
    permission: PERMISSIONS.THREATS_VIEW,
    action: { kind: 'navigate', route: '/threats' },
  },
  {
    id: 'at-risk-devices',
    label: 'Show at-risk devices',
    description: 'Filter inventory by protection at risk',
    category: 'Actions',
    keywords: ['endpoints', 'protection', 'risk'],
    icon: 'devices',
    permission: PERMISSIONS.DEVICES_VIEW,
    action: { kind: 'navigate', route: '/devices', query: { protection: 'at-risk' } },
  },
];
@Injectable()
export class CommandRegistry {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly notifications = inject(NotificationStore);
  readonly helpRequested = new Subject<void>();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.helpRequested.complete());
  }
  readonly commands = computed(() =>
    this.auth.isAuthenticated()
      ? COMMANDS.filter(
          (command) => !command.permission || this.auth.hasPermission(command.permission),
        )
      : [],
  );
  search(query: string): readonly Command[] {
    const terms = query.toLowerCase().trim().slice(0, 200).split(/\s+/).filter(Boolean);
    return this.commands().filter((command) => {
      const text = [command.label, command.description, command.category, ...command.keywords]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }
  canExecute(id: CommandId): boolean {
    return this.commands().some((command) => command.id === id);
  }
  async execute(id: CommandId): Promise<boolean> {
    const command = this.commands().find((command) => command.id === id);
    if (!command) return false;
    switch (command.action.kind) {
      case 'navigate':
        return this.router.navigate([command.action.route], { queryParams: command.action.query });
      case 'toggle-theme':
        this.theme.toggle();
        return true;
      case 'notifications':
        this.notifications.open();
        return true;
      case 'shortcuts':
        this.helpRequested.next();
        return true;
    }
  }
}
