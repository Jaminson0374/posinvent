import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Batch, BatchStatus } from '../../../../core/models/batch.model';
import type { ErrorResponse } from '../../../../core/models/api-error.model';
import {
  DESPOSTE_SOURCE_TYPE,
  type ManualDesposteRequest,
  type ManualDesposteResult,
} from '../../../../core/models/desposte.model';
import type { PageResponse } from '../../../../core/models/page.model';
import type { Product } from '../../../../core/models/product.model';
import type { UserRole } from '../../../../core/models/user.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';
import { BatchService } from '../../../../core/services/batch.service';
import { DesposteService } from '../../../../core/services/desposte.service';
import { ProductService } from '../../../../core/services/product.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';

import * as XLSX from 'xlsx';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESPOSTE_ALLOWED_ROLE = {
  ADMIN: 'ADMIN',
  CARNICERO: 'CARNICERO',
} as const;

type DesposteAllowedRole = (typeof DESPOSTE_ALLOWED_ROLE)[keyof typeof DESPOSTE_ALLOWED_ROLE];
type ProductSearchValue = Product | string;

const PRODUCT_SEARCH_MIN_LENGTH = 2;
const RESULT_CUTS_PREVIEW_LIMIT = 5;

function normalizeProductSearchKey(value: string): string {
  return value.trim().toLowerCase();
}

function sameProductSearchValue(
  previousValue: ProductSearchValue,
  currentValue: ProductSearchValue,
): boolean {
  if (typeof previousValue === 'string' && typeof currentValue === 'string') {
    return normalizeProductSearchKey(previousValue) === normalizeProductSearchKey(currentValue);
  }

  return previousValue === currentValue;
}

interface DesposteProductSearchState {
  readonly error: string | null;
  readonly loading: boolean;
  readonly results: readonly Product[];
}

interface DesposteCutForm {
  rowKey: FormControl<string>;
  productSearch: FormControl<ProductSearchValue>;
  productId: FormControl<string>;
  warehouseId: FormControl<string>;
  weight: FormControl<number>;
  suggestedSalePrice: FormControl<number>;
  expirationDate: FormControl<string | null>;
}

interface DesposteForm {
  sourceBatchId: FormControl<string>;
  manualJustification: FormControl<string>;
  wasteWeight: FormControl<number>;
  shrinkWeight: FormControl<number>;
  notes: FormControl<string>;
  cuts: FormArray<FormGroup<DesposteCutForm>>;
}

interface DesposteFormValue {
  sourceBatchId: string;
  manualJustification: string;
  wasteWeight: number;
  shrinkWeight: number;
  notes: string;
  cuts: DesposteCutFormValue[];
}

interface DesposteCutFormValue {
  rowKey: string;
  productSearch: ProductSearchValue;
  productId: string;
  warehouseId: string;
  weight: number;
  suggestedSalePrice: number;
  expirationDate: string | null;
}

function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value;

    if (typeof value !== 'string' || !value.trim()) {
      return { required: true };
    }

    return null;
  };
}

function uuidValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value;

    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    return UUID_PATTERN.test(value) ? null : { uuid: true };
  };
}

function positiveNumberValidator(): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === 0) {
      return { positive: true };
    }

    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? null
      : { positive: true };
  };
}

