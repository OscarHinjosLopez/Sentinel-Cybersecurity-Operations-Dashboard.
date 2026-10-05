import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-shortcut-help',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Keyboard shortcuts</h2>
    <mat-dialog-content tabindex="0" role="region" aria-label="Shortcut reference"
      ><dl>
        <div>
          <dt>Command Palette</dt>
          <dd><kbd>Ctrl / Cmd + K</kbd></dd>
        </div>
        <div>
          <dt>Dashboard</dt>
          <dd><kbd>G then D</kbd></dd>
        </div>
        <div>
          <dt>Threats</dt>
          <dd><kbd>G then T</kbd></dd>
        </div>
        <div>
          <dt>Devices</dt>
          <dd><kbd>G then V</kbd></dd>
        </div>
        <div>
          <dt>Shortcut help</dt>
          <dd><kbd>?</kbd></dd>
        </div>
        <div>
          <dt>Close dialogs</dt>
          <dd><kbd>Esc</kbd></dd>
        </div>
      </dl>
      <p>
        Navigation sequences allow one second between keys. They are ignored while typing and inside
        dialogs. Ctrl / Cmd + K also works in search fields.
      </p></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Close</button></mat-dialog-actions
    >`,
  styles: `
    dl {
      margin: 0;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--sentinel-border);
    }
    dd {
      margin: 0;
    }
    kbd {
      font: inherit;
      font-size: 0.875rem;
      color: var(--sentinel-text-secondary);
    }
    p {
      margin-top: 1rem;
      color: var(--sentinel-text-secondary);
      font-size: 0.875rem;
    }
  `,
})
export class ShortcutHelp {}
