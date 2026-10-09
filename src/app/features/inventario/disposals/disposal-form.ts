import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DisposalService } from '../../../core/services/disposal.service';
import type { DisposalType } from '../../../core/models/disposal.model';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { ProductSearchComponent } from '../../shared/product-search';
import { BatchPickerComponent } from '../../shared/batch-picker';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-disposal-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    WarehousePickerComponent,
    ProductSearchComponent,
    BatchPickerComponent,
  ],
  templateUrl: './disposal-form.html',
  styles: [
    '.df-page{max-width:800px;margin:0 auto;padding:1rem} .df-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .df-form{display:flex;flex-direction:column;gap:1rem} .df-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem} .df-error{color:#ef4444;font-size:.875rem} .df-actions{display:flex;gap:.5rem;justify-content:flex-end}',
  ],
})
export class DisposalFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DisposalService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeOptions: ReadonlyArray<{ value: DisposalType; label: string }> = [
    { value: 'SANITARIO', label: 'Sanitario' },
    { value: 'RESIDUO_VENDIBLE', label: 'Residuo vendible' },
    { value: 'MERMA_PROCESO', label: 'Merma de proceso' },
  ];

  readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    batchId: [''],
    warehouseId: ['', Validators.required],
    disposalType: ['SANITARIO' as string, Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    reason: ['', Validators.required],
  });

  onProductSelected(evt: { id: string; name: string; code: string }): void {
    this.form.controls.productId.setValue(evt.id);
  }

  onWarehouseSelected(id: string): void {
    this.form.controls.warehouseId.setValue(id);
  }

  onBatchSelected(id: string | null): void {
    this.form.controls.batchId.setValue(id ?? '');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.service
      .create({
        productId: v.productId,
        batchId: v.batchId.trim() || null,
        warehouseId: v.warehouseId,
        disposalType: v.disposalType as DisposalType,
        quantity: v.quantity,
        reason: v.reason,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({ icon: 'success', title: 'Decomiso creado', confirmButtonColor: '#15803d' });
          this.form.reset({ disposalType: 'SANITARIO', quantity: 1 });
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el decomiso.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
  }
}