function stringifyErrorDetails(details: unknown): string[] {
  if (typeof details === 'string' && details.trim()) {
    return [details.trim()];
  }

  if (Array.isArray(details)) {
    return details.flatMap((entry) => stringifyErrorDetails(entry));
  }

  if (details && typeof details === 'object') {
    return Object.entries(details).flatMap(([key, value]) => {
      const resolvedValue = stringifyErrorDetails(value);
      return resolvedValue.length > 0
        ? resolvedValue.map((item) => `${key}: ${item}`)
        : [`${key}: ${String(value)}`];
    });
  }

  return [];
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }

    if (error.error && typeof error.error === 'object') {
      const response = error.error as Partial<ErrorResponse>;
      const message = typeof response.message === 'string' ? response.message.trim() : '';
      const details = stringifyErrorDetails(response.details);
      const chunks = [message, ...details].filter((chunk) => chunk.length > 0);

      if (chunks.length > 0) {
        return chunks.join(' · ');
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}

@Component({
  selector: 'app-desposte-manual',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './desposte-manual.html',
  styleUrl: './desposte-manual.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesposteManualComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly batchService = inject(BatchService);
  private readonly productService = inject(ProductService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly desposteService = inject(DesposteService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loadingOptions = signal(true);
  readonly optionsError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);
  readonly batchOptions = signal<readonly Batch[]>([]);
  readonly warehouseOptions = signal<readonly Warehouse[]>([]);
  readonly lastResult = signal<ManualDesposteResult | null>(null);
  readonly productSearchState = signal<Record<string, DesposteProductSearchState>>({});
  readonly showAllCuts = signal(false);
  readonly batchStatusLabels: Record<BatchStatus, string> = {
    OPEN: 'Abierto',
    PROCESSING: 'En proceso',
    CLOSED: 'Cerrado',
  };
  readonly minProductSearchLength = PRODUCT_SEARCH_MIN_LENGTH;

  private readonly knownProducts = signal<Record<string, Product>>({});
  private readonly productSearchCache = new Map<string, readonly Product[]>();
  private readonly productSearchInFlight = new Map<string, Observable<readonly Product[]>>();
  private nextCutKey = 0;

  readonly form: FormGroup<DesposteForm> = this.fb.nonNullable.group({
    sourceBatchId: this.fb.nonNullable.control('', [Validators.required, uuidValidator()]),
    manualJustification: this.fb.nonNullable.control('', [trimmedRequiredValidator()]),
    wasteWeight: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    shrinkWeight: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    notes: this.fb.nonNullable.control(''),
    cuts: this.fb.array<FormGroup<DesposteCutForm>>([], [Validators.minLength(1)]),
  });

  readonly selectedBatchId = toSignal(
    this.form.controls.sourceBatchId.valueChanges.pipe(
      startWith(this.form.controls.sourceBatchId.getRawValue()),
    ),
    { initialValue: this.form.controls.sourceBatchId.getRawValue() },
  );

  readonly selectedBatch = computed(
    () => this.batchOptions().find((batch) => batch.id === this.selectedBatchId()) ?? null,
  );
  readonly cutsSummary = toSignal(this.cuts.valueChanges.pipe(startWith(this.cuts.getRawValue())), {
    initialValue: this.cuts.getRawValue(),
  });
  readonly totalCutsWeight = computed(() =>
    this.cuts.getRawValue().reduce((sum, cut) => sum + (Number(cut.weight) || 0), 0),
  );
  readonly allowedToSubmit = computed(() =>
    this.isRoleAllowed(this.authService.userRole() ?? null),
  );
  private isCutValid(cut: FormGroup<DesposteCutForm>): boolean {
    const pid = cut.controls.productId.getRawValue();
    const wid = cut.controls.warehouseId.getRawValue();
    const w = cut.controls.weight.getRawValue();
    const p = cut.controls.suggestedSalePrice.getRawValue();
    return !!(pid && UUID_PATTERN.test(pid) && wid && UUID_PATTERN.test(wid) && w > 0 && p > 0);
  }

  private isCutValidByRaw(cut: {
    productId?: string;
    warehouseId?: string;
    weight?: number;
    suggestedSalePrice?: number;
  }): boolean {
    const pid = cut.productId ?? '';
    const wid = cut.warehouseId ?? '';
    const w = cut.weight ?? 0;
    const p = cut.suggestedSalePrice ?? 0;
    return !!(pid && UUID_PATTERN.test(pid) && wid && UUID_PATTERN.test(wid) && w > 0 && p > 0);
  }

  readonly submitDisabled = computed(() => {
    const state = this.formState();
    const justification = (state?.manualJustification ?? '').toString().trim();
    const cuts = state?.cuts ?? [];

    return (
      this.loadingOptions() ||
      this.submitting() ||
      !this.allowedToSubmit() ||
      this.batchOptions().length === 0 ||
      this.warehouseOptions().length === 0 ||
      !state?.sourceBatchId ||
      !justification ||
      cuts.length === 0 ||
      !cuts.every((cut) => this.isCutValidByRaw(cut))
    );
  });

  readonly formState = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue() as unknown as DesposteFormValue,
  });

  readonly disabledReason = computed(() => {
    const state = this.formState();
    const justification = (state?.manualJustification ?? '').toString().trim();
    const cuts = state?.cuts ?? [];

    if (this.loadingOptions()) return 'Cargando opciones...';
    if (this.submitting()) return 'Enviando...';
    if (!this.allowedToSubmit()) return 'Sin permisos (rol no ADMIN/CARNICERO)';
    if (this.batchOptions().length === 0) return 'Sin lotes disponibles';
    if (this.warehouseOptions().length === 0) return 'Sin bodegas disponibles';
    if (!state?.sourceBatchId) return 'Falta seleccionar lote';
    if (!justification) return 'Falta justificación';
    if (cuts.length === 0) return 'Sin cortes';
    const invalidCuts = cuts
      .map((cut, i) => (!this.isCutValidByRaw(cut) ? i + 1 : -1))
      .filter((i) => i > 0);
    if (invalidCuts.length > 0) return `Cortes inválidos: ${invalidCuts.join(', ')}`;
    return 'Listo para enviar';
  });

  readonly resultCutsPreview = computed(() => {
    const cuts = this.lastResult()?.cuts ?? [];
    if (this.showAllCuts()) {
      return cuts;
    }
    return cuts.slice(0, RESULT_CUTS_PREVIEW_LIMIT);
  });
  readonly hiddenResultCutsCount = computed(() => {
    if (this.showAllCuts()) return 0;
    return Math.max((this.lastResult()?.cuts.length ?? 0) - RESULT_CUTS_PREVIEW_LIMIT, 0);
  });

  constructor() {
    this.addCut();
    this.loadOptions();

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.submitError()) {
        this.submitError.set(null);
      }
    });
  }

  get cuts(): FormArray<FormGroup<DesposteCutForm>> {
    return this.form.controls.cuts;
  }

  addCut(): void {
    this.cuts.push(this.createCutGroup());
  }

  removeCut(index: number): void {
    const rowKey = this.cuts.at(index).controls.rowKey.getRawValue();
    this.clearProductSearchState(rowKey);
    this.cuts.removeAt(index);

    if (this.cuts.length === 0) {
      this.addCut();
    }

    this.cuts.updateValueAndValidity();
  }

  reloadOptions(): void {
    this.loadOptions();
  }

  submit(): void {
    this.submitSuccess.set(null);
    this.submitError.set(null);
    this.lastResult.set(null);

    if (!this.allowedToSubmit()) {
      this.submitError.set('Tu rol no tiene permisos para registrar desposte manual.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    this.desposteService
      .processManual(this.buildRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.lastResult.set(result);
          this.submitSuccess.set('Desposte registrado correctamente. Revisá el resumen operativo.');
          this.resetForm();
          this.loadOptions();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.submitError.set(
            extractErrorMessage(error, 'No se pudo registrar el desposte manual.'),
          );
        },
      });
  }

  shortId(id: string): string {
    return id.slice(0, 8);
  }

  productLabel(product: Product): string {
    return `${product.name} · ${product.productCode}`;
  }

  readonly displayProductSearch = (value: ProductSearchValue | null): string => {
    if (!value) {
      return '';
    }

    return typeof value === 'string' ? value : this.productLabel(value);
  };

  productSearchResults(cut: FormGroup<DesposteCutForm>): readonly Product[] {
    return this.getProductSearchState(cut.controls.rowKey.getRawValue()).results;
  }

  productSearchLoading(cut: FormGroup<DesposteCutForm>): boolean {
    return this.getProductSearchState(cut.controls.rowKey.getRawValue()).loading;
  }

  productSearchError(cut: FormGroup<DesposteCutForm>): string | null {
    return this.getProductSearchState(cut.controls.rowKey.getRawValue()).error;
  }

  showProductSearchHint(cut: FormGroup<DesposteCutForm>): boolean {
    const value = cut.controls.productSearch.getRawValue();
    return typeof value === 'string' && value.trim().length < this.minProductSearchLength;
  }

  showProductSearchEmptyState(cut: FormGroup<DesposteCutForm>): boolean {
    const value = cut.controls.productSearch.getRawValue();

    return (
      typeof value === 'string' &&
      value.trim().length >= this.minProductSearchLength &&
      !this.productSearchLoading(cut) &&
      !this.productSearchError(cut) &&
      this.productSearchResults(cut).length === 0
    );
  }

  onProductSearchInput(cut: FormGroup<DesposteCutForm>, rawValue: string): void {
    const selectedProductId = cut.controls.productId.getRawValue();

    if (!selectedProductId) {
      return;
    }

    const selectedProduct = this.knownProducts()[selectedProductId];

    if (!selectedProduct) {
      cut.controls.productId.setValue('');
      return;
    }

    if (this.productLabel(selectedProduct) !== rawValue.trim()) {
      cut.controls.productId.setValue('');
    }
  }

  selectProduct(cut: FormGroup<DesposteCutForm>, product: Product): void {
    const rowKey = cut.controls.rowKey.getRawValue();

    this.rememberProducts([product]);
    cut.controls.productId.setValue(product.id);
    cut.controls.productSearch.setValue(product, { emitEvent: false });
    this.updateProductSearchState(rowKey, {
      error: null,
      loading: false,
      results: [],
    });
  }

  warehouseLabel(warehouse: Warehouse): string {
    return warehouse.location ? `${warehouse.name} · ${warehouse.location}` : warehouse.name;
  }

  resultBatchStatusLabel(status: BatchStatus): string {
    return this.batchStatusLabels[status] ?? status;
  }

  resultProductLabel(productId: string): string {
    const product = this.knownProducts()[productId];
    return product ? this.productLabel(product) : `Producto ${this.shortId(productId)}`;
  }

  resultWarehouseLabel(warehouseId: string): string {
    const warehouse = this.warehouseOptions().find((item) => item.id === warehouseId);
    return warehouse ? this.warehouseLabel(warehouse) : `Bodega ${this.shortId(warehouseId)}`;
  }

  resultBalanceTone(withinTolerance: boolean): 'ok' | 'warn' {
    return withinTolerance ? 'ok' : 'warn';
  }

  resultBalanceLabel(withinTolerance: boolean): string {
    return withinTolerance ? 'Dentro de tolerancia' : 'Revisar desviación';
  }

  resultBalanceIcon(withinTolerance: boolean): string {
    return withinTolerance ? 'check_circle' : 'warning';
  }

  toggleShowAllCuts(): void {
    this.showAllCuts.set(!this.showAllCuts());
  }

  exportarExcel(): void {
    const result = this.lastResult();
    if (!result) return;

    const wsData: object[] = [];

    wsData.push({ A: 'RESUMEN DE DESPOSTE', B: '' });
    wsData.push({ A: 'Lote origen', B: result.sourceBatchId });
    wsData.push({ A: 'Fecha', B: result.createdAt ?? 'N/A' });
    wsData.push({ A: 'Usuario', B: result.createdBy ?? 'N/A' });
    wsData.push({ A: '', B: '' });

    wsData.push({ A: 'BALANCE DE MASA', B: '' });
    wsData.push({ A: 'Peso entrada', B: `${result.massBalance.inputWeight} kg` });
    wsData.push({ A: 'Peso cortes', B: `${result.massBalance.totalCutsWeight} kg` });
    wsData.push({ A: 'Merma operativa', B: `${result.massBalance.wasteWeight} kg` });
    wsData.push({ A: 'Merma técnica', B: `${result.massBalance.shrinkWeight} kg` });
    wsData.push({ A: 'Desvío', B: `${result.massBalance.deviation} kg` });
    wsData.push({ A: 'Tolerancia', B: `${result.massBalance.tolerance} kg` });
    wsData.push({ A: '', B: '' });

    wsData.push({ A: 'RESUMEN FINANCIERO', B: '' });
    wsData.push({ A: 'Valor comercial total', B: result.totalCommercialValue });
    wsData.push({ A: 'Costo total asignado', B: result.totalAllocatedCost });
    wsData.push({ A: 'Movimientos de stock', B: result.stockUpserts.length });
    wsData.push({ A: '', B: '' });

    wsData.push({ A: 'DETALLE DE CORTES', B: '' });
    wsData.push({ A: 'Producto', B: 'Bodega', C: 'Peso (kg)', D: 'Precio', E: 'Valor comercial' });
    result.cuts.forEach((cut) => {
      wsData.push({
        A: this.resultProductLabel(cut.productId),
        B: this.resultWarehouseLabel(cut.warehouseId),
        C: cut.weight,
        D: cut.suggestedSalePrice,
        E: cut.commercialValue,
      });
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Desposte');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `desposte_${this.shortId(result.sourceBatchId)}_${date}.xlsx`);
  }

  async copiarResumen(): Promise<void> {
    const result = this.lastResult();
    if (!result) return;

    const text = `
RESUMEN DESPOSTE
================
Lote: ${this.shortId(result.sourceBatchId)}
Fecha: ${result.createdAt ?? 'N/A'}
Usuario: ${result.createdBy ?? 'N/A'}

BALANCE DE MASA
Peso entrada: ${result.massBalance.inputWeight} kg
Peso cortes: ${result.massBalance.totalCutsWeight} kg
Merma operativa: ${result.massBalance.wasteWeight} kg
Merma técnica: ${result.massBalance.shrinkWeight} kg
Desvío: ${result.massBalance.deviation} kg

RESUMEN FINANCIERO
Valor comercial: ${result.totalCommercialValue}
Costo total: ${result.totalAllocatedCost}
Cortes: ${result.cuts.length}

DETALLE CORTES
${result.cuts.map((c) => `- ${this.resultProductLabel(c.productId)}: ${c.weight}kg -> $${c.commercialValue}`).join('\n')}
`.trim();

    try {
      await navigator.clipboard.writeText(text);
      this.submitSuccess.set('Resumen copiado al portapapeles');
    } catch {
      this.submitError.set('No se pudo copiar al portapapeles');
    }
  }

  imprimir(): void {
    window.print();
  }

  private createCutGroup(): FormGroup<DesposteCutForm> {
    const cut = this.fb.nonNullable.group({
      rowKey: this.fb.nonNullable.control(this.createCutKey()),
      productSearch: this.fb.nonNullable.control<ProductSearchValue>(''),
      productId: this.fb.nonNullable.control('', [Validators.required, uuidValidator()]),
      warehouseId: this.fb.nonNullable.control('', [Validators.required, uuidValidator()]),
      weight: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0.001)]),
      suggestedSalePrice: this.fb.nonNullable.control(0, [
        Validators.required,
        positiveNumberValidator(),
      ]),
      expirationDate: this.fb.nonNullable.control<string | null>(null),
    });

    this.bindProductSearch(cut);
    return cut;
  }

  private loadOptions(): void {
    this.loadingOptions.set(true);
    this.optionsError.set(null);

    forkJoin({
      batches: this.batchService.listProcessable(),
      warehouses: this.warehouseService.listAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ batches, warehouses }) => {
          this.loadingOptions.set(false);
          this.batchOptions.set(batches);
          this.warehouseOptions.set(warehouses.filter((warehouse) => warehouse.active));
          this.syncSourceBatchControl(batches);
        },
        error: () => {
          this.loadingOptions.set(false);
          this.optionsError.set('No se pudieron cargar los lotes o bodegas para el desposte.');
        },
      });
  }

  private syncSourceBatchControl(batches: readonly Batch[]): void {
    const currentBatchId = this.form.controls.sourceBatchId.getRawValue();

    if (batches.some((batch) => batch.id === currentBatchId)) {
      return;
    }

    this.form.controls.sourceBatchId.setValue(batches[0]?.id ?? '');
  }

  private buildRequest(): ManualDesposteRequest {
    const rawValue = this.form.getRawValue();

    return {
      sourceBatchId: rawValue.sourceBatchId,
      sourceType: DESPOSTE_SOURCE_TYPE.MANUAL,
      manualJustification: rawValue.manualJustification.trim(),
      wasteWeight: rawValue.wasteWeight,
      shrinkWeight: rawValue.shrinkWeight,
      notes: rawValue.notes.trim() ? rawValue.notes.trim() : null,
      cuts: rawValue.cuts.map((cut) => ({
        productId: cut.productId,
        warehouseId: cut.warehouseId,
        weight: cut.weight,
        suggestedSalePrice: cut.suggestedSalePrice,
        expirationDate: cut.expirationDate ?? null,
      })),
    };
  }

  private resetForm(): void {
    this.productSearchState.set({});

    while (this.cuts.length > 0) {
      this.cuts.removeAt(0);
    }

    this.addCut();
    this.form.reset({
      sourceBatchId: '',
      manualJustification: '',
      wasteWeight: 0,
      shrinkWeight: 0,
      notes: '',
      cuts: this.cuts.getRawValue(),
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private isRoleAllowed(role: UserRole | null): role is DesposteAllowedRole {
    return role === DESPOSTE_ALLOWED_ROLE.ADMIN || role === DESPOSTE_ALLOWED_ROLE.CARNICERO;
  }

  private bindProductSearch(cut: FormGroup<DesposteCutForm>): void {
    const rowKey = cut.controls.rowKey.getRawValue();

    this.updateProductSearchState(rowKey, {
      error: null,
      loading: false,
      results: [],
    });

    cut.controls.productSearch.valueChanges
      .pipe(
        startWith(cut.controls.productSearch.getRawValue()),
        debounceTime(250),
        distinctUntilChanged(sameProductSearchValue),
        switchMap((value) => {
          if (typeof value !== 'string') {
            this.updateProductSearchState(rowKey, {
              error: null,
              loading: false,
              results: [],
            });
            return of<readonly Product[] | null>(null);
          }

          const query = value.trim();

          if (!query) {
            this.updateProductSearchState(rowKey, {
              error: null,
              loading: false,
              results: [],
            });
            return of<readonly Product[]>([]);
          }

          if (query.length < this.minProductSearchLength) {
            this.updateProductSearchState(rowKey, {
              error: null,
              loading: false,
              results: [],
            });
            return of<readonly Product[]>([]);
          }

          this.updateProductSearchState(rowKey, {
            error: null,
            loading: true,
            results: [],
          });

          return this.searchProducts(query).pipe(
            catchError(() => {
              this.updateProductSearchState(rowKey, {
                error: 'No pudimos buscar productos. Reintentá.',
                loading: false,
                results: [],
              });
              return of<readonly Product[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => {
        if (products === null) {
          return;
        }

        this.rememberProducts(products);
        this.updateProductSearchState(rowKey, {
          error: this.productSearchError(cut),
          loading: false,
          results: products,
        });
      });
  }

  private getProductSearchState(rowKey: string): DesposteProductSearchState {
    return (
      this.productSearchState()[rowKey] ?? {
        error: null,
        loading: false,
        results: [],
      }
    );
  }

  private updateProductSearchState(rowKey: string, state: DesposteProductSearchState): void {
    this.productSearchState.update((currentState) => ({
      ...currentState,
      [rowKey]: state,
    }));
  }

  private clearProductSearchState(rowKey: string): void {
    this.productSearchState.update((currentState) => {
      const nextState = { ...currentState };
      delete nextState[rowKey];
      return nextState;
    });
  }

  private rememberProducts(products: readonly Product[]): void {
    if (products.length === 0) {
      return;
    }

    this.knownProducts.update((currentProducts) => {
      const nextProducts = { ...currentProducts };

      products.forEach((product) => {
        nextProducts[product.id] = product;
      });

      return nextProducts;
    });
  }

  private searchProducts(query: string): Observable<readonly Product[]> {
    const normalizedQuery = normalizeProductSearchKey(query);
    const cachedResults = this.productSearchCache.get(normalizedQuery);

    if (cachedResults) {
      return of(cachedResults);
    }

    const inFlightRequest = this.productSearchInFlight.get(normalizedQuery);

    if (inFlightRequest) {
      return inFlightRequest;
    }

    const request = this.productService.search(query, 0, 10).pipe(
      map((page) => page.content.filter((product) => product.active && product.inventoriable)),
      map((products) => {
        this.productSearchCache.set(normalizedQuery, products);
        return products;
      }),
      finalize(() => {
        this.productSearchInFlight.delete(normalizedQuery);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.productSearchInFlight.set(normalizedQuery, request);
    return request;
  }

  private createCutKey(): string {
    this.nextCutKey += 1;
    return `cut-${this.nextCutKey}`;
  }
}

export function createProductsPage(content: Product[]): PageResponse<Product> {
  return {
    content,
    page: 0,
    size: content.length,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    last: true,
  };
}
