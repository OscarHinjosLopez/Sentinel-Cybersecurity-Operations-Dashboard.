import { Component, computed, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { CommandRegistry } from '../../../core/commands/command-registry';
import { CommandId } from '../../../core/commands/command.models';
import { Icon } from '../icon/icon';
@Component({
  selector: 'app-command-palette',
  imports: [MatDialogModule, MatButtonModule, Icon],
  template: `<div class="heading">
      <h2 mat-dialog-title id="palette-title">Command Palette</h2>
      <button matIconButton aria-label="Close command palette" mat-dialog-close>
        <app-icon name="close" />
      </button>
    </div>
    <mat-dialog-content
      ><label class="sr-only" for="command-search">Search commands</label
      ><input
        id="command-search"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="command-list"
        [attr.aria-expanded]="results().length > 0"
        [attr.aria-activedescendant]="
          active() >= 0 && results()[active()] ? 'command-' + results()[active()].id : null
        "
        placeholder="Search commands..."
        maxlength="200"
        [value]="query()"
        (input)="search($event)"
        (keydown)="keydown($event)"
      />
      <div id="command-list" role="listbox" aria-label="Available commands">
        @for (command of results(); track command.id; let index = $index) {
          <button
            type="button"
            role="option"
            [id]="'command-' + command.id"
            [attr.aria-selected]="active() === index"
            (focus)="active.set(index)"
            (keydown)="optionKey($event, index)"
            (click)="choose(command.id)"
          >
            <app-icon [name]="command.icon" /><span
              ><small>{{ command.category }}</small
              ><strong>{{ command.label }}</strong
              ><span class="description">{{ command.description }}</span></span
            >
            @if (command.shortcut) {
              <kbd>{{ command.shortcut }}</kbd>
            }
          </button>
        }
      </div>
      @if (!results().length) {
        <p class="empty" role="status">No commands match your search.</p>
      }</mat-dialog-content
    ><mat-dialog-actions
      ><span>↑ ↓ to move · Enter to select · Esc to close</span></mat-dialog-actions
    >`,
  styleUrl: './command-palette.scss',
})
export class CommandPalette {
  private readonly document = inject(DOCUMENT);
  private readonly registry = inject(CommandRegistry);
  private readonly dialog = inject<MatDialogRef<CommandPalette, CommandId>>(MatDialogRef);
  readonly query = signal('');
  readonly active = signal(-1);
  readonly results = computed(() => this.registry.search(this.query()));
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.active.set(-1);
  }
  choose(id: CommandId): void {
    if (this.registry.canExecute(id)) this.dialog.close(id);
  }
  keydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && this.results().length) {
      event.preventDefault();
      this.choose(
        this.results()[Math.min(Math.max(0, this.active()), this.results().length - 1)].id,
      );
    }
  }
  private move(direction: number): void {
    const length = this.results().length;
    if (!length) return;
    const current = this.active();
    this.active.set(
      current < 0 ? (direction > 0 ? 0 : length - 1) : (current + direction + length) % length,
    );
    const id = this.results()[this.active()]?.id;
    if (id) this.document.getElementById(`command-${id}`)?.scrollIntoView?.({ block: 'nearest' });
  }
  optionKey(event: KeyboardEvent, index: number): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    this.active.set(index);
    this.keydown(event);
    const id = this.results()[this.active()]?.id;
    if (id) this.document.getElementById(`command-${id}`)?.focus();
  }
}
