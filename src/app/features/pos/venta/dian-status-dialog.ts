import { Component, Signal, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { STATUS_LABELS, type ElectronicInvoice } from '../../../core/models/dian.model';

/**
 * Dialog payload. Live signals are passed so the dialog keeps reflecting the
 * ongoing DIAN polling performed by the POS checkout while the user reads it.
 */
export interface DianStatusDialogData {
  invoice: Signal<ElectronicInvoice | null>;
  documentNumber: Signal<string | null>;
  checking: Signal<boolean>;
}

@Component({
  selector: 'app-dian-status-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dian-status-dialog.html',
  styleUrl: './dian-status-dialog.css',
})
export class DianStatusDialogComponent {
  readonly data = inject<DianStatusDialogData>(MAT_DIALOG_DATA);

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  chipClass(status: string): string {
    switch (status) {
      case 'PENDING_SEND':
        return 'dsd-chip-pending';
      case 'SENT':
        return 'dsd-chip-sent';
      case 'ACCEPTED_BY_DIAN':
        return 'dsd-chip-accepted';
      case 'REJECTED_BY_DIAN':
        return 'dsd-chip-rejected';
      default:
        return '';
    }
  }
}
