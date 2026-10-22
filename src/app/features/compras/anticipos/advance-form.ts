import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AdvanceService } from '../../../core/services/advance.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import { QuickCreateSupplierDialogComponent } from '../../inventario/products/dialogs/quick-create-supplier.dialog';
import type { ThirdParty, ThirdPartySupplierOption } from '../../../core/models/third-party.model';
import type { AdvanceRequest } from '../../../core/models/advance.model';
import type { PaymentMethod } from '../../../core/models/payment.model';

@Component({
  selector: 'app-advance-form',
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
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './advance-form.html',
  styleUrl: './advance-form.css',
})
export class AdvanceFormComponent {
  private readonly advanceService = inject(AdvanceService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = new FormGroup({
    supplierId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
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
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'TARJETA', label: 'Tarjeta' },
  ];

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
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

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const toDateStr = (d: unknown): string => {
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d ?? '');
    };

    const request: AdvanceRequest = {
      supplierId: raw.supplierId,
      amount: raw.amount ?? 0,
      paymentDate: toDateStr(raw.paymentDate),
      method: raw.method,
      reference: raw.reference || undefined,
      notes: raw.notes || undefined,
    };

    this.saving.set(true);
    this.error.set(null);

    this.advanceService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/compras/anticipos']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al registrar el anticipo.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/compras/anticipos']);
  }
}
