import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import {
  WAREHOUSE_TYPE_LABELS,
  WarehouseType,
} from '../../../../core/models/warehouse.model';

@Component({
  selector: 'app-warehouse-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './warehouse-form.html',
  styleUrl: './warehouse-form.css',
})
export class WarehouseFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(WarehouseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly warehouseId = signal<string | null>(null);

  readonly isEdit = computed(() => this.warehouseId() !== null);
  readonly pageTitle = computed(() => (this.isEdit() ? 'Editar bodega' : 'Nueva bodega'));

  readonly typeOptions: ReadonlyArray<{ value: WarehouseType; label: string }> = (
    Object.keys(WAREHOUSE_TYPE_LABELS) as WarehouseType[]
  ).map((value) => ({ value, label: WAREHOUSE_TYPE_LABELS[value] }));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    warehouseType: ['' as WarehouseType, Validators.required],
    location: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.warehouseId.set(id);
    this.loading.set(true);

    this.service.getById(id).subscribe({
      next: (warehouse) => {
        this.loading.set(false);
        this.form.patchValue({
          name: warehouse.name,
          warehouseType: warehouse.warehouseType,
          location: warehouse.location ?? '',
        });
      },
      error: () => {
        this.loading.set(false);
        const msg = 'Error al cargar la bodega.';
        this.error.set(msg);
        Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const editing = this.isEdit();
    this.saving.set(true);
    this.error.set(null);

    const request$ = editing
      ? this.service.update(this.warehouseId()!, v.name, v.warehouseType, v.location)
      : this.service.create(v.name, v.warehouseType, v.location);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.service.reload();
        Swal.fire({
          icon: 'success',
          title: editing ? 'Bodega actualizada' : 'Bodega creada',
          confirmButtonColor: '#15803d',
        }).then(() => this.router.navigate(['/inventario/bodegas']));
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const message =
          (err as { error?: { message?: string } })?.error?.message ??
          (editing ? 'Error al actualizar la bodega.' : 'Error al crear la bodega.');
        this.error.set(message);
        Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#ef4444' });
      },
    });
  }
}
