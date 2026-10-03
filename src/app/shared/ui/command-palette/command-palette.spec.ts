import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { CommandRegistry, COMMANDS } from '../../../core/commands/command-registry';
import { CommandPalette } from './command-palette';
describe('Command palette keyboard behavior', () => {
  let palette: CommandPalette;
  let close: ReturnType<typeof vi.fn>;
  let allowed: boolean;
  beforeEach(() => {
    close = vi.fn();
    allowed = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: CommandRegistry,
          useValue: {
            canExecute: () => allowed,
            search: (query: string) =>
              COMMANDS.filter((command) =>
                command.label.toLowerCase().includes(query.toLowerCase()),
              ),
          },
        },
      ],
    });
    palette = TestBed.runInInjectionContext(() => new CommandPalette());
  });
  it('filters commands and resets the active option after a search', () => {
    palette.query.set('threat');
    expect(
      palette.results().every((command) => command.label.toLowerCase().includes('threat')),
    ).toBe(true);
    palette.keydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(palette.active()).toBe(0);
    const input = document.createElement('input');
    input.value = 'Devices';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: input });
    palette.search(event);
    expect(palette.active()).toBe(-1);
    expect(palette.results().map((command) => command.id)).toContain('devices');
  });
  it('supports Arrow Down/Up, wrapping and Enter returns a command to the dialog coordinator', () => {
    palette.keydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(palette.active()).toBe(0);
    palette.keydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(palette.active()).toBe(COMMANDS.length - 1);
    palette.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(close).toHaveBeenCalledWith('at-risk-devices');
  });
  it('keeps Enter safe when the available results shrink after selecting an option', () => {
    palette.active.set(COMMANDS.length - 1);
    palette.query.set('Go to Devices');
    palette.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(close).toHaveBeenCalledWith('devices');
  });
  it('does not execute when empty, composing or permissions have changed', () => {
    palette.query.set('nothing-matches');
    palette.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(close).not.toHaveBeenCalled();
    palette.query.set('');
    palette.keydown(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }));
    allowed = false;
    palette.choose('settings');
    expect(close).not.toHaveBeenCalled();
  });
  it('keeps button options navigable with arrow keys as well as native Tab and Enter', () => {
    const button = document.createElement('button');
    button.id = 'command-threats';
    document.body.append(button);
    try {
      palette.optionKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }), 0);
      expect(palette.active()).toBe(1);
      expect(document.activeElement).toBe(button);
    } finally {
      button.remove();
    }
  });
});
