import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { InventoryMovement } from '../../../core/models/kardex.model';
import { typeClass, typeLabel } from './kardex-format';

const SOURCE_REFERENCE_TYPES = new Set(['ADJUSTMENT', 'TRANSFER', 'DISPOSAL']);

@Component({
  selector: 'app-kardex-detail-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="kdd-title"><mat-icon>info</mat-icon> Detalle del movimiento</h2>

    <mat-dialog-content class="kdd-content">
      <dl class="kdd-grid">
        <dt>Fecha</dt>
        <dd>{{ data.createdAt | date: 'medium' }}</dd>

        <dt>Tipo</dt>
        <dd>
          <span [class]="'chip ' + typeClass(data.movementType)">
            {{ typeLabel(data.movementType) }}
          </span>
        </dd>

        <dt>Producto</dt>
        <dd class="kdd-mono">{{ data.productId }}</dd>

        <dt>Lote</dt>
        <dd class="kdd-mono">{{ data.batchId ?? '—' }}</dd>

        <dt>Bodega</dt>
        <dd class="kdd-mono">{{ data.warehouseId }}</dd>

        <dt>Cantidad</dt>
        <dd>{{ data.quantity }}</dd>

        <dt>Stock anterior</dt>
        <dd>{{ data.previousQty }}</dd>

        <dt>Stock nuevo</dt>
        <dd>{{ data.newQty }}</dd>

        <dt>Costo unitario</dt>
        <dd>{{ data.unitCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Costo total</dt>
        <dd>{{ totalCost() | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

        <dt>Referencia</dt>
        <dd>{{ referenceText() }}</dd>

        <dt>Notas</dt>
        <dd>{{ data.notes ?? '—' }}</dd>

        <dt>Creado por</dt>
        <dd>{{ data.createdBy ?? '—' }}</dd>
      </dl>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (canViewSource()) {
        <button mat-stroked-button color="primary" (click)="viewSource()">
          <mat-icon>open_in_new</mat-icon> Ver documento origen
        </button>
      }
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .kdd-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
      .kdd-content {
        min-width: 420px;
        padding-top: 8px !important;
      }
      .kdd-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 16px;
        margin: 0;
      }
      .kdd-grid dt {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding-top: 2px;
      }
      .kdd-grid dd {
        margin: 0;
        color: #1e293b;
        font-size: 0.9rem;
        word-break: break-word;
      }
      .kdd-mono {
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
      .chip-entry {
        background: #dcfce7 !important;
        color: #15803d !important;
      }
      .chip-exit {
        background: #fee2e2 !important;
        color: #dc2626 !important;
      }
      .chip-adj {
        background: #fef3c7 !important;
        color: #d97706 !important;
      }
      .chip-transfer {
        background: #dbeafe !important;
        color: #1d4ed8 !important;
      }
      .chip-disposal {
        background: #f3e8ff !important;
        color: #7c3aed !important;
      }
      .chip-return {
        background: #cffafe !important;
        color: #0e7490 !important;
      }
      .chip-prod-consume {
        background: #fce7f3 !important;
        color: #be185d !important;
      }
      .chip-prod-output {
        background: #e0e7ff !important;
        color: #4338ca !important;
      }
      .chip-prod-shrink {
        background: #fee2e2 !important;
        color: #991b1b !important;
      }
    `,
  ],
})
export class KardexDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<KardexDetailDialogComponent>);
  private readonly router = inject(Router);
  readonly data = inject<InventoryMovement>(MAT_DIALOG_DATA);

  readonly typeLabel = typeLabel;
  readonly typeClass = typeClass;

  readonly totalCost = computed(() => this.data.quantity * this.data.unitCost);

  readonly canViewSource = computed(
    () =>
      !!this.data.referenceId &&
      !!this.data.referenceType &&
      SOURCE_REFERENCE_TYPES.has(this.data.referenceType),
  );

  readonly referenceText = computed(() => {
    const parts = [this.data.referenceType, this.data.referenceId].filter(
      (part): part is string => !!part,
    );
    return parts.length ? parts.join(' / ') : '—';
  });

  viewSource(): void {
    const refId = this.data.referenceId;
    const refType = this.data.referenceType;
    if (!refId) return;

    switch (refType) {
      case 'ADJUSTMENT':
        this.closeAndNavigate(['/inventario/ajustes']);
        break;
      case 'TRANSFER':
        this.closeAndNavigate(['/inventario/traslados', refId]);
        break;
      case 'DISPOSAL':
        this.closeAndNavigate(['/inventario/decomisos']);
        break;
      default:
        break;
    }
  }

  private closeAndNavigate(commands: readonly string[]): void {
    this.dialogRef.close();
    void this.router.navigate([...commands]);
  }
}
