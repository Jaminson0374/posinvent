import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { UnitOfMeasure } from '../../../../core/models/product-catalog.model';

export interface QuickCreateUomData { initialName: string }

@Component({
  selector: 'app-quick-create-uom-dialog',
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
        <mat-icon>add_circle</mat-icon> Crear unidad de medida
      </h2>
      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Código *</mat-label>
            <input matInput formControlName="code" maxlength="20" placeholder="KG, UND, L..." />
          </mat-form-field>
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" [value]="data.initialName" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Unidad base</mat-label>
            <input matInput formControlName="baseUnit" placeholder="kg, unit, l, m..." />
            <mat-hint>Opcional — para conversiones futuras</mat-hint>
          </mat-form-field>
        </form>
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
    .qcd-content{min-width:360px;padding-top:8px!important}.qcd-field{width:100%}
    .qcd-error{color:#dc2626;font-size:12px;margin:4px 0 0}`],
})
export class QuickCreateUomDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateUomDialogComponent>);
  readonly data              = inject<QuickCreateUomData>(MAT_DIALOG_DATA);
  private readonly service   = inject(UnitOfMeasureService);
  private readonly fb        = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  readonly form = this.fb.group({
    code:     ['', [Validators.required, Validators.maxLength(20)]],
    name:     [this.data?.initialName ?? '', Validators.required],
    baseUnit: [''],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.value;
    this.service.create(v.code!, v.name!, v.baseUnit || undefined).subscribe({
      next: (u: UnitOfMeasure) => {
        this.saving.set(false);
        this.service.reload();
        this.dialogRef.close(u);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear la unidad de medida.');
      },
    });
  }

  close(): void { this.dialogRef.close(); }
}
