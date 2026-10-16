import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import {
  PurchaseHistoryEntry,
  PurchaseHistoryService,
} from '../../../../core/services/purchase-history.service';
import { PageResponse } from '../../../../core/models/page.model';
import type { ThirdPartySupplierOption } from '../../../../core/models/third-party.model';

@Component({
  selector: 'app-historial-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './historial-list.html',
  styleUrl: './historial-list.css',
})
export class HistorialListComponent implements OnInit {
  private readonly purchaseHistoryService = inject(PurchaseHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly thirdPartyService = inject(ThirdPartyService);

  readonly loading = signal(false);
  readonly data = signal<PageResponse<PurchaseHistoryEntry> | null>(null);
  readonly error = signal<string | null>(null);

  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = this.thirdPartyService.supplierOptions;

  readonly filterForm = new FormGroup({
    from: new FormControl<Date | null>(null),
    to: new FormControl<Date | null>(null),
    supplierId: new FormControl<string>(''),
  });

  readonly displayedColumns = [
    'eventType',
    'documentId',
    'supplierName',
    'description',
    'status',
    'amount',
    'eventTimestamp',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly page = signal(0);
  readonly pageSize = signal(20);

  ngOnInit(): void {
    this.loadData();
  }

  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    this.filterForm.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncSupplierDisplay(): void {
    const id = this.filterForm.controls.supplierId.getRawValue();
    const all = this.suppliers.value() ?? [];
    const s = all.find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    return `${fullName} (${tp.numIdentification})`;
  }

  clearSupplier(): void {
    this.filterForm.controls.supplierId.setValue('');
    this.supplierDisplay.setValue('');
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filterForm.getRawValue();

    this.purchaseHistoryService
      .list({
        from: raw.from ? raw.from.toISOString().split('T')[0] : null,
        to: raw.to ? raw.to.toISOString().split('T')[0] : null,
        supplierId: raw.supplierId || null,
        page: this.page(),
        size: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.data.set(response);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar el historial de compras.');
        },
      });
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.pageSize()) {
      this.pageSize.set(ev.pageSize);
      this.page.set(0);
    } else {
      this.page.set(ev.pageIndex);
    }
    this.loadData();
  }
}
