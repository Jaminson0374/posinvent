import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink, Router } from '@angular/router';
import { TransferService } from '../../../core/services/transfer.service';
import type {
  TransferResponse,
  TransferPage,
  TransferItemResponse,
} from '../../../core/models/transfer.model';

@Component({
  selector: 'app-transfer-list',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './transfer-list.html',
  styles: [
    '.tl-page{max-width:1100px;margin:0 auto;padding:1rem} .tl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .tl-title{font-size:1.25rem;font-weight:600} .spinner-container{display:flex;justify-content:center;padding:32px} .error-msg{color:#ef4444;text-align:center} .empty-msg{text-align:center;color:#94a3b8;padding:24px} .tl-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden} .cell-mono{font-family:monospace;font-size:.8rem;color:#64748b}',
  ],
})
export class TransferListComponent implements OnInit {
  private readonly service = inject(TransferService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<TransferPage | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly cols = [
    'createdAt',
    'status',
    'sourceWarehouseId',
    'targetWarehouseId',
    'items',
    'notes',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.page(), this.size()).subscribe({
      next: (p) => {
        this.data.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar traslados.');
      },
    });
  }

  onPageChange(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.load();
  }

  confirm(id: string): void {
    this.service.confirm(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message ?? 'Error'),
    });
  }

  cancel(id: string): void {
    this.service.cancel(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message ?? 'Error'),
    });
  }

  statusClass(s: string): string {
    switch (s) {
      case 'DRAFT':
        return 'chip-draft';
      case 'CONFIRMED':
        return 'chip-confirmed';
      case 'CANCELLED':
        return 'chip-cancelled';
      default:
        return '';
    }
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'DRAFT':
        return 'Borrador';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return s;
    }
  }

  itemCount(items: TransferItemResponse[]): string {
    return `${items?.length ?? 0} ítems`;
  }

  viewDetail(id: string): void {
    this.router.navigate(['/inventario/traslados', id]);
  }
}
