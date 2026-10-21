import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { LogisticsService } from '../../../core/services/logistics.service';
import { CanOperateReceiptDirective } from '../../../shared/directives/can-operate-receipt.directive';
import type { ReceiptResponse, ReceiptStatus } from '../../../core/models/logistics.model';

const STATUS_COLORS: Record<ReceiptStatus, string> = {
  PENDING: 'warn',
  PARTIAL: 'accent',
  COMPLETED: 'primary',
  CANCELLED: '',
};

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    DatePipe,
    CanOperateReceiptDirective,
  ],
  templateUrl: './receipt-list.html',
  styleUrl: './receipt-list.css',
})
export class ReceiptListComponent implements OnInit {
  private readonly service = inject(LogisticsService);

  readonly data = signal<ReceiptResponse[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly columns = [
    'receiptNumber',
    'receiptDate',
    'warehouseId',
    'supplierId',
    'status',
    'actions',
  ];

  readonly statusColor = (status: ReceiptStatus) => STATUS_COLORS[status];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.listReceipts(this.page(), this.size()).subscribe({
      next: (res) => {
        this.data.set(res.content);
        this.total.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.load();
  }
}
