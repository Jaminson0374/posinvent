import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DisposalResponse } from '../../../core/models/disposal.model';
import { typeClass, typeLabel } from './disposal-format';

@Component({
  selector: 'app-disposal-detail-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dis-title"><mat-icon>delete_outline</mat-icon> Detalle del decomiso</h2>

    <mat-dialog-content class="dis-content">
      <dl class="dis-grid">
        <dt>Fecha</dt>
        <dd>{{ data.createdAt | date: 'medium' }}</dd>

        <dt>Tipo</dt>
        <dd>
          <span [class]="'chip ' + typeClass(data.disposalType)">
            {{ typeLabel(data.disposalType) }}
          </span>
        </dd>

        <dt>Producto</dt>
        <dd class="dis-mono">{{ data.productId }}</dd>

        <dt>Lote</dt>
        <dd class="dis-mono">{{ data.batchId ?? '—' }}</dd>

        <dt>Bodega</dt>
        <dd class="dis-mono">{{ data.warehouseId }}</dd>

        <dt>Cantidad</dt>
        <dd>{{ data.quantity }}</dd>

        <dt>Costo unitario</dt>
        <dd>{{ data.unitCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Costo total</dt>
        <dd>{{ totalCost() | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Motivo</dt>
        <dd>{{ data.reason }}</dd>

        <dt>Documento oficial</dt>
        <dd>{{ data.officialDocument ?? '—' }}</dd>

        <dt>Fecha decomiso</dt>
        <dd>{{ data.disposalDate ? (data.disposalDate | date: 'medium') : '—' }}</dd>

        <dt>Asiento contable</dt>
        <dd>{{ data.journalEntryId ?? '—' }}</dd>

        <dt>Registrado por</dt>
        <dd>{{ data.registeredBy ?? '—' }}</dd>
      </dl>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dis-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
      .dis-content {
        min-width: 420px;
        padding-top: 8px !important;
      }
      .dis-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 16px;
        margin: 0;
      }
      .dis-grid dt {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding-top: 2px;
      }
      .dis-grid dd {
        margin: 0;
        color: #1e293b;
        font-size: 0.9rem;
        word-break: break-word;
      }
      .dis-mono {
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
      .chip-sanitario {
        background: #fee2e2 !important;
        color: #dc2626 !important;
      }
      .chip-residuo {
        background: #fef3c7 !important;
        color: #d97706 !important;
      }
      .chip-merma {
        background: #f1f5f9 !important;
        color: #475569 !important;
      }
    `,
  ],
})
export class DisposalDetailDialogComponent {
  readonly data = inject<DisposalResponse>(MAT_DIALOG_DATA);

  readonly typeLabel = typeLabel;
  readonly typeClass = typeClass;

  readonly totalCost = computed(() => this.data.quantity * this.data.unitCost);
}
