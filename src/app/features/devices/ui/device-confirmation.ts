import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-device-confirmation',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>
      {{ data.action === 'isolate' ? 'Isolate device?' : 'Restore device?' }}
    </h2>
    <mat-dialog-content
      ><p>
        {{ data.hostname }} will
        {{
          data.action === 'isolate' ? 'enter simulated isolation' : 'return to Online in this demo'
        }}. No real endpoint or network connection will be modified.
      </p></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button [mat-dialog-close]="false">Cancel</button
      ><button mat-flat-button [mat-dialog-close]="true">
        {{ data.action === 'isolate' ? 'Isolate device' : 'Restore device' }}
      </button></mat-dialog-actions
    >`,
})
export class DeviceConfirmation {
  readonly data = inject<{ hostname: string; action: 'isolate' | 'restore' }>(MAT_DIALOG_DATA);
}
