import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { WarehouseLocation } from '../../../../core/models/product-catalog.model';
import { WarehouseLocationService } from '../../../../core/services/warehouse-location.service';

export interface QuickCreateWarehouseLocationData {
  initialName: string;
  warehouseId: string;
}

@Component({
  selector: 'app-quick-create-warehouse-location-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>pin_drop</mat-icon> Crear ubicación
      </h2>
      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
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
export class QuickCreateWarehouseLocationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateWarehouseLocationDialogComponent>);
  readonly data = inject<QuickCreateWarehouseLocationData>(MAT_DIALOG_DATA);
  private readonly service = inject(WarehouseLocationService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.initialName ?? '', Validators.required],
    description: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.service.create(this.data.warehouseId, name, description ?? undefined).subscribe({
      next: (location: WarehouseLocation) => {
        this.saving.set(false);
        this.dialogRef.close(location);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          (err as { error?: { message?: string } })?.error?.message ??
            'Error al crear la ubicación.',
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
