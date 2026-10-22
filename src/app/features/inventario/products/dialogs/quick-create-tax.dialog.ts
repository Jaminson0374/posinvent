import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CatalogService } from '../../../../core/services/catalog.service';
import { Tax } from '../../../../core/models/tax-catalog.model';

export interface QuickCreateTaxData {
  initialDescription?: string;
}

@Component({
  selector: 'app-quick-create-tax-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="qcd-title">
      <mat-icon>add_circle</mat-icon> Crear impuesto
    </h2>
    <mat-dialog-content class="qcd-content">
      <form [formGroup]="form" class="qcd-grid">
        <mat-form-field appearance="outline">
          <mat-label>Código *</mat-label>
          <input matInput formControlName="code" maxlength="50" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Descripción *</mat-label>
          <input matInput formControlName="description" maxlength="100" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Porcentaje *</mat-label>
          <input matInput type="number" formControlName="percentage" min="0" max="100" />
          <span matSuffix>%</span>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Código DIAN</mat-label>
          <input matInput formControlName="dianCode" maxlength="2" placeholder="01" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ID Proveedor Tecnológico</mat-label>
          <input matInput formControlName="providerExternalId" maxlength="50" placeholder="13156" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="qcd-span-2">
          <mat-label>Observación</mat-label>
          <textarea matInput formControlName="observation" rows="2" maxlength="500"></textarea>
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
  `,
  styles: [`
    .qcd-title { display:flex; align-items:center; gap:8px; font-size:15px; }
    .qcd-content { min-width:420px; padding-top:8px !important; }
    .qcd-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 12px; }
    .qcd-grid mat-form-field { width:100%; }
    .qcd-span-2 { grid-column:1 / -1; }
    .qcd-error { color:#dc2626; font-size:12px; margin:4px 0 0; }
  `],
})
export class QuickCreateTaxDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateTaxDialogComponent>);
  private readonly data = inject<QuickCreateTaxData>(MAT_DIALOG_DATA);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    description: [this.data?.initialDescription ?? '', [Validators.required, Validators.maxLength(100)]],
    percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    dianCode: ['', [Validators.maxLength(2)]],
    providerExternalId: ['', [Validators.maxLength(50)]],
    observation: ['', [Validators.maxLength(500)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.catalog.createTax({
      code: value.code!.trim().toUpperCase(),
      description: value.description!.trim(),
      percentage: Number(value.percentage),
      dianCode: value.dianCode?.trim() || null,
      providerExternalId: value.providerExternalId?.trim() || null,
      observation: value.observation?.trim() || null,
      sortOrder: 0,
      active: true,
    }).subscribe({
      next: (tax: Tax) => {
        this.saving.set(false);
        this.catalog.reloadTaxes();
        this.dialogRef.close(tax);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el impuesto.');
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
