import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { FormulaService } from '../../../core/services/formula.service';
import { ProductService } from '../../../core/services/product.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import { ProductFormula } from '../../../core/models/product-formula.model';
import { Product } from '../../../core/models/product.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-formula-tab',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './formula-tab.html',
  styleUrl: './formula-tab.css',
})
export class FormulaTabComponent {
  @Input({ required: true }) productId!: string;
  @Input() formArray: FormArray<FormGroup> = null!;

  private readonly formulaService = inject(FormulaService);
  readonly productService = inject(ProductService);
  readonly uomService = inject(UnitOfMeasureService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly units = computed(() => this.uomService.units.value() ?? []);

  readonly loading = signal(false);
  readonly adding = signal(false);
  readonly editingIndex = signal<number | null>(null);

  // Name resolution: componentProductId → product name
  readonly componentNames = signal<Map<string, string>>(new Map());

  // Search for components (filter out the parent product)
  readonly componentSearch = signal('');
  readonly componentResults = signal<Product[]>([]);
  readonly componentSearchLoading = signal(false);

  constructor() {
    // loadFormulas() called from ngOnInit after inputs are available
  }

  ngOnInit(): void {
    if (this.productId) {
      this.loadFormulas();
    }
  }

  loadFormulas(): void {
    this.loading.set(true);
    this.formulaService.list(this.productId).subscribe({
      next: (data) => {
        this.populateFormArray(data);
        this.loading.set(false);
        this.resolveComponentNames(data);
      },
      error: () => this.loading.set(false),
    });
  }

  private populateFormArray(formulas: ProductFormula[]): void {
    this.formArray.clear({ emitEvent: false });
    for (const f of formulas) {
      this.formArray.push(this.createFormulaGroup(f), { emitEvent: false });
    }
  }

  private createFormulaGroup(f: ProductFormula): FormGroup {
    return this.fb.group({
      id: [f.id],
      componentProductId: [f.componentProductId],
      quantity: [f.quantity, [Validators.required, Validators.min(0.0001)]],
      unitOfMeasureId: [f.unitOfMeasureId],
      sequenceNumber: [f.sequenceNumber],
      notes: [f.notes ?? null],
    });
  }

  private resolveComponentNames(formulas: ProductFormula[]): void {
    const uniqueIds = [...new Set(formulas.map((f) => f.componentProductId))];
    for (const id of uniqueIds) {
      if (this.componentNames().has(id)) continue;
      this.productService.getById(id).subscribe({
        next: (product) => {
          this.componentNames.update((m) => new Map(m).set(id, product.name));
        },
      });
    }
  }

  searchComponents(): void {
    const q = this.componentSearch().trim();
    if (!q) {
      this.componentResults.set([]);
      return;
    }
    this.componentSearchLoading.set(true);
    this.productService.search(q).subscribe({
      next: (page) => {
        this.componentResults.set(page.content.filter((p) => p.id !== this.productId));
        this.componentSearchLoading.set(false);
      },
      error: () => this.componentSearchLoading.set(false),
    });
  }

  startAdd(): void {
    this.adding.set(true);
    this.editingIndex.set(null);
    this.componentSearch.set('');
    this.componentResults.set([]);
    // Push a blank FormGroup for the new row
    const newGroup = this.fb.group({
      id: [null],
      componentProductId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      unitOfMeasureId: [null],
      sequenceNumber: [this.formArray.length],
      notes: [''],
    });
    this.formArray.push(newGroup);
  }

  startEdit(index: number): void {
    this.adding.set(false);
    this.editingIndex.set(index);
  }

  cancelEdit(): void {
    if (this.adding()) {
      // Remove the temporary add row
      this.formArray.removeAt(this.formArray.length - 1, { emitEvent: false });
    }
    this.adding.set(false);
    this.editingIndex.set(null);
  }

  selectComponent(product: Product): void {
    // Set componentProductId on the add FormGroup (last in array)
    const addGroup = this.formArray.at(this.formArray.length - 1);
    addGroup.get('componentProductId')?.setValue(product.id);
    this.componentSearch.set(product.name);
    this.componentResults.set([]);
  }

  saveNew(): void {
    const addGroup = this.formArray.at(this.formArray.length - 1);
    const componentProductId = addGroup.get('componentProductId')?.value as string;
    const quantity = addGroup.get('quantity')?.value as number;
    if (!componentProductId || quantity <= 0) return;

    this.formulaService
      .add(this.productId, {
        componentProductId,
        quantity,
        unitOfMeasureId: addGroup.get('unitOfMeasureId')?.value ?? null,
        sequenceNumber: addGroup.get('sequenceNumber')?.value ?? 0,
        notes: addGroup.get('notes')?.value || null,
      })
      .subscribe({
        next: () => {
          this.adding.set(false);
          this.loadFormulas();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo agregar.',
          }),
      });
  }

  saveEdit(group: FormGroup): void {
    this.formulaService
      .update(this.productId, group.get('id')?.value as string, {
        quantity: group.get('quantity')?.value,
        unitOfMeasureId: group.get('unitOfMeasureId')?.value ?? null,
        sequenceNumber: group.get('sequenceNumber')?.value ?? 0,
        notes: group.get('notes')?.value || null,
      })
      .subscribe({
        next: () => {
          this.editingIndex.set(null);
          this.loadFormulas();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo actualizar.',
          }),
      });
  }

  removeFormula(index: number): void {
    const group = this.formArray.at(index);
    const formulaId = group.get('id')?.value as string;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar componente?',
      text: 'Se eliminará de la fórmula.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        this.formulaService.remove(this.productId, formulaId).subscribe({
          next: () => this.loadFormulas(),
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' }),
        });
      }
    });
  }

  getComponentName(componentProductId: string): string {
    return this.componentNames().get(componentProductId) ?? componentProductId;
  }

  navigateToProduction(): void {
    this.router.navigate(['/inventario/produccion/nuevo'], {
      queryParams: { formulaId: this.productId },
    });
  }
}
