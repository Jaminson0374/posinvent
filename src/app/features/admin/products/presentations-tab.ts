import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormArray, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PresentationService } from '../../../core/services/presentation.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import {
  ProductPresentation,
  ProductPresentationRequest,
} from '../../../core/models/product-presentation.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-presentations-tab',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './presentations-tab.html',
  styleUrl: './presentations-tab.css',
})
export class PresentationsTabComponent {
  readonly productId = input.required<string>();
  readonly formArray = input<FormArray<FormGroup>>(null!);

  private readonly presentationService = inject(PresentationService);
  readonly uomService = inject(UnitOfMeasureService);
  private readonly fb = inject(FormBuilder);

  readonly units = computed(() => this.uomService.units.value() ?? []);

  readonly loading = signal(false);
  readonly editingIndex = signal<number | null>(null);
  readonly adding = signal(false);

  readonly displayedColumns = ['code', 'name', 'uom', 'factor', 'price', 'isDefault', 'actions'];

  constructor() {
    // loadPresentations() called from ngOnInit after inputs are available
  }

  ngOnInit(): void {
    if (this.productId()) {
      this.loadPresentations();
    }
  }

  loadPresentations(): void {
    this.loading.set(true);
    this.presentationService.list(this.productId()).subscribe({
      next: (data) => {
        this.populateFormArray(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private populateFormArray(presentations: ProductPresentation[]): void {
    this.formArray().clear({ emitEvent: false });
    for (const p of presentations) {
      this.formArray().push(this.createPresentationGroup(p), { emitEvent: false });
    }
  }

  private createPresentationGroup(p: ProductPresentation): FormGroup {
    return this.fb.group({
      id: [p.id],
      code: [p.code, [Validators.required, Validators.maxLength(20)]],
      name: [p.name, [Validators.required, Validators.maxLength(100)]],
      unitOfMeasureId: [p.unitOfMeasureId, Validators.required],
      conversionFactor: [p.conversionFactor, [Validators.required, Validators.min(0.0001)]],
      salePrice: [p.salePrice],
      isDefault: [p.isDefault],
    });
  }

  startAdd(): void {
    this.adding.set(true);
    this.editingIndex.set(null);
    const newGroup = this.fb.group({
      id: [null],
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      unitOfMeasureId: ['', Validators.required],
      conversionFactor: [1, [Validators.required, Validators.min(0.0001)]],
      salePrice: [null as number | null],
      isDefault: [false],
    });
    this.formArray().push(newGroup);
  }

  startEdit(index: number): void {
    this.adding.set(false);
    this.editingIndex.set(index);
  }

  cancelEdit(): void {
    if (this.adding()) {
      this.formArray().removeAt(this.formArray().length - 1, { emitEvent: false });
    }
    this.adding.set(false);
    this.editingIndex.set(null);
  }

  saveNew(): void {
    const addGroup = this.formArray().at(this.formArray().length - 1);
    if (addGroup.invalid) {
      addGroup.markAllAsTouched();
      return;
    }

    const req: ProductPresentationRequest = {
      code: addGroup.get('code')?.value,
      name: addGroup.get('name')?.value,
      unitOfMeasureId: addGroup.get('unitOfMeasureId')?.value,
      conversionFactor: addGroup.get('conversionFactor')?.value,
      salePrice: addGroup.get('salePrice')?.value ?? null,
      isDefault: addGroup.get('isDefault')?.value,
    };

    this.presentationService.create(this.productId(), req).subscribe({
      next: () => {
        this.adding.set(false);
        this.loadPresentations();
        Swal.fire({
          icon: 'success',
          title: 'Presentación creada',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo crear la presentación.',
        });
      },
    });
  }

  saveEdit(group: FormGroup): void {
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    const req: ProductPresentationRequest = {
      code: group.get('code')?.value,
      name: group.get('name')?.value,
      unitOfMeasureId: group.get('unitOfMeasureId')?.value,
      conversionFactor: group.get('conversionFactor')?.value,
      salePrice: group.get('salePrice')?.value ?? null,
      isDefault: group.get('isDefault')?.value,
    };

    this.presentationService
      .update(this.productId(), group.get('id')?.value as string, req)
      .subscribe({
        next: () => {
          this.editingIndex.set(null);
          this.loadPresentations();
          Swal.fire({
            icon: 'success',
            title: 'Presentación actualizada',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo actualizar.',
          });
        },
      });
  }

  deletePresentation(index: number): void {
    const group = this.formArray().at(index);
    const presentationId = group.get('id')?.value as string;
    const code = group.get('code')?.value;
    const name = group.get('name')?.value;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar presentación?',
      text: `Se eliminará "${code} - ${name}"`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        this.presentationService.delete(this.productId(), presentationId).subscribe({
          next: () => {
            this.loadPresentations();
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' });
          },
        });
      }
    });
  }

  setAsDefault(index: number): void {
    const group = this.formArray().at(index);
    const req: ProductPresentationRequest = {
      code: group.get('code')?.value,
      name: group.get('name')?.value,
      unitOfMeasureId: group.get('unitOfMeasureId')?.value,
      conversionFactor: group.get('conversionFactor')?.value,
      salePrice: group.get('salePrice')?.value ?? null,
      isDefault: true,
    };
    this.presentationService
      .update(this.productId(), group.get('id')?.value as string, req)
      .subscribe({
        next: () => {
          this.loadPresentations();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo marcar como predeterminada.',
          });
        },
      });
  }
}
