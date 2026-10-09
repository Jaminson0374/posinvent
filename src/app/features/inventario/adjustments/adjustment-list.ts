import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdjustmentService } from '../../../core/services/adjustment.service';
import { StockAdjustment } from '../../../core/models/adjustment.model';
import { PageResponse } from '../../../core/models/page.model';

@Component({
  selector: 'app-adjustment-list',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './adjustment-list.html',
  styleUrl: './adjustment-list.css',
})
export class AdjustmentListComponent implements OnInit {
  private readonly service = inject(AdjustmentService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<StockAdjustment> | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);

  readonly displayedColumns = [
    'createdAt',
    'adjustmentType',
    'productId',
    'warehouseId',
    'quantityBefore',
    'quantityAfter',
    'reason',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.page(), this.size()).subscribe({
      next: (page) => {
        this.data.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar los ajustes.');
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.load();
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'PHYSICAL_COUNT':
        return 'Conteo físico';
      case 'DAMAGE':
        return 'Daño';
      case 'EXPIRATION':
        return 'Vencimiento';
      case 'THEFT':
        return 'Hurto';
      case 'OTHER':
        return 'Otro';
      default:
        return type;
    }
  }

  typeClass(type: string): string {
    switch (type) {
      case 'PHYSICAL_COUNT':
        return 'chip-physical';
      case 'DAMAGE':
        return 'chip-damage';
      case 'EXPIRATION':
        return 'chip-expiration';
      case 'THEFT':
        return 'chip-theft';
      default:
        return 'chip-other';
    }
  }
}
