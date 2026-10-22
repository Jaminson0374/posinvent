import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ThirdPartyCategoryService } from '../../../../core/services/third-party-category.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import {
  PersonType,
  ThirdParty,
  ThirdPartyRequest,
} from '../../../../core/models/third-party.model';
import { calculateNitDv } from '../../../admin/third-parties/utils/nit-dv.utils';

@Component({
  selector: 'app-quick-create-supplier-dialog',
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
    MatButtonToggleModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>person_add</mat-icon> Crear proveedor
      </h2>
      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Categoría *</mat-label>
            <mat-select formControlName="thirdPartyCategoryId">
              @for (category of supplierCategories(); track category.id) {
                <mat-option [value]="category.id">{{ category.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-button-toggle-group formControlName="personType" class="qcd-toggle-group">
            <mat-button-toggle value="JURIDICA">Jurídica</mat-button-toggle>
            <mat-button-toggle value="NATURAL">Natural</mat-button-toggle>
          </mat-button-toggle-group>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Tipo de identificación *</mat-label>
            <mat-select formControlName="identificationTypeId">
              @for (identificationType of identificationTypes(); track identificationType.id) {
                <mat-option [value]="identificationType.id">
                  {{ identificationType.code }} - {{ identificationType.name }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Identificación *</mat-label>
            <input matInput formControlName="numIdentification" maxlength="20" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>{{ isNatural() ? 'Nombres *' : 'Razón social *' }}</mat-label>
            <input matInput formControlName="name" maxlength="200" />
          </mat-form-field>

          @if (isNatural()) {
            <mat-form-field appearance="outline" class="qcd-field">
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="lastName" maxlength="200" />
            </mat-form-field>
          }
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
      .qcd-toggle-group {
        display: flex;
        margin-bottom: 16px;
      }
      .qcd-toggle-group .mat-button-toggle {
        flex: 1;
      }
      .qcd-error {
        color: #dc2626;
        font-size: 12px;
        margin: 4px 0 0;
      }
    `,
  ],
})
export class QuickCreateSupplierDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreateSupplierDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly categoryService = inject(ThirdPartyCategoryService);
  private readonly catalogService = inject(CatalogService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly supplierCategories = computed(() =>
    (this.categoryService.categories.value() ?? []).filter(
      (category) =>
        category.active && (category.baseType === 'SUPPLIER' || category.baseType === 'BOTH'),
    ),
  );
  readonly identificationTypes = computed(
    () => this.catalogService.identificationTypes.value() ?? [],
  );

  readonly form = this.fb.nonNullable.group({
    thirdPartyCategoryId: ['', Validators.required],
    personType: ['JURIDICA' as PersonType],
    identificationTypeId: ['', Validators.required],
    numIdentification: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    lastName: [''],
  });

  readonly isNatural = computed(() => this.form.controls.personType.value === 'NATURAL');

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const identificationType = this.identificationTypes().find(
      (entry) => entry.id === value.identificationTypeId,
    );

    const request: ThirdPartyRequest = {
      numIdentification: value.numIdentification,
      type: 'SUPPLIER',
      dv: identificationType?.requiresDv ? calculateNitDv(value.numIdentification) : null,
      identificationTypeId: value.identificationTypeId,
      thirdPartyCategoryId: value.thirdPartyCategoryId,
      personType: value.personType,
      name: value.name,
      lastName: value.lastName.trim() || null,
      commonName: null,
      phone: null,
      address: null,
      departmentId: null,
      cityId: null,
      email: null,
      website: null,
      creditDays: 30,
      creditLimit: 0,
      priceListId: null,
      entryDate: null,
      contactName: null,
      contactPhone: null,
      contactAddress: null,
      contactEmail: null,
      taxContactFirstName: null,
      taxContactLastName: null,
      taxEmail: null,
      billingPhone: null,
      taxRegime: 'ORDINARIO',
      taxResponsibilities: [],
      isGranContribuyente: false,
      isAutoretenedor: false,
      isAgenteRetencionIva: false,
      isRegimenSimple: false,
      otherTaxResp: false,
      cityCode: null,
      dianClassification: null,
      employeeData: null,
    };

    this.saving.set(true);
    this.error.set(null);

    this.thirdPartyService.create(request).subscribe({
      next: (supplier: ThirdParty) => {
        this.saving.set(false);
        this.thirdPartyService.reload();
        this.dialogRef.close(supplier);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          (err as { error?: { message?: string } })?.error?.message ??
            'Error al crear el proveedor.',
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
