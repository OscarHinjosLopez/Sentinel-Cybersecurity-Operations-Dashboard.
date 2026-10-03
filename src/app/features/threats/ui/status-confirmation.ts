import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ThreatStatus } from '../models/threat.models';
import { STATUS_LABELS } from '../utils/threat-rules';
@Component({
  selector: 'app-status-confirmation',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>
      {{ data.status === 'resolved' ? 'Resolve threat?' : 'Mark as false positive?' }}
    </h2>
    <mat-dialog-content
      ><p>
        {{ data.id }} will be marked {{ labels[data.status].toLowerCase() }}. This is a local demo
        change; no security system will be modified.
      </p>
      <p>Closed threats cannot be reopened in this demo.</p></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button [mat-dialog-close]="false">Cancel</button
      ><button mat-flat-button [mat-dialog-close]="true">
        {{ data.status === 'resolved' ? 'Resolve threat' : 'Mark as false positive' }}
      </button></mat-dialog-actions
    >`,
})
export class StatusConfirmation {
  readonly data = inject<{ id: string; status: ThreatStatus }>(MAT_DIALOG_DATA);
  readonly labels = STATUS_LABELS;
}
