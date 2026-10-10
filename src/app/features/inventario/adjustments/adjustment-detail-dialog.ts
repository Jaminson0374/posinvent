import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { StockAdjustment } from '../../../core/models/adjustment.model';
import { typeClass, typeLabel } from './adjustment-format';

@Component({
  selector: 'app-adjustment-detail-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="add-title"><mat-icon>tune</mat-icon> Detalle del ajuste</h2>

    <mat-dialog-content class="add-content">
      <dl class="add-grid">
        <dt>Fecha</dt>
        <dd>{{ data.createdAt | date: 'medium' }}</dd>

        <dt>Tipo</dt>
        <dd>
          <span [class]="'chip ' + typeClass(data.adjustmentType)">
            {{ typeLabel(data.adjustmentType) }}
          </span>
        </dd>

        <dt>Producto</dt>
        <dd class="add-mono">{{ data.productId }}</dd>

        <dt>Lote</dt>
        <dd class="add-mono">{{ data.batchId ?? '—' }}</dd>

        <dt>Bodega</dt>
        <dd class="add-mono">{{ data.warehouseId }}</dd>

        <dt>Cantidad antes</dt>
        <dd>{{ data.quantityBefore }}</dd>

        <dt>Cantidad después</dt>
        <dd>{{ data.quantityAfter }}</dd>

        <dt>Diferencia</dt>
        <dd [class]="differenceClass()">{{ differenceText() }}</dd>

        <dt>Costo unitario</dt>
        <dd>{{ data.unitCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Costo total</dt>
        <dd>{{ totalCost() | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Motivo</dt>
        <dd>{{ data.reason }}</dd>

        <dt>Creado por</dt>
        <dd>{{ data.createdBy ?? '—' }}</dd>
      </dl>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .add-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
      .add-content {
        min-width: 420px;
        padding-top: 8px !important;
      }
      .add-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 16px;
        margin: 0;
      }
      .add-grid dt {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding-top: 2px;
      }
      .add-grid dd {
        margin: 0;
        color: #1e293b;
        font-size: 0.9rem;
        word-break: break-word;
      }
      .add-mono {
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        color: #64748b;
      }
      .chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .chip-physical {
        background: #dbeafe !important;
        color: #1d4ed8 !important;
      }
      .chip-damage {
        background: #fee2e2 !important;
        color: #dc2626 !important;
      }
      .chip-expiration {
        background: #fef3c7 !important;
        color: #d97706 !important;
      }
      .chip-theft {
        background: #f3e8ff !important;
        color: #7c3aed !important;
      }
      .chip-other {
        background: #f1f5f9 !important;
        color: #475569 !important;
      }
      .add-diff-pos {
        color: #15803d !important;
        font-weight: 600;
      }
      .add-diff-neg {
        color: #dc2626 !important;
        font-weight: 600;
      }
    `,
  ],
})
export class AdjustmentDetailDialogComponent {
  readonly data = inject<StockAdjustment>(MAT_DIALOG_DATA);

  readonly typeLabel = typeLabel;
  readonly typeClass = typeClass;

  readonly difference = computed(() => this.data.quantityAfter - this.data.quantityBefore);

  readonly differenceText = computed(() => {
    const value = this.difference();
    return value > 0 ? `+${value}` : `${value}`;
  });

  readonly differenceClass = computed(() =>
    this.difference() >= 0 ? 'add-diff-pos' : 'add-diff-neg',
  );

  readonly totalCost = computed(() => Math.abs(this.difference()) * this.data.unitCost);
}
