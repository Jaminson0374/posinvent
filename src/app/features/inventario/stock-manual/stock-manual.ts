import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductSearchComponent } from '../../shared/product-search';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { BatchPickerComponent } from '../../shared/batch-picker';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stock-manual',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ProductSearchComponent,
    WarehousePickerComponent,
    BatchPickerComponent,
  ],
  templateUrl: './stock-manual.html',
})
export class StockManualComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly saving = signal(false);

  readonly entryForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    batchId: [''],
    warehouseId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.001)]],
    unitCost: [0, Validators.min(0)],
    notes: [''],
  });

  readonly exitForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    batchId: [''],
    warehouseId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.001)]],
    reason: ['', Validators.required],
  });

  onEntryProductSelected(evt: { id: string }): void {
    this.entryForm.controls.productId.setValue(evt.id);
  }
  onEntryWarehouseSelected(id: string): void {
    this.entryForm.controls.warehouseId.setValue(id);
  }
  onEntryBatchSelected(id: string | null): void {
    this.entryForm.controls.batchId.setValue(id ?? '');
  }

  onExitProductSelected(evt: { id: string }): void {
    this.exitForm.controls.productId.setValue(evt.id);
  }
  onExitWarehouseSelected(id: string): void {
    this.exitForm.controls.warehouseId.setValue(id);
  }
  onExitBatchSelected(id: string | null): void {
    this.exitForm.controls.batchId.setValue(id ?? '');
  }

  async entrySubmit(): Promise<void> {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.entryForm.getRawValue();
      await firstValueFrom(
        this.http.post('/api/v1/stock/entry', {
          productId: v.productId,
          batchId: v.batchId.trim() || null,
          warehouseId: v.warehouseId,
          quantity: v.quantity,
          unitCost: v.unitCost || 0,
          notes: v.notes,
        }),
      );
      this.saving.set(false);
      this.entryForm.reset({ quantity: 0, unitCost: 0 });
      Swal.fire({ icon: 'success', title: 'Entrada registrada', confirmButtonColor: '#15803d' });
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message ?? 'Error',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  async exitSubmit(): Promise<void> {
    if (this.exitForm.invalid) {
      this.exitForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.exitForm.getRawValue();
      await firstValueFrom(
        this.http.post('/api/v1/stock/exit', {
          productId: v.productId,
          batchId: v.batchId.trim() || null,
          warehouseId: v.warehouseId,
          quantity: v.quantity,
          reason: v.reason,
        }),
      );
      this.saving.set(false);
      this.exitForm.reset({ quantity: 0 });
      Swal.fire({ icon: 'success', title: 'Salida registrada', confirmButtonColor: '#15803d' });
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message ?? 'Error',
        confirmButtonColor: '#ef4444',
      });
    }
  }
}
