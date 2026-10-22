import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  Warehouse,
  WAREHOUSE_TYPE_LABELS,
  WarehouseType,
} from '../../../../core/models/warehouse.model';
import { WarehouseService } from '../../../../core/services/warehouse.service';

export interface QuickCreateWarehouseData {
  initialName: string;
}

@Component({
  selector: 'app-quick-create-warehouse-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>add_business</mat-icon> Crear bodega
      </h2>
      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Tipo de bodega *</mat-label>
            <mat-select formControlName="warehouseType">
              @for (type of warehouseTypes; track type) {
                <mat-option [value]="type">{{ typeLabels[type] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Ubicación</mat-label>
            <input matInput formControlName="location" placeholder="Opcional" />
          </mat-form-field>
        </form>
        @if (error()) {
          <p class="qcd-error">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="close()" [disabled]="saving()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          (click)="submit()"
          [disabled]="saving() || form.invalid"
        >
          @if (saving()) {
            <mat-spinner diameter="16" />
          } @else {
            Crear
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .qcd-title {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: move;
        font-size: 15px;
        user-select: none;
      }
      .qcd-content {
        min-width: 360px;
        padding-top: 8px !important;
      }
      .qcd-field {
        width: 100%;
      }
      .qcd-error {
        color: #dc2626;
        font-size: 12px;
        margin: 4px 0 0;
      }
    `,
  ],
})
export class QuickCreateWarehouseDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateWarehouseDialogComponent>);
  readonly data = inject<QuickCreateWarehouseData>(MAT_DIALOG_DATA);
  private readonly service = inject(WarehouseService);
  private readonly fb = inject(FormBuilder);

  readonly typeLabels = WAREHOUSE_TYPE_LABELS;
  readonly warehouseTypes = Object.keys(WAREHOUSE_TYPE_LABELS) as WarehouseType[];
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.initialName ?? '', Validators.required],
    warehouseType: ['GENERAL' as WarehouseType, Validators.required],
    location: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, warehouseType, location } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.service.create(name, warehouseType, location ?? undefined).subscribe({
      next: (warehouse: Warehouse) => {
        this.saving.set(false);
        this.service.reload();
        this.dialogRef.close(warehouse);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          (err as { error?: { message?: string } })?.error?.message ?? 'Error al crear la bodega.',
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
