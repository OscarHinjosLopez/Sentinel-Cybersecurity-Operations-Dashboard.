import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CommandRegistry } from '../../../core/commands/command-registry';
import { CommandId } from '../../../core/commands/command.models';
@Component({
  selector: 'app-quick-actions',
  imports: [MatButtonModule],
  template: `@if (registry) {
    <nav aria-label="Quick actions">
      @for (id of commands(); track id) {
        @if (registry.canExecute(id)) {
          <button mat-button (click)="execute(id)">{{ label(id) }}</button>
        }
      }
    </nav>
  }`,
  styles: `
    :host {
      display: block;
      margin-bottom: 1rem;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
  `,
})
export class QuickActions {
  readonly registry = inject(CommandRegistry, { optional: true });
  readonly commands = input.required<readonly CommandId[]>();
  label(id: CommandId): string {
    return id === 'threats'
      ? 'View threats'
      : id === 'devices'
        ? 'View devices'
        : (this.registry?.commands().find((command) => command.id === id)?.label ?? '');
  }
  execute(id: CommandId): void {
    void this.registry?.execute(id);
  }
}
