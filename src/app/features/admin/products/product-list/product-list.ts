import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { PageResponse } from '../../../../core/models/page.model';
import { Product } from '../../../../core/models/product.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ProductService } from '../../../../core/services/product.service';

type ProductListFilter = 'exempt' | 'active' | 'inactive' | 'no-stock' | 'below-min-stock';

function spanishPaginatorIntl(): MatPaginatorIntl {
  const paginatorIntl = new MatPaginatorIntl();
  paginatorIntl.itemsPerPageLabel = 'Registros por página:';
  paginatorIntl.nextPageLabel = 'Página siguiente';
  paginatorIntl.previousPageLabel = 'Página anterior';
  paginatorIntl.firstPageLabel = 'Primera página';
  paginatorIntl.lastPageLabel = 'Última página';
  paginatorIntl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0 || pageSize === 0) {
      return `Mostrando 0 de ${length} registros`;
    }

    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return `Mostrando ${startIndex + 1} a ${endIndex} de ${length} registros`;
  };
  return paginatorIntl;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  providers: [{ provide: MatPaginatorIntl, useFactory: spanishPaginatorIntl }],
})
export class ProductListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(ProductService);

  readonly displayedColumns = [
    'index',
    'productCode',
    'barcode',
    'totalStock',
    'salePrice',
    'taxType',
    'active',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly filterControl = new FormControl<ProductListFilter[]>([], { nonNullable: true });
  readonly filterPanelOpen = signal(false);
  readonly viewMode = signal<'list' | 'card'>('list');
  readonly filterOptions: ReadonlyArray<{ value: ProductListFilter; label: string }> = [
    { value: 'exempt', label: 'Exentos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'no-stock', label: 'Sin stock' },
    { value: 'below-min-stock', label: 'Por debajo del stock' },
  ];
  readonly selectedFilters = signal<ProductListFilter[]>([]);

  // ── Full-dataset filtering (PR 5) ──
  readonly fullDataset = signal<Product[]>([]);
  readonly searchText = signal('');

  /** Full filtered dataset — text AND status filters applied to ALL products. */
  readonly filteredRows = computed(() => {
    const all = this.fullDataset();
    const text = this.searchText().toLowerCase();
    const filters = this.selectedFilters();

    if (!text && filters.length === 0) return all;

    return all.filter((product) => {
      if (text) {
        const matchesText =
          product.productCode?.toLowerCase().includes(text) ||
          product.barcode?.toLowerCase().includes(text) ||
          product.name?.toLowerCase().includes(text);
        if (!matchesText) return false;
      }
      if (filters.length > 0) {
        return filters.every((f) => this.matchesFilter(product, f));
      }
      return true;
    });
  });

  /** Paginated PageResponse, client-side from filteredRows. */
  readonly data = computed<PageResponse<Product> | null>(() => {
    const filtered = this.filteredRows();
    const page = this.service.page();
    const size = this.service.pageSize();
    const start = page * size;
    const total = filtered.length;
    const totalPages = size > 0 ? Math.ceil(total / size) : 0;

    return {
      content: filtered.slice(start, start + size),
      page,
      size,
      totalElements: total,
      totalPages,
      last: page + 1 >= totalPages,
    };
  });

  readonly summaryCards = computed(() => {
    const rows = this.filteredRows();
    const total = rows.length;
    const active = rows.filter((product) => product.active).length;
    const lowStock = rows.filter((product) => product.totalStock <= product.minStock).length;
    const inventoryValue = rows.reduce(
      (sum, product) => sum + product.costPrice * (product.totalStock ?? 0),
      0,
    );

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const lowStockPercent = rows.length > 0 ? Math.round((lowStock / rows.length) * 100) : 0;

    const currency = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });

    return [
      {
        icon: 'inventory_2',
        label: 'Total artículos',
        value: `${total}`,
        caption: 'registros',
        tone: 'blue',
      },
      {
        icon: 'check_circle',
        label: 'Activos',
        value: `${active}`,
        caption: `${activePercent}% del total`,
        tone: 'green',
      },
      {
        icon: 'warning',
        label: 'Bajo stock',
        value: `${lowStock}`,
        caption: `${lowStockPercent}% del total`,
        tone: 'orange',
      },
      {
        icon: 'payments',
        label: 'Valor inventario',
        value: currency.format(inventoryValue),
        caption: 'Total existencia',
        tone: 'violet',
      },
    ];
  });

  selectedFilterLabels(): string[] {
    const selectedFilters = new Set(this.selectedFilters());
    return this.filterOptions
      .filter((option) => selectedFilters.has(option.value))
      .map((option) => option.label);
  }

  toggleFilterPanel(): void {
    this.filterPanelOpen.update((open) => !open);
  }

  closeFilterPanel(): void {
    this.filterPanelOpen.set(false);
  }

  toggleFilterValue(value: ProductListFilter): void {
    const next = new Set(this.selectedFilters());
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    this.selectedFilters.set(Array.from(next));
    this.filterControl.setValue(this.selectedFilters(), { emitEvent: false });
  }

  setViewMode(mode: 'list' | 'card'): void {
    this.viewMode.set(mode);
  }

  ngOnInit(): void {
    this.loadProducts();

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.getRawValue()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.searchText.set(value.trim());
        this.service.page.set(0);
      });

    this.filterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => {
        this.selectedFilters.set(filters ?? []);
        this.service.page.set(0);
      });
  }

  /** Fetch the FULL product dataset for client-side filtering. */
  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .search('', 0, 99999)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.fullDataset.set(page.content);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error cargando artículos. Intentá de nuevo.');
          this.fullDataset.set([]);
        },
      });
  }

  private matchesFilter(product: Product, filter: ProductListFilter): boolean {
    switch (filter) {
      case 'exempt':
        return product.taxType === 'EXENTO';
      case 'active':
        return product.active;
      case 'inactive':
        return !product.active;
      case 'no-stock':
        return product.initialStock <= 0;
      case 'below-min-stock':
        return product.initialStock < product.minStock;
      default:
        return true;
    }
  }

  taxLabel(type: string): string {
    switch (type) {
      case 'IVA_5':
        return 'IVA 5%';
      case 'IVA_8':
        return 'IVA 8%';
      case 'IVA_19':
        return 'IVA 19%';
      default:
        return 'Exento';
    }
  }

  taxClass(type: string): string {
    return type === 'EXENTO' ? 'chip-tax-exento' : 'chip-tax';
  }

  stockClass(product: Product): string {
    const stock = product.totalStock ?? 0;
    if (stock <= 0) return 'stock-zero';
    if (stock < product.minStock) return 'stock-low';
    if (stock <= product.minStock * 1.5) return 'stock-warn';
    return 'stock-ok';
  }

  getProductThumbnail(product: Product): string | null {
    return product.images?.[0]?.imageUrl ?? null;
  }

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  openEdit(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  /** Client-side pagination — updates page/size, no backend call. */
  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }
    // `data` computed recalculates automatically — no backend call needed.
  }
}
