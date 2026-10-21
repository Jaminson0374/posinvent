import { Component, DestroyRef, computed, inject, OnInit, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe, DecimalPipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { SaleService } from '../../../core/services/sale.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { SalesDocumentType, SalesDocumentStatus } from '../../../core/models/sale.model';

@Component({
  selector: 'app-sales-document-list',
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
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './sales-document-list.html',
  styleUrl: './sales-document-list.css',
})
export class SalesDocumentListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly service = inject(SaleService);

  /** CONTADOR is read-only: creation is not offered. Row/detail actions stay available. */
  readonly isContador = computed(() => this.auth.userRole() === 'CONTADOR');

  readonly displayedColumns = [
    'index',
    'documentNumber',
    'clientName',
    'type',
    'status',
    'totalAmount',
    'createdAt',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly typeOptions: { value: SalesDocumentType | null; label: string }[] = [
    { value: null, label: 'Todos los tipos' },
    { value: 'QUOTE', label: 'Cotización' },
    { value: 'ORDER', label: 'Pedido' },
    { value: 'INVOICE', label: 'Factura' },
  ];

  readonly statusOptions: { value: SalesDocumentStatus | null; label: string }[] = [
    { value: null, label: 'Todos los estados' },
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'SENT', label: 'Enviado' },
    { value: 'ACCEPTED', label: 'Aceptado' },
    { value: 'REJECTED', label: 'Rechazado' },
    { value: 'EXPIRED', label: 'Expirado' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'INVOICED', label: 'Facturado' },
    { value: 'ISSUED', label: 'Emitido' },
    { value: 'PAID', label: 'Pagado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  readonly typeLabels: Record<string, string> = {
    QUOTE: 'Cotización',
    ORDER: 'Pedido',
    INVOICE: 'Factura',
    CREDIT_NOTE: 'Nota crédito',
    DEBIT_NOTE: 'Nota débito',
  };

  readonly statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviado',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
    EXPIRED: 'Expirado',
    CONFIRMED: 'Confirmado',
    PARTIALLY_INVOICED: 'Parc. Facturado',
    INVOICED: 'Facturado',
    ISSUED: 'Emitido',
    PAID: 'Pagado',
    CANCELLED: 'Cancelado',
  };

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.getRawValue()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        untracked(() => this.service.page.set(0));
        this.service.query.set(value.trim());
      });
  }

  onTypeChange(value: SalesDocumentType | null): void {
    untracked(() => this.service.page.set(0));
    this.service.typeFilter.set(value ?? '');
  }

  onStatusChange(value: SalesDocumentStatus | null): void {
    untracked(() => this.service.page.set(0));
    this.service.statusFilter.set(value ?? '');
  }

  openNew(): void {
    this.router.navigate(['documentos', 'nuevo'], { relativeTo: this.route.parent });
  }

  openDetail(id: string): void {
    this.router.navigate(['documentos', id], { relativeTo: this.route.parent });
  }

  getTypeLabel(type: string): string {
    return this.typeLabels[type] ?? type;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  getStatusClass(status: string): string {
    return `chip-status-${status.toLowerCase()}`;
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }
  }
}
