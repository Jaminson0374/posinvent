import { Component, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JournalEntryDetailDialogComponent } from './journal-entry-detail-dialog';
import type { JournalEntry } from '../../core/models/journal-entry.model';

@Component({
  selector: 'app-journal-entry-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (loading()) {
      <div class="spinner-container">
        <mat-spinner diameter="32" />
      </div>
    } @else {
      <div style="display:flex;justify-content:flex-end;margin-bottom:.5rem">
        <button mat-raised-button color="primary" (click)="createClick.emit()">
          <mat-icon>add</mat-icon> Nuevo asiento
        </button>
      </div>
      <div class="ac-table">
        <table mat-table [dataSource]="entries()">
          <ng-container matColumnDef="entryNumber">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let e">{{ e.entryNumber }}</td>
          </ng-container>
          <ng-container matColumnDef="entryDate">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let e">{{ e.entryDate | date: 'shortDate' }}</td>
          </ng-container>
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Descripción</th>
            <td mat-cell *matCellDef="let e">
              {{ e.description || '—' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="sourceType">
            <th mat-header-cell *matHeaderCellDef>Origen</th>
            <td mat-cell *matCellDef="let e">
              <span class="ac-chip" [class]="sourceClass(e.sourceType)">
                {{ sourceLabel(e.sourceType) }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="lines">
            <th mat-header-cell *matHeaderCellDef>Líneas</th>
            <td mat-cell *matCellDef="let e">{{ lineCount(e) }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-icon-button [matTooltip]="'Ver detalle'" (click)="openDetail(e)">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns()"></tr>
          <tr mat-row *matRowDef="let row; columns: columns()"></tr>
        </table>
      </div>
    }
  `,
  styles: [
    '.spinner-container{display:flex;justify-content:center;padding:32px}',
    '.ac-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:.5rem}',
    '.chip-sale{background:#dcfce7;color:#15803d}',
    '.chip-purchase{background:#dbeafe;color:#1d4ed8}',
    '.chip-manual{background:#fef3c7;color:#d97706}',
    '.chip-inventory{background:#f3e8ff;color:#7c3aed}',
    '.chip-payment{background:#cffafe;color:#0e7490}',
    '.ac-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600}',
  ],
})
export class JournalEntryListComponent {
  private readonly dialog = inject(MatDialog);
  readonly entries = input.required<JournalEntry[]>();
  readonly loading = input(false);
  readonly columns = input([
    'entryNumber',
    'entryDate',
    'description',
    'sourceType',
    'lines',
    'actions',
  ]);
  readonly createClick = output<void>();

  openDetail(entry: JournalEntry): void {
    this.dialog.open(JournalEntryDetailDialogComponent, {
      width: '640px',
      data: entry,
    });
  }

  sourceLabel(s: string): string {
    switch (s) {
      case 'SALE':
        return 'Venta';
      case 'PURCHASE':
        return 'Compra';
      case 'INVENTORY':
        return 'Inventario';
      case 'PAYMENT':
        return 'Pago';
      default:
        return 'Manual';
    }
  }

  sourceClass(s: string): string {
    return 'chip-' + s.toLowerCase();
  }

  lineCount(entry: JournalEntry): string {
    return (entry.lines?.length ?? 0) + ' líneas';
  }
}
