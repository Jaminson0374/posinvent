import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, SlicePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { KardexService } from '../../../core/services/kardex.service';
import { InventoryMovement, MovementType } from '../../../core/models/kardex.model';
import { PageResponse } from '../../../core/models/page.model';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { ProductSearchComponent } from '../../shared/product-search';
import { BatchPickerComponent } from '../../shared/batch-picker';

@Component({
  selector: 'app-kardex-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    WarehousePickerComponent,
    ProductSearchComponent,
    BatchPickerComponent,
  ],
  templateUrl: './kardex-list.html',
  styleUrl: './kardex-list.css',
})
export class KardexListComponent implements OnInit {
  private readonly service = inject(KardexService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<InventoryMovement> | null>(null);

  readonly displayedColumns = [
    'createdAt',
    'movementType',
    'productId',
    'quantity',
    'previousQty',
    'newQty',
    'unitCost',
    'warehouseId',
    'referenceType',
  ];

  readonly movementTypeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'ENTRY', label: 'Entrada' },
    { value: 'EXIT', label: 'Salida' },
    { value: 'ADJUSTMENT', label: 'Ajuste' },
    { value: 'TRANSFER_IN', label: 'Traslado (entrada)' },
    { value: 'TRANSFER_OUT', label: 'Traslado (salida)' },
    { value: 'DISPOSAL', label: 'Decomiso' },
    { value: 'RETURN', label: 'Devolución' },
    { value: 'PRODUCTION_CONSUMPTION', label: 'Consumo producción' },
    { value: 'PRODUCTION_OUTPUT', label: 'Salida producción' },
    { value: 'PRODUCTION_SHRINKAGE', label: 'Merma producción' },
  ];

  readonly filterProduct = new FormControl('', { nonNullable: true });
  readonly filterType = new FormControl('', { nonNullable: true });
  readonly filterProductName = signal('');
  readonly filterProductId = signal('');
  readonly filterWarehouseId = signal('');
  readonly filterBatchId = signal<string | null>(null);
  readonly filterDateFrom = signal<Date | null>(null);
  readonly filterDateTo = signal<Date | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);

  ngOnInit(): void {
    this.loadData();

    this.filterProduct.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.loadData();
      });
  }

  onProductSelected(evt: { id: string; name: string; code: string }): void {
    this.filterProductId.set(evt.id);
    this.filterProductName.set(evt.name);
    this.page.set(0);
    this.loadData();
  }

  onProductCleared(): void {
    this.filterProductId.set('');
    this.filterProductName.set('');
    this.page.set(0);
    this.loadData();
  }

  onWarehouseSelected(id: string): void {
    this.filterWarehouseId.set(id);
    this.page.set(0);
    this.loadData();
  }

  onWarehouseCleared(): void {
    this.filterWarehouseId.set('');
    this.page.set(0);
    this.loadData();
  }

  onBatchSelected(id: string | null): void {
    this.filterBatchId.set(id);
    this.page.set(0);
    this.loadData();
  }

  onTypeChange(): void {
    this.page.set(0);
    this.loadData();
  }

  onDateFromChange(date: Date | null): void {
    this.filterDateFrom.set(date);
    this.page.set(0);
    this.loadData();
  }

  onDateToChange(date: Date | null): void {
    this.filterDateTo.set(date);
    this.page.set(0);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const type = this.filterType.value || undefined;
    const dateFrom = this.filterDateFrom();
    const dateTo = this.filterDateTo();

    this.service
      .search({
        productId: this.filterProductId() || undefined,
        batchId: this.filterBatchId() ?? undefined,
        warehouseId: this.filterWarehouseId() || undefined,
        movementType: type as MovementType | undefined,
        from: dateFrom ? dateFrom.toISOString() : undefined,
        to: dateTo ? dateTo.toISOString() : undefined,
        page: this.page(),
        size: this.size(),
      })
      .subscribe({
        next: (page) => {
          this.data.set(page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar el kardex.');
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.loadData();
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'ENTRY':
        return 'Entrada';
      case 'EXIT':
        return 'Salida';
      case 'ADJUSTMENT':
        return 'Ajuste';
      case 'TRANSFER_IN':
        return 'Traslado +';
      case 'TRANSFER_OUT':
        return 'Traslado −';
      case 'DISPOSAL':
        return 'Decomiso';
      case 'RETURN':
        return 'Devolución';
      case 'PRODUCTION_CONSUMPTION':
        return 'Cons. Prod.';
      case 'PRODUCTION_OUTPUT':
        return 'Salida Prod.';
      case 'PRODUCTION_SHRINKAGE':
        return 'Merma Prod.';
      default:
        return type;
    }
  }

  typeClass(type: string): string {
    switch (type) {
      case 'ENTRY':
        return 'chip-entry';
      case 'EXIT':
        return 'chip-exit';
      case 'ADJUSTMENT':
        return 'chip-adj';
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return 'chip-transfer';
      case 'DISPOSAL':
        return 'chip-disposal';
      case 'RETURN':
        return 'chip-return';
      case 'PRODUCTION_CONSUMPTION':
        return 'chip-prod-consume';
      case 'PRODUCTION_OUTPUT':
        return 'chip-prod-output';
      case 'PRODUCTION_SHRINKAGE':
        return 'chip-prod-shrink';
      default:
        return '';
    }
  }

  viewSourceDocument(movement: InventoryMovement): void {
    const refId = movement.referenceId;
    const refType = movement.referenceType;
    if (!refId) return;

    switch (refType) {
      case 'ADJUSTMENT':
        this.router.navigate(['/inventario/ajustes']);
        break;
      case 'TRANSFER':
        this.router.navigate(['/inventario/traslados', refId]);
        break;
      case 'DISPOSAL':
        this.router.navigate(['/inventario/decomisos']);
        break;
      default:
        break;
    }
  }
}
