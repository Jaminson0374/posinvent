import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BatchService } from '../../../../core/services/batch.service';
import { Batch, BatchStatus, BatchType } from '../../../../core/models/batch.model';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
  ],
  templateUrl: './batch-detail.html',
  styleUrl: './batch-detail.css',
})
export class BatchDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(BatchService);

  readonly batchId = signal<string | null>(null);
  readonly batch = signal<Batch | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly children = signal<Batch[]>([]);

  readonly childColumns = ['entryDate', 'productName', 'initialWeight', 'status'];

  readonly statusLabels: Record<BatchStatus, string> = {
    OPEN: 'Abierto',
    PROCESSING: 'En proceso',
    CLOSED: 'Cerrado',
  };

  readonly batchTypeLabels: Record<BatchType, string> = {
    PARENT: 'Padre',
    CHILD: 'Hijo',
    STANDARD: 'Estándar',
  };

  /** Total cost = initial weight * purchase cost. */
  readonly totalCost = computed(() => {
    const current = this.batch();
    return current ? current.initialWeight * current.purchaseCost : 0;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de lote no proporcionado.');
      return;
    }

    this.batchId.set(id);
    this.loadBatch();
  }

  loadBatch(): void {
    const id = this.batchId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.service.getById(id).subscribe({
      next: (data) => {
        this.batch.set(data);
        this.loading.set(false);

        if (data.batchType === 'PARENT') {
          this.loadChildren(id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el lote.');
      },
    });
  }

  /** Children are best-effort: a failure must not break the detail screen. */
  private loadChildren(id: string): void {
    this.service.listChildren(id).subscribe({
      next: (children) => this.children.set(children),
      error: () => this.children.set([]),
    });
  }

  closeBatch(): void {
    const id = this.batchId();
    if (!id) return;

    this.service.updateStatus(id, 'CLOSED').subscribe({
      next: () => this.loadBatch(),
      error: () => this.error.set('Error al cerrar el lote.'),
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as BatchStatus] ?? status;
  }

  getBatchTypeLabel(type: BatchType | undefined): string {
    return type ? (this.batchTypeLabels[type] ?? type) : '—';
  }
}
