import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { DisposalService } from '../../../core/services/disposal.service';
import type { DisposalResponse } from '../../../core/models/disposal.model';
import type { PageResponse } from '../../../core/models/page.model';
import { DisposalDetailDialogComponent } from './disposal-detail-dialog';
import { typeClass, typeLabel } from './disposal-format';

@Component({
  selector: 'app-disposal-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    SlicePipe,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    RouterLink,
  ],
  templateUrl: './disposal-list.html',
  styles: [
    '.dl-page{max-width:1100px;margin:0 auto;padding:1rem} .dl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .dl-title{font-size:1.25rem;font-weight:600} .spinner-container{display:flex;justify-content:center;padding:32px} .error-msg{color:#ef4444;text-align:center} .empty-msg{text-align:center;color:#94a3b8;padding:24px} .dl-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden} .cell-mono{font-family:monospace;font-size:.8rem;color:#64748b} .chip-sanitario{background:#fee2e2!important;color:#dc2626!important} .chip-residuo{background:#fef3c7!important;color:#d97706!important} .chip-merma{background:#f1f5f9!important;color:#475569!important}',
  ],
})
export class DisposalListComponent implements OnInit {
  private readonly service = inject(DisposalService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<DisposalResponse> | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly cols = [
    'createdAt',
    'disposalType',
    'productId',
    'warehouseId',
    'quantity',
    'unitCost',
    'reason',
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
        this.error.set('Error al cargar decomisos.');
      },
    });
  }

  onPageChange(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.load();
  }

  readonly typeLabel = typeLabel;
  readonly typeClass = typeClass;

  openDetail(disposal: DisposalResponse): void {
    this.dialog.open(DisposalDetailDialogComponent, { data: disposal, width: '520px' });
  }
}
