import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BatchService } from '../../../../core/services/batch.service';
import { Batch, BatchStatus, BatchType } from '../../../../core/models/batch.model';
import { PageResponse } from '../../../../core/models/page.model';
import { BatchFormComponent } from '../batch-form/batch-form';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './batch-list.html',
  styleUrl: './batch-list.css',
})
export class BatchListComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  readonly service = inject(BatchService);

  readonly displayedColumns = [
    'entryDate',
    'productName',
    'supplierName',
    'status',
    'initialWeight',
    'purchaseCost',
    'trazabilidad',
    'batchType',
    'notes',
    'actions',
  ];

  readonly batchTypeFilter = signal<BatchType | null>(null);
  readonly expandedParents = signal<Set<string>>(new Set());
  readonly childrenMap = signal<Map<string, Batch[]>>(new Map());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<Batch> | null>(null);

  /** Flat list: server content filtered by batchType, with expanded children inserted after parent. */
  readonly displayedBatches = computed(() => {
    const content = this.data()?.content ?? [];
    const typeFilter = this.batchTypeFilter();

    const filtered = typeFilter ? content.filter((b) => b.batchType === typeFilter) : content;

    const expanded = this.expandedParents();
    const children = this.childrenMap();
    const result: Batch[] = [];

    for (const batch of filtered) {
      result.push(batch);
      if (batch.batchType === 'PARENT' && expanded.has(batch.id) && children.has(batch.id)) {
        result.push(...children.get(batch.id)!);
      }
    }

    return result;
  });

  readonly statusOptions: { value: BatchStatus | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'OPEN', label: 'Abierto' },
    { value: 'PROCESSING', label: 'En proceso' },
    { value: 'CLOSED', label: 'Cerrado' },
  ];

  readonly batchTypeOptions: { value: BatchType | null; label: string }[] = [
    { value: null, label: 'Todos los tipos' },
    { value: 'PARENT', label: 'Padre' },
    { value: 'CHILD', label: 'Hijo' },
    { value: 'STANDARD', label: 'Estándar' },
  ];

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

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.list(this.service.page(), 20, this.service.status()).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.data.set(result);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error cargando lotes. Intentá de nuevo.');
      },
    });
  }

  onStatusChange(value: BatchStatus | null): void {
    this.service.status.set(value);
    this.service.page.set(0);
    this.expandedParents.set(new Set());
    this.childrenMap.set(new Map());
    this.loadBatches();
  }

  onBatchTypeChange(value: BatchType | null): void {
    this.batchTypeFilter.set(value);
    this.expandedParents.set(new Set());
    this.childrenMap.set(new Map());
  }

  openForm(): void {
    const ref = this.dialog.open(BatchFormComponent, {
      width: '95vw',
      maxWidth: '1600px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.loadBatches();
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as BatchStatus] ?? status;
  }

  getBatchTypeLabel(type: string | undefined): string {
    return type ? (this.batchTypeLabels[type as BatchType] ?? type) : '—';
  }

  isChildBatch(row: Batch): boolean {
    return row.batchType === 'CHILD';
  }

  isParentBatch(row: Batch): boolean {
    return row.batchType === 'PARENT';
  }

  isExpanded(id: string): boolean {
    return this.expandedParents().has(id);
  }

  toggleExpand(batch: Batch): void {
    if (batch.batchType !== 'PARENT') return;

    const expanded = new Set(this.expandedParents());
    if (expanded.has(batch.id)) {
      expanded.delete(batch.id);
      this.expandedParents.set(expanded);
    } else {
      this.service.listChildren(batch.id).subscribe((children) => {
        const map = new Map(this.childrenMap());
        map.set(batch.id, children);
        this.childrenMap.set(map);
        expanded.add(batch.id);
        this.expandedParents.set(expanded);
      });
    }
  }

  getParentRef(batch: Batch): string | null {
    if (batch.parentBatchId) {
      return batch.parentBatchId.substring(0, 8) + '...';
    }
    return null;
  }

  closeStatus(id: string): void {
    this.service.updateStatus(id, 'CLOSED').subscribe(() => this.loadBatches());
  }

  nextPage(): void {
    this.service.page.update((p) => p + 1);
    this.loadBatches();
  }

  prevPage(): void {
    this.service.page.update((p) => Math.max(0, p - 1));
    this.loadBatches();
  }
}
