import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TransferService } from '../../../core/services/transfer.service';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { ProductSearchComponent } from '../../shared/product-search';
import { BatchPickerComponent } from '../../shared/batch-picker';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    WarehousePickerComponent,
    ProductSearchComponent,
    BatchPickerComponent,
  ],
  templateUrl: './transfer-form.html',
  styles: [
    '.tf-page{max-width:800px;margin:0 auto;padding:1rem} .tf-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .tf-form{display:flex;flex-direction:column;gap:1rem} .tf-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem} .tf-grid-full{grid-column:1/-1} .tf-item-group{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;margin-bottom:.5rem} .tf-item-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;font-weight:500;font-size:.9rem;color:#475569} .tf-error{color:#ef4444;font-size:.875rem} .tf-actions{display:flex;gap:.5rem;justify-content:flex-end}',
  ],
})
export class TransferFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TransferService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    sourceWarehouseId: ['', Validators.required],
    targetWarehouseId: ['', Validators.required],
    notes: [''],
    items: this.fb.array([this.createItem()]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  createItem() {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      batchId: [''],
      quantity: [1, [Validators.required, Validators.min(0.001)]],
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  onSourceWarehouse(id: string): void {
    this.form.controls.sourceWarehouseId.setValue(id);
  }

  onTargetWarehouse(id: string): void {
    this.form.controls.targetWarehouseId.setValue(id);
  }

  onProductSelected(index: number, evt: { id: string; name: string; code: string }): void {
    this.items.at(index).get('productId')?.setValue(evt.id);
  }

  onBatchSelected(index: number, id: string | null): void {
    this.items
      .at(index)
      .get('batchId')
      ?.setValue(id ?? '');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    const items = v.items.map((i) => ({
      productId: i.productId,
      batchId: i.batchId.trim() || null,
      quantity: i.quantity,
    }));

    this.service
      .create({
        sourceWarehouseId: v.sourceWarehouseId,
        targetWarehouseId: v.targetWarehouseId,
        notes: v.notes.trim() || undefined,
        items,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({ icon: 'success', title: 'Traslado creado', confirmButtonColor: '#15803d' });
          this.form.reset();
          this.items.clear();
          this.items.push(this.createItem());
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el traslado.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
  }
}
