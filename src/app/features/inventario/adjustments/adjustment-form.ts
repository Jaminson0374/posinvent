import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdjustmentService } from '../../../core/services/adjustment.service';
import { AdjustmentType } from '../../../core/models/adjustment.model';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { ProductSearchComponent } from '../../shared/product-search';
import { BatchPickerComponent } from '../../shared/batch-picker';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-adjustment-form',
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
  templateUrl: './adjustment-form.html',
  styleUrl: './adjustment-form.css',
})
export class AdjustmentFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdjustmentService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeOptions: ReadonlyArray<{ value: AdjustmentType; label: string }> = [
    { value: 'PHYSICAL_COUNT', label: 'Conteo físico' },
    { value: 'DAMAGE', label: 'Daño' },
    { value: 'EXPIRATION', label: 'Vencimiento' },
    { value: 'THEFT', label: 'Hurto' },
    { value: 'OTHER', label: 'Otro' },
  ];

  readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    batchId: [''],
    warehouseId: ['', Validators.required],
    adjustmentType: ['PHYSICAL_COUNT' as string, Validators.required],
    quantityAfter: [0, [Validators.required, Validators.min(0)]],
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
        adjustmentType: v.adjustmentType as AdjustmentType,
        quantityAfter: v.quantityAfter,
        reason: v.reason,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Ajuste creado',
            confirmButtonColor: '#15803d',
          }).then(() => this.router.navigate(['/inventario/ajustes']));
          this.form.reset({ adjustmentType: 'PHYSICAL_COUNT', quantityAfter: 0 });
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el ajuste.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
  }
}
