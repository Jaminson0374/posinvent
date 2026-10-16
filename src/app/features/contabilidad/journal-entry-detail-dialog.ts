import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { PucAccountService } from '../../core/services/puc-account.service';
import type { JournalEntry } from '../../core/models/journal-entry.model';

@Component({
  selector: 'app-journal-entry-detail-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <h2 mat-dialog-title class="je-title">
      <mat-icon>receipt_long</mat-icon> Asiento {{ data.entryNumber }}
    </h2>

    <mat-dialog-content class="je-content">
      <dl class="je-grid">
        <dt>Número</dt>
        <dd>{{ data.entryNumber }}</dd>

        <dt>Fecha</dt>
        <dd>{{ data.entryDate | date: 'mediumDate' }}</dd>

        <dt>Descripción</dt>
        <dd>{{ data.description || '—' }}</dd>

        <dt>Justificación</dt>
        <dd>{{ data.justification || '—' }}</dd>

        <dt>Origen</dt>
        <dd>
          <span [class]="'je-chip ' + sourceClass(data.sourceType)">
            {{ sourceLabel(data.sourceType) }}
          </span>
        </dd>
      </dl>

      <h4 class="je-lines-title">Líneas del asiento</h4>
      <table mat-table [dataSource]="data.lines" class="je-table">
        <ng-container matColumnDef="account">
          <th mat-header-cell *matHeaderCellDef>Cuenta</th>
          <td mat-cell *matCellDef="let l">{{ accountLabel(l.accountId) }}</td>
        </ng-container>
        <ng-container matColumnDef="debit">
          <th mat-header-cell *matHeaderCellDef class="je-num">Débito</th>
          <td mat-cell *matCellDef="let l" class="je-num">
            {{ l.debit | number: '1.2-2' }}
          </td>
        </ng-container>
        <ng-container matColumnDef="credit">
          <th mat-header-cell *matHeaderCellDef class="je-num">Crédito</th>
          <td mat-cell *matCellDef="let l" class="je-num">
            {{ l.credit | number: '1.2-2' }}
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      <div class="je-totals">
        <span
          >Total débitos: <strong>{{ totalDebit() | number: '1.2-2' }}</strong></span
        >
        <span
          >Total créditos: <strong>{{ totalCredit() | number: '1.2-2' }}</strong></span
        >
        <span class="je-balance">
          <mat-icon>{{ isBalanced() ? 'check_circle' : 'error' }}</mat-icon>
          {{ isBalanced() ? 'Cuadrado' : 'Descuadrado' }}
        </span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .je-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
      .je-content {
        min-width: 560px;
        padding-top: 8px !important;
      }
      .je-grid {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 8px 16px;
        margin: 0 0 16px;
      }
      .je-grid dt {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding-top: 2px;
      }
      .je-grid dd {
        margin: 0;
        color: #1e293b;
        font-size: 0.9rem;
        word-break: break-word;
      }
      .je-chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .chip-sale {
        background: #dcfce7;
        color: #15803d;
      }
      .chip-purchase {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .chip-manual {
        background: #fef3c7;
        color: #d97706;
      }
      .chip-inventory {
        background: #f3e8ff;
        color: #7c3aed;
      }
      .chip-payment {
        background: #cffafe;
        color: #0e7490;
      }
      .je-lines-title {
        font-size: 0.875rem;
        font-weight: 600;
        margin: 0 0 8px;
      }
      .je-table {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .je-num {
        text-align: right;
      }
      .je-totals {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: flex-end;
        margin-top: 12px;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        background: #f1f5f9;
        font-size: 0.875rem;
        color: #334155;
      }
      .je-balance {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-weight: 600;
      }
      .je-balance mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    `,
  ],
})
export class JournalEntryDetailDialogComponent {
  readonly data = inject<JournalEntry>(MAT_DIALOG_DATA);
  private readonly pucService = inject(PucAccountService);

  readonly columns = ['account', 'debit', 'credit'];

  readonly totalDebit = computed(() =>
    this.data.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0),
  );

  readonly totalCredit = computed(() =>
    this.data.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0),
  );

  readonly isBalanced = computed(
    () => this.totalDebit() > 0 && Math.abs(this.totalDebit() - this.totalCredit()) < 0.005,
  );

  accountLabel(accountId: string): string {
    const account = (this.pucService.accounts.value() ?? []).find((a) => a.id === accountId);
    return account ? `${account.code} — ${account.name}` : accountId;
  }

  sourceLabel(source: string): string {
    switch (source) {
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

  sourceClass(source: string): string {
    return 'chip-' + source.toLowerCase();
  }
}
