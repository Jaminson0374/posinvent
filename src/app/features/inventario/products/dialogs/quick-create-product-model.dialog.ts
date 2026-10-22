import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ProductModelService } from '../../../../core/services/product-model.service';
import { ProductModel } from '../../../../core/models/product-catalog.model';

export interface QuickCreateProductModelData { initialName: string; brandId: string | null }

@Component({
  selector: 'app-quick-create-product-model-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>add_circle</mat-icon> Crear modelo
      </h2>
      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
        </form>
        @if (data.brandId) {
          <p class="qcd-hint">Se asociará a la marca seleccionada.</p>
        }
        @if (error()) { <p class="qcd-error">{{ error() }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="close()" [disabled]="saving()">Cancelar</button>
        <button mat-flat-button color="primary" (click)="submit()" [disabled]="saving() || form.invalid">
          @if (saving()) { <mat-spinner diameter="16" /> } @else { Crear }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`.qcd-title{display:flex;align-items:center;gap:8px;cursor:move;font-size:15px;user-select:none}
    .qcd-content{min-width:340px;padding-top:8px!important}.qcd-field{width:100%}
    .qcd-error{color:#dc2626;font-size:12px;margin:4px 0 0}
    .qcd-hint{color:#64748b;font-size:12px;margin:4px 0 0}`],
})
export class QuickCreateProductModelDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateProductModelDialogComponent>);
  readonly data              = inject<QuickCreateProductModelData>(MAT_DIALOG_DATA);
  private readonly service   = inject(ProductModelService);
  private readonly fb        = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  readonly form = this.fb.group({
    name: [this.data?.initialName ?? '', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.service.create(this.form.value.name!, this.data.brandId).subscribe({
      next: (m: ProductModel) => {
        this.saving.set(false);
        this.service.reload();
        this.dialogRef.close(m);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el modelo.');
      },
    });
  }

  close(): void { this.dialogRef.close(); }
}
