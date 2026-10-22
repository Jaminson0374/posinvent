import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { PaymentService } from '../../../../core/services/payment.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { SupplierInvoiceService } from '../../../../core/services/supplier-invoice.service';
import { QuickCreateSupplierDialogComponent } from '../../../inventario/products/dialogs/quick-create-supplier.dialog';
import type {
  ThirdParty,
  ThirdPartySupplierOption,
} from '../../../../core/models/third-party.model';
import type { SupplierInvoice } from '../../../../core/models/supplier-invoice.model';
import type { PaymentMethod, PaymentRequest } from '../../../../core/models/payment.model';

@Component({
  selector: 'app-pago-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDialogModule,
    MatCheckboxModule,
    MatCardModule,
    MatDividerModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './pago-form.html',
  styleUrl: './pago-form.css',
})
export class PagoFormComponent {
  private readonly paymentService = inject(PaymentService);
  private readonly invoiceService = inject(SupplierInvoiceService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);
  readonly loadingInvoices = signal(false);
  readonly error = signal<string | null>(null);

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = new FormGroup({
    supplierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    paymentDate: new FormControl(new Date(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    method: new FormControl<PaymentMethod>('TRANSFERENCIA', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reference: new FormControl('', { nonNullable: true }),
  });

  readonly methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'TARJETA', label: 'Tarjeta' },
  ];

  // ── Outstanding invoices ──────────────────────────────────────────
  readonly outstandingInvoices = signal<SupplierInvoice[]>([]);
  readonly selectedInvoiceIds = signal<Set<string>>(new Set());
  /** Applied amount per selected invoice, keyed by invoiceId. */
  readonly appliedAmounts = signal<Record<string, number>>({});

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.selectedInvoiceIds.set(new Set());
    this.loadOutstandingInvoices(ev.option.value);
  }

  openCreateSupplier(): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) return;
        this.thirdPartyService.reload();
        this.form.controls.supplierId.setValue(supplier.id);
        this.supplierDisplay.setValue(`${supplier.name} (${supplier.numIdentification})`, {
          emitEvent: false,
        });
        this.selectedInvoiceIds.set(new Set());
        this.loadOutstandingInvoices(supplier.id);
      });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    const status = tp.active ? '' : ' — inactivo';
    return `${fullName} (${tp.numIdentification})${status}`;
  }

  // ── Load outstanding invoices ─────────────────────────────────────
  private loadOutstandingInvoices(supplierId: string): void {
    this.loadingInvoices.set(true);
    this.invoiceService.supplierId.set(supplierId);
    this.invoiceService.status.set('RECONCILED');
    this.invoiceService.reload();

    // Use the facturas resource and subscribe to the value
    const check = () => {
      const data = this.invoiceService.facturas.value();
      if (data) {
        this.loadingInvoices.set(false);
        this.outstandingInvoices.set(data.content ?? []);
      } else if (this.invoiceService.facturas.isLoading()) {
        setTimeout(check, 200);
      } else {
        this.loadingInvoices.set(false);
        this.outstandingInvoices.set([]);
      }
    };
    check();
  }

  // ── Invoice selection ─────────────────────────────────────────────
  toggleInvoice(id: string): void {
    const current = new Set(this.selectedInvoiceIds());
    const amounts = { ...this.appliedAmounts() };
    if (current.has(id)) {
      current.delete(id);
      delete amounts[id];
    } else {
      current.add(id);
      const inv = this.outstandingInvoices().find((i) => i.id === id);
      amounts[id] = inv ? inv.total : 0;
    }
    this.selectedInvoiceIds.set(current);
    this.appliedAmounts.set(amounts);
  }

  getAppliedAmount(id: string): number {
    return this.appliedAmounts()[id] ?? 0;
  }

  setAppliedAmount(id: string, value: number): void {
    if (!this.selectedInvoiceIds().has(id)) return;
    const amounts = { ...this.appliedAmounts() };
    amounts[id] = Number.isFinite(value) ? value : 0;
    this.appliedAmounts.set(amounts);
  }

  onAppliedAmountInput(id: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.setAppliedAmount(id, value);
  }

  readonly selectedInvoices = computed(() => {
    const ids = this.selectedInvoiceIds();
    return this.outstandingInvoices().filter((inv) => ids.has(inv.id));
  });

  readonly selectedTotalReceived = computed(() => {
    return this.selectedInvoices().reduce((sum, inv) => sum + inv.total, 0);
  });

  readonly selectedCount = computed(() => this.selectedInvoiceIds().size);

  /** Sum of the applied amounts across the selected invoices. */
  readonly appliedTotal = computed(() => {
    const amounts = this.appliedAmounts();
    return this.selectedInvoices().reduce((sum, inv) => sum + (amounts[inv.id] ?? 0), 0);
  });

  /** True when the payment amount does not match the sum of applied amounts. */
  readonly appliedMismatch = computed(() => {
    if (this.selectedCount() === 0) return false;
    const amount = this.form.controls.amount.getRawValue() ?? 0;
    return Math.abs(amount - this.appliedTotal()) > 0.009;
  });

  readonly paymentExceedsInvoices = computed(() => {
    const amount = this.form.controls.amount.getRawValue() ?? 0;
    return amount > this.selectedTotalReceived() && this.selectedCount() > 0;
  });

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const selected = this.selectedInvoices();
    if (selected.length === 0) {
      this.error.set('Seleccioná al menos una factura para aplicar el pago.');
      return;
    }

    const raw = this.form.getRawValue();
    const toDateStr = (d: unknown): string => {
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d ?? '');
    };

    const applied = this.appliedAmounts();
    const invoicePayments = selected.map((inv) => ({
      invoiceId: inv.id,
      appliedAmount: applied[inv.id] ?? inv.total,
    }));

    if (invoicePayments.some((p) => p.appliedAmount < 0.01)) {
      this.error.set('Cada monto aplicado debe ser mayor o igual a 0.01.');
      return;
    }

    const amount = raw.amount ?? 0;
    const appliedTotal = invoicePayments.reduce((sum, p) => sum + p.appliedAmount, 0);
    if (Math.abs(amount - appliedTotal) > 0.009) {
      this.error.set(
        `La suma de los montos aplicados (${appliedTotal}) debe coincidir con el monto del pago (${amount}).`,
      );
      return;
    }

    const request: PaymentRequest = {
      supplierId: raw.supplierId,
      amount,
      paymentDate: toDateStr(raw.paymentDate),
      method: raw.method,
      reference: raw.reference || null,
      invoicePayments,
    };

    this.saving.set(true);
    this.error.set(null);

    this.paymentService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/compras/pagos']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al registrar el pago.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/compras/ordenes']);
  }
}
