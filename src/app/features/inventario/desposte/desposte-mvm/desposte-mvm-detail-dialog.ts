import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import type { Desposte } from '../../../../core/models/desposte.model';
import { DesposteService } from '../../../../core/services/desposte.service';
import { balanceSegments, formatSigned, yieldClass } from './desposte-mvm-format';

export interface DesposteMvmDetailData {
  id: string;
}

@Component({
  selector: 'app-desposte-mvm-detail-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <h2 mat-dialog-title class="mvm-detail-title">
      <mat-icon>insights</mat-icon> Detalle MVM · balance de masa
    </h2>

    <mat-dialog-content class="mvm-detail-content">
      @if (loading()) {
        <div class="spinner-container"><mat-spinner diameter="36" /></div>
      }

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }

      @if (!loading() && !error() && desposte(); as d) {
        <div class="yield-hero">
          <span class="yield-hero-label">Rendimiento</span>
          <span [class]="'yield-hero-value ' + yieldClass(d.yieldPercentage)">
            {{ d.yieldPercentage | number: '1.0-2' }}%
          </span>
          <span [class]="'tol-badge ' + (d.withinTolerance ? 'tol-ok' : 'tol-off')">
            {{ d.withinTolerance ? 'Dentro de tolerancia' : 'Fuera de tolerancia' }}
          </span>
        </div>

        <div class="balance-bar" aria-label="Balance de masa">
          @for (segment of segments(); track segment.key) {
            <span
              [class]="'balance-seg ' + segment.class"
              [style.width.%]="segment.pct"
              [attr.title]="segment.label + ': ' + segment.value + ' kg'"
            ></span>
          }
        </div>
        <p class="balance-caption">
          @for (segment of segments(); track segment.key) {
            <span class="balance-caption-item">
              <i [class]="'mvm-swatch ' + segment.class"></i>
              {{ segment.label }}: {{ segment.value | number: '1.0-2' }} kg ({{ segment.pct | number: '1.0-1' }}%)
            </span>
          }
        </p>

        <dl class="mvm-grid">
          <dt>W_in</dt>
          <dd>{{ d.inputWeight | number: '1.0-2' }} kg</dd>

          <dt>ΣW_out</dt>
          <dd>{{ totalOut() | number: '1.0-2' }} kg</dd>

          <dt>Cortes</dt>
          <dd>{{ d.totalCutsWeight | number: '1.0-2' }} kg</dd>

          <dt>Desperdicio</dt>
          <dd class="cell-waste">{{ d.wasteWeight | number: '1.0-2' }} kg</dd>

          <dt>Merma técnica</dt>
          <dd class="cell-shrink">{{ d.shrinkWeight | number: '1.0-2' }} kg</dd>

          <dt>ΔMasa</dt>
          <dd>{{ formatSigned(d.deviation) }} kg</dd>

          <dt>Tolerancia</dt>
          <dd>±{{ d.tolerance | number: '1.0-2' }} kg</dd>

          <dt>Estado</dt>
          <dd>
            <span [class]="'tol-badge ' + (d.withinTolerance ? 'tol-ok' : 'tol-off')">
              {{ d.withinTolerance ? 'Dentro' : 'Fuera' }}
            </span>
          </dd>

          <dt>Valor comercial</dt>
          <dd>{{ d.totalCommercialValue | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

          <dt>Costo asignado</dt>
          <dd>{{ d.totalAllocatedCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}</dd>

          <dt>Creado por</dt>
          <dd>{{ d.createdBy || '—' }}</dd>

          <dt>Fecha</dt>
          <dd>{{ d.createdAt | date: 'medium' }}</dd>

          <dt>Notas</dt>
          <dd>{{ d.notes || '—' }}</dd>
        </dl>

        <h3 class="mvm-cuts-title">Cortes ({{ d.cuts.length }})</h3>
        <mat-table [dataSource]="d.cuts" class="mvm-cuts-table">
          <ng-container matColumnDef="productId">
            <mat-header-cell *matHeaderCellDef>Producto</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-mono">{{ cut.productId }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="warehouseId">
            <mat-header-cell *matHeaderCellDef>Bodega</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-mono">{{ cut.warehouseId }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="weight">
            <mat-header-cell *matHeaderCellDef>Peso</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-num">{{ cut.weight | number: '1.0-2' }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="suggestedSalePrice">
            <mat-header-cell *matHeaderCellDef>Precio sugerido</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-num">
              {{ cut.suggestedSalePrice | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="commercialValue">
            <mat-header-cell *matHeaderCellDef>Valor comercial</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-num">
              {{ cut.commercialValue | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="allocatedCost">
            <mat-header-cell *matHeaderCellDef>Costo asignado</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-num">
              {{ cut.allocatedCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="unitCost">
            <mat-header-cell *matHeaderCellDef>Costo unitario</mat-header-cell>
            <mat-cell *matCellDef="let cut" class="cell-num">
              {{ cut.unitCost | currency: 'COP' : 'symbol-narrow' : '1.0-2' : 'es-CO' }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="expirationDate">
            <mat-header-cell *matHeaderCellDef>Vencimiento</mat-header-cell>
            <mat-cell *matCellDef="let cut">
              {{ cut.expirationDate ? (cut.expirationDate | date: 'dd/MM/yyyy') : '—' }}
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="cutColumns; sticky: true" />
          <mat-row *matRowDef="let cut; columns: cutColumns" />
        </mat-table>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .mvm-detail-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
      .mvm-detail-content {
        min-width: 680px;
        max-width: 900px;
        padding-top: 8px !important;
      }
      .spinner-container {
        display: flex;
        justify-content: center;
        padding: 32px;
      }
      .error-msg {
        color: #ef4444;
        text-align: center;
        padding: 16px;
      }
      .yield-hero {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .yield-hero-label {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .yield-hero-value {
        font-size: 1.75rem;
        font-weight: 700;
        padding: 2px 14px;
        border-radius: 10px;
      }
      .balance-bar {
        display: flex;
        width: 100%;
        height: 18px;
        border-radius: 9px;
        overflow: hidden;
        background: #e2e8f0;
        margin-bottom: 8px;
      }
      .balance-seg {
        display: block;
        height: 100%;
      }
      .balance-caption {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin: 0 0 16px;
        font-size: 0.78rem;
        color: #475569;
      }
      .balance-caption-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .seg-cuts {
        background: #22c55e;
      }
      .seg-waste {
        background: #f59e0b;
      }
      .seg-shrink {
        background: #0d9488;
      }
      .mvm-swatch {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 3px;
      }
      .mvm-grid {
        display: grid;
        grid-template-columns: 150px 1fr;
        gap: 8px 16px;
        margin: 0 0 20px;
      }
      .mvm-grid dt {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding-top: 2px;
      }
      .mvm-grid dd {
        margin: 0;
        color: #1e293b;
        font-size: 0.9rem;
        word-break: break-word;
      }
      .cell-waste {
        color: #b45309;
      }
      .cell-shrink {
        color: #0f766e;
      }
      .mvm-cuts-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 8px;
      }
      .mvm-cuts-table {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .cell-mono {
        font-family: 'Courier New', monospace;
        font-size: 0.75rem;
        color: #64748b;
      }
      .cell-num {
        text-align: right !important;
      }
      .yield-good {
        background: #dcfce7;
        color: #15803d;
      }
      .yield-warn {
        background: #fef3c7;
        color: #b45309;
      }
      .yield-bad {
        background: #fee2e2;
        color: #dc2626;
      }
      .tol-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .tol-ok {
        background: #dcfce7;
        color: #15803d;
      }
      .tol-off {
        background: #fee2e2;
        color: #dc2626;
      }
    `,
  ],
})
export class DesposteMvmDetailDialogComponent implements OnInit {
  private readonly service = inject(DesposteService);

  readonly data = inject<DesposteMvmDetailData>(MAT_DIALOG_DATA);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly desposte = signal<Desposte | null>(null);

  readonly cutColumns = [
    'productId',
    'warehouseId',
    'weight',
    'suggestedSalePrice',
    'commercialValue',
    'allocatedCost',
    'unitCost',
    'expirationDate',
  ];

  readonly yieldClass = yieldClass;
  readonly formatSigned = formatSigned;

  readonly segments = computed(() => {
    const d = this.desposte();
    return d ? balanceSegments(d) : [];
  });

  /** Sum of the usable/waste/shrink outputs (does not include ΔMasa). */
  readonly totalOut = computed(() => {
    const d = this.desposte();
    return d ? d.totalCutsWeight + d.wasteWeight + d.shrinkWeight : 0;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getById(this.data.id).subscribe({
      next: (desposte) => {
        this.desposte.set(desposte);
        this.loading.set(false);
      },
      error: () => {
        this.desposte.set(null);
        this.loading.set(false);
        this.error.set('Error al cargar el detalle del desposte.');
      },
    });
  }
}
