import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import type Dropzone from 'dropzone';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PresentationsTabComponent } from '../presentations-tab';
import { FormulaTabComponent } from '../formula-tab';
import { ProductGeneralComponent } from './components/product-general/product-general';
import { ProductSummaryComponent } from './components/product-summary/product-summary';
import { ProductInventoryComponent } from './components/product-inventory/product-inventory';
import { ProductAccountingComponent } from './components/product-accounting/product-accounting';
import { ProductSuppliersComponent } from './components/product-suppliers/product-suppliers';
import { ProductService } from '../../../../core/services/product.service';
import { ProductTypeService } from '../../../../core/services/product-type.service';
import { ProductStateService } from '../../../../core/services/product-state.service';
import { BrandService } from '../../../../core/services/brand.service';
import { ProductModelService } from '../../../../core/services/product-model.service';
import { ProductCatalogCategoryService } from '../../../../core/services/product-catalog-category.service';
import { ProductGroupService } from '../../../../core/services/product-group.service';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { PriceListService } from '../../../../core/services/price-list.service';
import { PucAccountService } from '../../../../core/services/puc-account.service';
import { AccountingTemplateService } from '../../../../core/services/accounting-template.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { WarehouseLocationService } from '../../../../core/services/warehouse-location.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ProductImageUploadService } from '../../../../core/services/product-image-upload.service';
import {
  Product,
  ProductRequest,
  ProductSupplier,
  ProductWarehouse,
} from '../../../../core/models/product.model';
import { ThirdParty, ThirdPartySupplierOption } from '../../../../core/models/third-party.model';
import {
  QuickCreateProductTypeDialogComponent,
  QuickCreateProductTypeData,
} from '../dialogs/quick-create-product-type.dialog';
import {
  QuickCreateProductStateDialogComponent,
  QuickCreateProductStateData,
} from '../dialogs/quick-create-product-state.dialog';
import {
  QuickCreateBrandDialogComponent,
  QuickCreateBrandData,
} from '../dialogs/quick-create-brand.dialog';
import {
  QuickCreateProductModelDialogComponent,
  QuickCreateProductModelData,
} from '../dialogs/quick-create-product-model.dialog';
import {
  QuickCreateProductCategoryDialogComponent,
  QuickCreateProductCategoryData,
} from '../dialogs/quick-create-product-category.dialog';
import {
  QuickCreateProductGroupDialogComponent,
  QuickCreateProductGroupData,
} from '../dialogs/quick-create-product-group.dialog';
import {
  QuickCreateUomDialogComponent,
  QuickCreateUomData,
} from '../dialogs/quick-create-uom.dialog';
import {
  QuickCreateWarehouseDialogComponent,
  QuickCreateWarehouseData,
} from '../dialogs/quick-create-warehouse.dialog';
import {
  QuickCreateWarehouseLocationDialogComponent,
  QuickCreateWarehouseLocationData,
} from '../dialogs/quick-create-warehouse-location.dialog';
import { QuickCreateSupplierDialogComponent } from '../dialogs/quick-create-supplier.dialog';
import {
  ProductType,
  ProductState,
  Brand,
  ProductModel,
  ProductCatalogCategory,
  ProductGroup,
  PriceList,
  WarehouseLocation,
  UnitOfMeasure,
} from '../../../../core/models/product-catalog.model';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { PageResponse } from '../../../../core/models/page.model';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

type FormMode = 'view' | 'new' | 'edit';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    CurrencyPipe,
    DecimalPipe,
    DragDropModule,
    PresentationsTabComponent,
    FormulaTabComponent,
    ProductGeneralComponent,
    ProductSummaryComponent,
    ProductInventoryComponent,
    ProductAccountingComponent,
    ProductSuppliersComponent,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductFormComponent implements OnInit {
  readonly quickCreateOptionValue = '__create__';

  // ── DI ────────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProductService);
  private readonly productImageUploadService = inject(ProductImageUploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialog = inject(MatDialog);
  readonly typeService = inject(ProductTypeService);
  readonly stateService = inject(ProductStateService);
  readonly brandService = inject(BrandService);
  readonly modelService = inject(ProductModelService);
  readonly catCategoryService = inject(ProductCatalogCategoryService);
  readonly groupService = inject(ProductGroupService);
  readonly uomService = inject(UnitOfMeasureService);
  readonly priceListService = inject(PriceListService);
  readonly pucService = inject(PucAccountService);
  readonly templateService = inject(AccountingTemplateService);
  readonly warehouseService = inject(WarehouseService);
  readonly warehouseLocationService = inject(WarehouseLocationService);
  readonly thirdPartyService = inject(ThirdPartyService);
  readonly maxProductImages = 4;
  readonly imageDropzoneHost = viewChild<ElementRef<HTMLDivElement>>('imageDropzoneHost');

  // ── State signals ─────────────────────────────────────────────────
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private dropzone: Dropzone | null = null;
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly imageUploadError = signal<string | null>(null);
  readonly uploadingImages = signal(0);
  readonly mode = signal<FormMode>('new');
  readonly selectedTab = signal(0);
  readonly showSearch = signal(false);
  readonly suppressingSummary = signal(false);
  readonly loadedId = signal<string | null>(null);
  readonly searching = signal(false);
  readonly searchResults = signal<Product[]>([]);
  readonly searchPageData = signal<PageResponse<Product> | null>(null);
  readonly searchPage = signal(0);
  readonly searchPageSize = signal(10);
  readonly selectedSearchResultId = signal<string | null>(null);
  readonly focusedSearchResultId = signal<string | null>(null);
  readonly searchColumns = ['productCode', 'name', 'barcode', 'status', 'stock', 'salePrice'];
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly warehouseLocationsByWarehouseId = signal<Record<string, WarehouseLocation[]>>({});
  private readonly searchRequests = new Subject<{ query: string; page: number; size: number }>();

  readonly suppressDependentResets = signal(false);

  private readonly previousWarehouseSelections = new WeakMap<FormGroup, string | null>();
  private readonly previousWarehouseLocationSelections = new WeakMap<FormGroup, string | null>();
  private readonly previousWarehouseUomSelections = new WeakMap<FormGroup, string | null>();
  private readonly previousSupplierSelections = new WeakMap<FormGroup, string | null>();

  private previousBrandId: string | null = null;
  private previousCategoryId: string | null = null;

  // ── Autocomplete display controls ─────────────────────────────────
  readonly typeDisplay = new FormControl('');
  readonly stateDisplay = new FormControl('');
  readonly brandDisplay = new FormControl('');
  readonly modelDisplay = new FormControl('');
  readonly categoryDisplay = new FormControl('');
  readonly groupDisplay = new FormControl('');
  readonly uomDisplay = new FormControl('');
  readonly priceListSearch = new FormControl('', { nonNullable: true });

  // ── Autocomplete filter signals ───────────────────────────────────
  readonly typeFilter = signal('');
  readonly stateFilter = signal('');
  readonly brandFilter = signal('');
  readonly modelFilter = signal('');
  readonly categoryFilter = signal('');
  readonly groupFilter = signal('');
  readonly uomFilter = signal('');
  readonly priceListFilter = signal('');
  readonly priceEntriesVersion = signal(0);

  // ── Filtered options (computed) ───────────────────────────────────
  readonly filteredTypes = computed(() => {
    const q = this.typeFilter().toLowerCase();
    const all = this.typeService.types.value() ?? [];
    return q
      ? all.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      : all;
  });

  readonly filteredStates = computed(() => {
    const q = this.stateFilter().toLowerCase();
    const all = this.stateService.states.value() ?? [];
    return q
      ? all.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      : all;
  });

  readonly filteredBrands = computed(() => {
    const q = this.brandFilter().toLowerCase();
    const all = this.brandService.brands.value() ?? [];
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredModels = computed(() => {
    const q = this.modelFilter().toLowerCase();
    const all = this.modelService.models.value() ?? [];
    return q ? all.filter((m) => m.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredCategories = computed(() => {
    const q = this.categoryFilter().toLowerCase();
    const all = this.catCategoryService.categories.value() ?? [];
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredGroups = computed(() => {
    const q = this.groupFilter().toLowerCase();
    const all = this.groupService.groups.value() ?? [];
    return q ? all.filter((g) => g.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredUoms = computed(() => {
    const q = this.uomFilter().toLowerCase();
    const all = this.uomService.units.value() ?? [];
    return q
      ? all.filter((u) => u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      : all;
  });

  readonly filteredAvailablePriceLists = computed(() => {
    this.priceEntriesVersion();
    const q = this.priceListFilter().trim().toLowerCase();
    const selectedPriceListIds = new Set(
      this.priceEntriesArray.controls
        .map((control) => control.get('priceListId')?.value as string | null)
        .filter((priceListId): priceListId is string => !!priceListId),
    );

    return (this.priceListService.priceLists.value() ?? []).filter((priceList) => {
      if (!priceList.active || selectedPriceListIds.has(priceList.id)) {
        return false;
      }

      if (!q) {
        return true;
      }

      return priceList.name.toLowerCase().includes(q) || priceList.code.toLowerCase().includes(q);
    });
  });

  readonly supplierOptions = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);
  readonly safeSupplierOptions = computed(() =>
    this.supplierOptions().map((s) => ({ ...s, lastName: s.lastName ?? '' })),
  );
  readonly supplierOptionsById = computed(
    () => new Map(this.supplierOptions().map((supplier) => [supplier.id, supplier])),
  );

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = this.fb.group({
    productCode: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    barcode: [''],
    reference: [''],
    description: [''],
    productTypeId: [null as string | null],
    productStateId: [null as string | null],
    brandId: [null as string | null],
    modelId: [null as string | null],
    categoryId: [null as string | null],
    groupId: [null as string | null],
    unitOfMeasureId: [null as string | null],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    profitMargin: [0, [Validators.min(0), Validators.max(100)]],
    taxType: ['EXENTO'],
    salePrice: [0],
    costingMethod: ['PROMEDIO_PONDERADO'],
    initialStock: [0, [Validators.min(0)]],
    minStock: [0, [Validators.min(0)]],
    maxStock: [0, [Validators.min(0)]],
    totalStock: [{ value: 0, disabled: true }],
    manufacturedInHouse: [false],
    costAffectingExp: [false],
    manageLots: [false],
    perishable: [false],
    belongsToProduct: [false],
    sellBelowMin: [false],
    inventoriable: [true],
    incomeAccountId: [null as string | null],
    inventoryAccountId: [null as string | null],
    costOfSalesAcctId: [null as string | null],
    accountingTemplateId: [null as string | null],
    serialNumber: [''],
    originCountry: [''],
    specifications: [''],
    version: [0],
  });

  // ── FormArrays ────────────────────────────────────────────────────
  readonly warehousesArray = this.fb.array<FormGroup>([]);
  readonly suppliersArray = this.fb.array<FormGroup>([]);
  readonly imagesArray = this.fb.array<FormGroup>([]);
  readonly promotionsArray = this.fb.array<FormGroup>([]);
  readonly priceEntriesArray = this.fb.array<FormGroup>([]);
  readonly formulasFormArray = this.fb.array<FormGroup>([]);
  readonly presentationsFormArray = this.fb.array<FormGroup>([]);

  // ── Toolbar computed ──────────────────────────────────────────────
  readonly isEditing = computed(() => this.mode() === 'new' || this.mode() === 'edit');
  readonly onTab0 = computed(() => this.selectedTab() === 0);
  readonly canNuevo = computed(() => this.onTab0() && this.mode() === 'view');
  readonly canEditar = computed(() => this.mode() === 'view' && !!this.loadedId());
  readonly canGuardar = computed(() => this.isEditing() && !this.saving());
  readonly canCancelar = computed(() => this.isEditing());
  readonly canBuscar = computed(() => this.mode() !== 'edit');
  readonly showPresentationsTab = computed(() => this.mode() === 'view' && !!this.loadedId());
  readonly showFormulaTab = computed(() => this.showPresentationsTab() && this.isFormulaOrCombo());

  // ── Summary sidebar data ──────────────────────────────────────
  readonly summaryCode = signal<string | null>(null);
  readonly summaryName = signal<string | null>(null);
  readonly summaryCategory = signal<string | null>(null);
  readonly summaryUom = signal<string | null>(null);
  readonly summaryCost = signal<number | null>(null);
  readonly summaryMargin = signal<number | null>(null);
  readonly summarySalePrice = signal<number | null>(null);
  readonly summaryTax = signal<string | null>(null);
  readonly summaryStock = signal<number | null>(null);

  private buildSummary(): void {
    const v = this.form.getRawValue();
    this.summaryCode.set((v.productCode ?? null) as string | null);
    this.summaryName.set((v.name ?? null) as string | null);
    this.summaryCategory.set(this.categoryDisplay.value || null);
    this.summaryUom.set(this.uomDisplay.value || null);
    this.summaryCost.set(v.costPrice as number | null);
    this.summaryMargin.set(v.profitMargin as number | null);
    this.summarySalePrice.set(v.salePrice as number | null);
    this.summaryTax.set(this.formatTaxDisplay(v.taxType as string | null));
    this.summaryStock.set(v.totalStock as number | null);
  }

  private formatTaxDisplay(taxType: string | null): string {
    if (!taxType) return 'Exento';
    return taxType === 'EXENTO'
      ? 'Exento'
      : taxType === 'IVA_5'
        ? 'IVA 5%'
        : taxType === 'IVA_8'
          ? 'IVA 8%'
          : taxType === 'IVA_19'
            ? 'IVA 19%'
            : taxType;
  }

  // ── Draft persistence ────────────────────────────────────────────
  private getDraftKey(): string {
    const id = this.loadedId();
    return `posinvent-draft-${id ?? 'new'}`;
  }

  /** Save the current form state to localStorage (excludes images). */
  private saveLocalDraft(): void {
    if (!this.isBrowser) return;

    const v = this.form.getRawValue();
    // Exclude images from draft
    const draft = { ...v };
    delete (draft as Record<string, unknown>)['images'];

    if (!this.hasDraftData(draft)) {
      localStorage.removeItem(this.getDraftKey());
      return;
    }

    localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
  }

  /** Returns true only when the draft contains user-entered values. */
  private hasDraftData(draft: Record<string, unknown>): boolean {
    const defaultValues: Record<string, unknown> = {
      costPrice: 0,
      profitMargin: 0,
      salePrice: 0,
      costingMethod: 'PROMEDIO_PONDERADO',
      initialStock: 0,
      minStock: 0,
      maxStock: 0,
      totalStock: 0,
      manufacturedInHouse: false,
      costAffectingExp: false,
      manageLots: false,
      perishable: false,
      belongsToProduct: false,
      sellBelowMin: false,
      inventoriable: true,
      taxType: 'EXENTO',
      version: 0,
    };

    return Object.entries(draft).some(([key, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return value !== defaultValues[key];
    });
  }

  /** Clear the draft from localStorage for the current product. */
  clearLocalDraft(): void {
    localStorage.removeItem(this.getDraftKey());
  }

  /** "Guardar borrador" — immediate save + toast. */
  guardarBorrador(): void {
    this.saveLocalDraft();
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Borrador guardado',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  }

  /** On new product init, check localStorage for existing draft and prompt restore. */
  private async checkAndRestoreDraft(): Promise<void> {
    if (!this.isBrowser) return;

    const draftJson = localStorage.getItem('posinvent-draft-new');
    if (!draftJson) return;

    let draft: Record<string, unknown> | null = null;
    try {
      draft = JSON.parse(draftJson);
    } catch {
      localStorage.removeItem('posinvent-draft-new');
      return;
    }

    if (!draft || !this.hasDraftData(draft)) {
      localStorage.removeItem('posinvent-draft-new');
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Restaurar borrador?',
      text: 'Tiene datos sin guardar de una sesión anterior.',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'No, descartar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      this.form.patchValue(draft, { emitEvent: false });
      this.buildSummary();
    } else {
      localStorage.removeItem('posinvent-draft-new');
    }
  }

  private isFormulaOrCombo(): boolean {
    const typeId = this.form.get('productTypeId')?.value as string | null;
    if (!typeId) return false;
    const types = this.typeService.types.value() ?? [];
    const productType = types.find((t) => t.id === typeId);
    return (
      productType?.code === 'COMBO' ||
      productType?.code === 'FORMULA' ||
      productType?.name?.toUpperCase() === 'COMBO' ||
      productType?.name?.toUpperCase() === 'FÓRMULA'
    );
  }

  readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'new':
        return 'Nuevo artículo';
      case 'edit':
        return 'Editando artículo';
      default:
        return 'Detalle del artículo';
    }
  });

  // ── Catalog options ───────────────────────────────────────────────
  readonly taxOptions = [
    { value: 'EXENTO', label: 'Exento' },
    { value: 'IVA_5', label: 'IVA 5%' },
    { value: 'IVA_8', label: 'IVA 8%' },
    { value: 'IVA_19', label: 'IVA 19%' },
  ];

  readonly costingOptions = [
    { value: 'PEPS', label: 'PEPS (Primero en entrar, primero en salir)' },
    { value: 'PROMEDIO_PONDERADO', label: 'Promedio Ponderado' },
    { value: 'ESTANDAR', label: 'Estándar' },
    { value: 'IDENTIFICACION_ESPECIFICA', label: 'Identificación Específica' },
    { value: 'YIELD_COSTING', label: 'Yield Costing' },
  ];

  constructor() {
    this.previousBrandId = this.form.get('brandId')!.value;
    this.previousCategoryId = this.form.get('categoryId')!.value;

    // ── Sale price calculation ────────────────────────────────────
    const costSig = toSignal(this.form.get('costPrice')!.valueChanges, { initialValue: 0 });
    const marginSig = toSignal(this.form.get('profitMargin')!.valueChanges, { initialValue: 0 });
    const taxSig = toSignal(this.form.get('taxType')!.valueChanges, { initialValue: 'EXENTO' });

    effect(() => {
      const cost = costSig() ?? 0;
      const margin = marginSig() ?? 0;
      const tax = taxSig() ?? 'EXENTO';
      const salePrice = this.calculateSalePrice(cost, margin, tax);

      this.form.get('salePrice')!.setValue(salePrice, { emitEvent: false });
    });

    effect(() => {
      // Track tab changes so the effect re-runs when tabs switch
      this.selectedTab();
      const host = this.imageDropzoneHost()?.nativeElement;
      // Only enable when the host exists AND is actually visible in the DOM
      // (offsetParent is null when the tab content is display:none)
      const isVisible = host && this.isBrowser && host.offsetParent !== null;
      const shouldEnableDropzone = this.isEditing() && isVisible;

      if (!shouldEnableDropzone) {
        this.destroyImageDropzone();
        return;
      }

      void this.ensureImageDropzone(host!);
    });

    this.destroyRef.onDestroy(() => this.destroyImageDropzone());

    // ── Catalog value signals (for cascade + display sync) ────────
    const productTypeSig = toSignal(this.form.get('productTypeId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const productStateSig = toSignal(this.form.get('productStateId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const brandSig = toSignal(this.form.get('brandId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const modelSig = toSignal(this.form.get('modelId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const categorySig = toSignal(this.form.get('categoryId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const groupSig = toSignal(this.form.get('groupId')!.valueChanges, {
      initialValue: null as string | null,
    });
    const uomSig = toSignal(this.form.get('unitOfMeasureId')!.valueChanges, {
      initialValue: null as string | null,
    });

    // ── Cascade: brand → reset model ─────────────────────────────
    effect(() => {
      const brandId = brandSig() ?? null;
      const shouldResetModel = this.previousBrandId !== brandId && !this.suppressDependentResets();

      this.modelService.brandId.set(brandId);
      this.previousBrandId = brandId;

      if (!shouldResetModel) {
        return;
      }

      this.form.get('modelId')!.setValue(null, { emitEvent: false });
      this.modelDisplay.setValue('', { emitEvent: false });
      this.modelFilter.set('');
    });

    // ── Cascade: category → reset group ──────────────────────────
    effect(() => {
      const categoryId = categorySig() ?? null;
      const shouldResetGroup =
        this.previousCategoryId !== categoryId && !this.suppressDependentResets();

      this.groupService.categoryId.set(categoryId);
      this.previousCategoryId = categoryId;

      if (!shouldResetGroup) {
        return;
      }

      this.form.get('groupId')!.setValue(null, { emitEvent: false });
      this.groupDisplay.setValue('', { emitEvent: false });
      this.groupFilter.set('');
    });

    effect(() => {
      this.priceListService.priceLists.value();
      this.syncPriceEntriesWithCatalog();
    });

    // ── Display sync effects ──────────────────────────────────────
    effect(() => {
      const id = productTypeSig();
      this.typeDisplay.setValue(
        this.typeService.types.value()?.find((t) => t.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = productStateSig();
      this.stateDisplay.setValue(
        this.stateService.states.value()?.find((s) => s.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = brandSig();
      this.brandDisplay.setValue(
        this.brandService.brands.value()?.find((b) => b.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = modelSig();
      this.modelDisplay.setValue(
        this.modelService.models.value()?.find((m) => m.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = categorySig();
      this.categoryDisplay.setValue(
        this.catCategoryService.categories.value()?.find((c) => c.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = groupSig();
      this.groupDisplay.setValue(
        this.groupService.groups.value()?.find((g) => g.id === id)?.name ?? '',
        { emitEvent: false },
      );
    });

    effect(() => {
      const id = uomSig();
      const u = this.uomService.units.value()?.find((u) => u.id === id);
      this.uomDisplay.setValue(u ? `${u.code} — ${u.name}` : '', { emitEvent: false });
    });

    // ── Summary derivation effect ─────────────────────────────────
    effect(() => {
      // Read all form signals to trigger re-derivation
      productTypeSig();
      productStateSig();
      brandSig();
      modelSig();
      categorySig();
      groupSig();
      uomSig();
      // Also depend on the display values (read them explicitly)
      this.typeDisplay.value;
      this.stateDisplay.value;
      this.brandDisplay.value;
      this.modelDisplay.value;
      this.categoryDisplay.value;
      this.groupDisplay.value;
      this.uomDisplay.value;
      this.buildSummary();
    });

    // ── Draft auto-save (debounced 2s) ──────────────────────────
    this.form.valueChanges
      .pipe(debounceTime(2000), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isEditing()) {
          this.saveLocalDraft();
        }
      });
  }

  supplierOptionLabel(supplier: ThirdPartySupplierOption): string {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(' ');
    const status = supplier.active ? '' : ' - inactivo';
    return `${fullName} (${supplier.numIdentification})${status}`;
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);
      this.showSearch.set(false);
      this.selectedTab.set(0);

      if (!id) {
        this.loadedId.set(null);
        this.resetForm();
        this.mode.set('new');
        this.enableForm();
        this.syncPriceEntriesWithCatalog();
        this.checkAndRestoreDraft();
      } else {
        this.loadedId.set(id);
        this.loading.set(true);
        this.mode.set('view');
        this.disableForm();
        this.service.getById(id).subscribe({
          next: (data) => {
            this.loading.set(false);
            this.loadIntoForm(data);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Error al cargar el artículo.');
          },
        });
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        if (this.showSearch()) {
          this.searchRequests.next({ query, page: 0, size: this.searchPageSize() });
        }
      });

    this.searchRequests
      .pipe(
        switchMap(({ query, page, size }) => {
          this.searching.set(true);
          return this.service.search(query, page, size).pipe(
            catchError(() => of(null)),
            finalize(() => this.searching.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (!result) {
            this.searchPageData.set(null);
            this.searchResults.set([]);
            return;
          }
          this.searchPageData.set(result);
          this.searchResults.set(result.content);
          this.searchPage.set(result.page);
          this.searchPageSize.set(result.size);
        },
        error: () => {
          this.searching.set(false);
          this.searchPageData.set(null);
          this.searchResults.set([]);
        },
      });
  }

  // ── Form helpers ──────────────────────────────────────────────────
  private resetForm(): void {
    this.withDependentResetsSuppressed(() => {
      this.form.reset({
        taxType: 'EXENTO',
        costingMethod: 'PROMEDIO_PONDERADO',
        inventoriable: true,
        version: 0,
        costPrice: 0,
        profitMargin: 0,
        salePrice: 0,
        initialStock: 0,
        minStock: 0,
        maxStock: 0,
        totalStock: 0,
        manufacturedInHouse: false,
        costAffectingExp: false,
        manageLots: false,
        perishable: false,
        belongsToProduct: false,
        sellBelowMin: false,
      });
    });
    [
      this.typeDisplay,
      this.stateDisplay,
      this.brandDisplay,
      this.modelDisplay,
      this.categoryDisplay,
      this.groupDisplay,
      this.uomDisplay,
    ].forEach((c) => c.setValue('', { emitEvent: false }));
    [
      this.typeFilter,
      this.stateFilter,
      this.brandFilter,
      this.modelFilter,
      this.categoryFilter,
      this.groupFilter,
      this.uomFilter,
    ].forEach((s) => s.set(''));
    this.warehousesArray.clear();
    this.suppliersArray.clear();
    this.imagesArray.clear();
    this.imageUploadError.set(null);
    this.promotionsArray.clear();
    this.priceEntriesArray.clear();
    this.formulasFormArray.clear();
    this.presentationsFormArray.clear();
    this.markPriceEntriesChanged();
    this.clearPriceListSearch();
    this.syncPriceEntriesWithCatalog();
  }

  private withDependentResetsSuppressed(work: () => void): void {
    this.suppressDependentResets.set(true);
    try {
      work();
    } finally {
      this.previousBrandId = this.form.get('brandId')!.value;
      this.previousCategoryId = this.form.get('categoryId')!.value;
      this.suppressDependentResets.set(false);
    }
  }

  private createPriceEntryGroup(entry: {
    id: string | null;
    priceListId: string;
    priceListName: string;
    price: number;
    profitMargin: number;
  }): FormGroup {
    const group = this.fb.group({
      id: [entry.id],
      priceListId: [entry.priceListId],
      priceListName: [entry.priceListName],
      price: [entry.price, Validators.min(0)],
      profitMargin: [entry.profitMargin, [Validators.min(0), Validators.max(100)]],
    });

    if (this.priceEntriesArray.disabled) {
      group.disable({ emitEvent: false });
    }

    return group;
  }

  recalculatePriceEntryPrice(group: FormGroup): void {
    const priceControl = group.get('price');
    const marginControl = group.get('profitMargin');

    if (!(priceControl instanceof FormControl) || !(marginControl instanceof FormControl)) {
      return;
    }

    const cost = this.form.get('costPrice')?.value;
    const tax = this.form.get('taxType')?.value;
    const price = this.calculateSalePrice(cost, marginControl.value, tax);

    priceControl.setValue(price, { emitEvent: false });
  }

  private calculateSalePrice(
    costPrice: number | string | null | undefined,
    profitMargin: number | string | null | undefined,
    taxType: string | null | undefined,
  ): number {
    const cost = Number(costPrice ?? 0);
    const margin = Number(profitMargin ?? 0);
    const taxRate = this.getTaxRate(taxType);

    return Math.round(cost * (1 + margin / 100) * (1 + taxRate / 100));
  }

  private getTaxRate(taxType: string | null | undefined): number {
    return taxType === 'IVA_5' ? 5 : taxType === 'IVA_8' ? 8 : taxType === 'IVA_19' ? 19 : 0;
  }

  private markPriceEntriesChanged(): void {
    this.priceEntriesVersion.update((version) => version + 1);
  }

  private clearPriceListSearch(): void {
    this.priceListSearch.setValue('', { emitEvent: false });
    this.priceListFilter.set('');
  }

  private createWarehouseGroup(entry: ProductWarehouse): FormGroup {
    const group = this.fb.group({
      id: [entry.id],
      warehouseId: [entry.warehouseId, Validators.required],
      locationId: [entry.locationId],
      unitOfMeasureId: [entry.unitOfMeasureId],
      isDefault: [entry.isDefault],
    });

    this.bindWarehouseQuickCreateSelections(group);
    this.bindWarehouseLocationOptions(group);

    if (this.warehousesArray.disabled) {
      group.disable({ emitEvent: false });
    }

    return group;
  }

  private createSupplierGroup(entry: ProductSupplier): FormGroup {
    const group = this.fb.group({
      id: [entry.id],
      supplierId: [entry.supplierId],
      supplierReference: [entry.supplierReference ?? ''],
      unitCost: [entry.unitCost ?? 0],
      isMain: [entry.isMain],
    });

    this.bindSupplierQuickCreateSelection(group);

    if (this.suppliersArray.disabled) {
      group.disable({ emitEvent: false });
    }

    return group;
  }

  private bindSupplierQuickCreateSelection(group: FormGroup): void {
    const supplierIdControl = group.get('supplierId');
    if (!(supplierIdControl instanceof FormControl)) {
      return;
    }

    this.previousSupplierSelections.set(
      group,
      this.normalizeWarehouseSelectValue(supplierIdControl.value),
    );

    supplierIdControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.isQuickCreateValue(value)) {
        return;
      }

      this.previousSupplierSelections.set(group, this.normalizeWarehouseSelectValue(value));
    });
  }

  private bindWarehouseQuickCreateSelections(group: FormGroup): void {
    const warehouseIdControl = group.get('warehouseId');
    const locationIdControl = group.get('locationId');
    const unitOfMeasureIdControl = group.get('unitOfMeasureId');

    if (
      !(warehouseIdControl instanceof FormControl) ||
      !(locationIdControl instanceof FormControl) ||
      !(unitOfMeasureIdControl instanceof FormControl)
    ) {
      return;
    }

    this.previousWarehouseSelections.set(
      group,
      this.normalizeWarehouseSelectValue(warehouseIdControl.value),
    );
    this.previousWarehouseLocationSelections.set(
      group,
      this.normalizeWarehouseSelectValue(locationIdControl.value),
    );
    this.previousWarehouseUomSelections.set(
      group,
      this.normalizeWarehouseSelectValue(unitOfMeasureIdControl.value),
    );

    warehouseIdControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.isQuickCreateValue(value)) {
        return;
      }
      this.previousWarehouseSelections.set(group, this.normalizeWarehouseSelectValue(value));
    });

    locationIdControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.isQuickCreateValue(value)) {
        return;
      }
      this.previousWarehouseLocationSelections.set(
        group,
        this.normalizeWarehouseSelectValue(value),
      );
    });

    unitOfMeasureIdControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.isQuickCreateValue(value)) {
          return;
        }
        this.previousWarehouseUomSelections.set(group, this.normalizeWarehouseSelectValue(value));
      });
  }

  private bindWarehouseLocationOptions(group: FormGroup): void {
    const warehouseIdControl = group.get('warehouseId');
    const locationIdControl = group.get('locationId');

    if (
      !(warehouseIdControl instanceof FormControl) ||
      !(locationIdControl instanceof FormControl)
    ) {
      return;
    }

    let previousWarehouseId = warehouseIdControl.value;
    this.syncWarehouseLocationOptions(group, previousWarehouseId, false);

    warehouseIdControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouseId) => {
        if (this.isQuickCreateValue(warehouseId)) {
          return;
        }
        const nextWarehouseId = warehouseId ?? null;
        const warehouseChanged = previousWarehouseId !== nextWarehouseId;
        previousWarehouseId = nextWarehouseId;
        this.syncWarehouseLocationOptions(group, nextWarehouseId, warehouseChanged);
      });
  }

  onWarehouseRowSelectionChange(group: FormGroup, value: string | null): void {
    if (!this.isQuickCreateValue(value)) {
      return;
    }

    this.restoreWarehouseRowControl(
      group,
      'warehouseId',
      this.previousWarehouseSelections.get(group) ?? null,
    );
    this.openCreateWarehouseForRow(group);
  }

  onWarehouseLocationRowSelectionChange(group: FormGroup, value: string | null): void {
    if (!this.isQuickCreateValue(value)) {
      return;
    }

    this.restoreWarehouseRowControl(
      group,
      'locationId',
      this.previousWarehouseLocationSelections.get(group) ?? null,
    );
    this.openCreateWarehouseLocationForRow(group);
  }

  onWarehouseUomRowSelectionChange(group: FormGroup, value: string | null): void {
    if (!this.isQuickCreateValue(value)) {
      return;
    }

    this.restoreWarehouseRowControl(
      group,
      'unitOfMeasureId',
      this.previousWarehouseUomSelections.get(group) ?? null,
    );
    this.openCreateWarehouseUomForRow(group);
  }

  onSupplierRowSelectionChange(group: FormGroup, value: string | null): void {
    if (!this.isQuickCreateValue(value)) {
      return;
    }

    this.restoreWarehouseRowControl(
      group,
      'supplierId',
      this.previousSupplierSelections.get(group) ?? null,
    );
    this.openCreateSupplierForRow(group);
  }

  private openCreateWarehouseForRow(group: FormGroup): void {
    this.dialog
      .open<QuickCreateWarehouseDialogComponent, QuickCreateWarehouseData, Warehouse>(
        QuickCreateWarehouseDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: '' } },
      )
      .afterClosed()
      .subscribe((warehouse) => {
        if (!warehouse) {
          return;
        }

        group.get('warehouseId')?.setValue(warehouse.id);
      });
  }

  private openCreateWarehouseLocationForRow(group: FormGroup): void {
    const warehouseId = this.normalizeWarehouseSelectValue(group.get('warehouseId')?.value);
    if (!warehouseId) {
      return;
    }

    this.dialog
      .open<
        QuickCreateWarehouseLocationDialogComponent,
        QuickCreateWarehouseLocationData,
        WarehouseLocation
      >(QuickCreateWarehouseLocationDialogComponent, {
        disableClose: true,
        width: '400px',
        data: { initialName: '', warehouseId },
      })
      .afterClosed()
      .subscribe((location) => {
        if (!location) {
          return;
        }

        this.reloadWarehouseLocations(warehouseId, group, location.id);
      });
  }

  private openCreateWarehouseUomForRow(group: FormGroup): void {
    this.dialog
      .open<QuickCreateUomDialogComponent, QuickCreateUomData, UnitOfMeasure>(
        QuickCreateUomDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: '' } },
      )
      .afterClosed()
      .subscribe((uom) => {
        if (!uom) {
          return;
        }

        group.get('unitOfMeasureId')?.setValue(uom.id);
      });
  }

  private openCreateSupplierForRow(group: FormGroup): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        {
          disableClose: true,
          width: '440px',
        },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) {
          return;
        }

        group.get('supplierId')?.setValue(supplier.id);
      });
  }

  private reloadWarehouseLocations(
    warehouseId: string,
    group: FormGroup,
    locationIdToSelect?: string,
  ): void {
    this.warehouseLocationService
      .getByWarehouseId(warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          this.warehouseLocationsByWarehouseId.update((current) => ({
            ...current,
            [warehouseId]: locations,
          }));

          if (locationIdToSelect) {
            group.get('locationId')?.setValue(locationIdToSelect);
          }
        },
      });
  }

  private restoreWarehouseRowControl(
    group: FormGroup,
    controlName: 'warehouseId' | 'locationId' | 'unitOfMeasureId' | 'supplierId',
    value: string | null,
  ): void {
    group.get(controlName)?.setValue(value, { emitEvent: false });
  }

  private isQuickCreateValue(value: unknown): value is string {
    return value === this.quickCreateOptionValue;
  }

  private normalizeWarehouseSelectValue(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 && !this.isQuickCreateValue(value)
      ? value
      : null;
  }

  private syncWarehouseLocationOptions(
    group: FormGroup,
    warehouseId: string | null,
    clearInvalidSelection: boolean,
  ): void {
    const locationIdControl = group.get('locationId');
    if (!(locationIdControl instanceof FormControl)) {
      return;
    }

    if (!warehouseId) {
      locationIdControl.setValue(null, { emitEvent: false });
      locationIdControl.disable({ emitEvent: false });
      return;
    }

    if (group.enabled) {
      locationIdControl.enable({ emitEvent: false });
    }

    const cachedLocations = this.warehouseLocationsByWarehouseId()[warehouseId];
    if (cachedLocations) {
      this.clearInvalidWarehouseLocation(locationIdControl, cachedLocations, clearInvalidSelection);
      return;
    }

    this.warehouseLocationService
      .getByWarehouseId(warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          this.warehouseLocationsByWarehouseId.update((current) => ({
            ...current,
            [warehouseId]: locations,
          }));
          this.clearInvalidWarehouseLocation(locationIdControl, locations, clearInvalidSelection);
        },
        error: () => {
          this.warehouseLocationsByWarehouseId.update((current) => ({
            ...current,
            [warehouseId]: [],
          }));
          this.clearInvalidWarehouseLocation(locationIdControl, [], clearInvalidSelection);
        },
      });
  }

  private clearInvalidWarehouseLocation(
    locationIdControl: FormControl,
    locations: WarehouseLocation[],
    clearInvalidSelection: boolean,
  ): void {
    if (!clearInvalidSelection) {
      return;
    }

    const locationId = locationIdControl.value as string | null;
    if (!locationId) {
      return;
    }

    const isValidLocation = locations.some((location) => location.id === locationId);
    if (!isValidLocation) {
      locationIdControl.setValue(null, { emitEvent: false });
    }
  }

  private syncWarehouseLocationControlStates(): void {
    this.warehousesArray.controls.forEach((control) => {
      const warehouseId = control.get('warehouseId')?.value as string | null;
      const locationIdControl = control.get('locationId');

      if (!(locationIdControl instanceof FormControl)) {
        return;
      }

      if (!warehouseId) {
        locationIdControl.disable({ emitEvent: false });
        return;
      }

      if (control.enabled) {
        locationIdControl.enable({ emitEvent: false });
      }
    });
  }

  private syncPriceEntriesWithCatalog(): void {
    const lists = this.priceListService.priceLists.value() ?? [];
    const listsById = new Map(lists.map((priceList) => [priceList.id, priceList]));
    const firstIndexByPriceListId = new Map<string, number>();

    this.priceEntriesArray.controls.forEach((control, index) => {
      const priceListId = control.get('priceListId')?.value as string | null;
      if (priceListId && !firstIndexByPriceListId.has(priceListId)) {
        firstIndexByPriceListId.set(priceListId, index);
      }
    });

    let changed = false;

    for (let index = this.priceEntriesArray.length - 1; index >= 0; index -= 1) {
      const priceListId = this.priceEntriesArray.at(index).get('priceListId')?.value as
        | string
        | null;
      if (!priceListId || firstIndexByPriceListId.get(priceListId) !== index) {
        this.priceEntriesArray.removeAt(index);
        changed = true;
      }
    }

    this.priceEntriesArray.controls.forEach((control) => {
      const priceListId = control.get('priceListId')?.value as string | null;
      if (!priceListId) {
        return;
      }

      const priceList = listsById.get(priceListId);
      if (priceList && control.get('priceListName')?.value !== priceList.name) {
        control.patchValue({ priceListName: priceList.name }, { emitEvent: false });
      }
    });

    if (changed) {
      this.markPriceEntriesChanged();
    }
  }

  private loadIntoForm(data: Product): void {
    this.withDependentResetsSuppressed(() => {
      this.form.patchValue({
        productCode: data.productCode,
        name: data.name,
        barcode: data.barcode ?? '',
        reference: data.reference ?? '',
        description: data.description ?? '',
        productTypeId: data.productTypeId,
        productStateId: data.productStateId,
        brandId: data.brandId,
        modelId: data.modelId,
        categoryId: data.categoryId,
        groupId: data.groupId,
        unitOfMeasureId: data.unitOfMeasureId,
        costPrice: data.costPrice,
        profitMargin: data.profitMargin,
        taxType: data.taxType,
        salePrice: data.salePrice,
        costingMethod: data.costingMethod,
        initialStock: data.initialStock,
        minStock: data.minStock,
        maxStock: data.maxStock,
        totalStock: data.totalStock ?? 0,
        manufacturedInHouse: data.manufacturedInHouse,
        costAffectingExp: data.costAffectingExp,
        manageLots: data.manageLots,
        perishable: data.perishable,
        belongsToProduct: data.belongsToProduct,
        sellBelowMin: data.sellBelowMin,
        inventoriable: data.inventoriable,
        incomeAccountId: data.incomeAccountId,
        inventoryAccountId: data.inventoryAccountId,
        costOfSalesAcctId: data.costOfSalesAcctId,
        accountingTemplateId: data.accountingTemplateId,
        serialNumber: data.serialNumber ?? '',
        originCountry: data.originCountry ?? '',
        specifications: data.specifications ?? '',
        version: data.version,
      });
    });

    this.warehousesArray.clear();
    (data.warehouses ?? []).forEach((w) => this.warehousesArray.push(this.createWarehouseGroup(w)));

    this.suppliersArray.clear();
    (data.suppliers ?? []).forEach((s) => this.suppliersArray.push(this.createSupplierGroup(s)));

    this.imagesArray.clear();
    (data.images ?? []).forEach((i) =>
      this.imagesArray.push(
        this.createImageGroup({
          id: i.id,
          imageUrl: i.imageUrl,
          displayOrder: i.displayOrder,
        }),
      ),
    );
    this.syncImageDisplayOrder();
    this.imageUploadError.set(null);

    this.promotionsArray.clear();
    (data.promotions ?? []).forEach((p) =>
      this.promotionsArray.push(
        this.fb.group({
          id: [p.id],
          name: [p.name],
          discountPct: [p.discountPct],
          startDate: [p.startDate],
          endDate: [p.endDate],
          isActive: [p.isActive],
        }),
      ),
    );

    this.priceEntriesArray.clear();
    (data.priceEntries ?? []).forEach((pe) =>
      this.priceEntriesArray.push(
        this.createPriceEntryGroup({
          id: pe.id,
          priceListId: pe.priceListId,
          priceListName: '',
          price: pe.price,
          profitMargin: pe.profitMargin,
        }),
      ),
    );
    this.markPriceEntriesChanged();
    this.clearPriceListSearch();
    this.syncPriceEntriesWithCatalog();
  }

  private enableForm(): void {
    this.form.enable();
    [
      this.typeDisplay,
      this.stateDisplay,
      this.brandDisplay,
      this.modelDisplay,
      this.categoryDisplay,
      this.groupDisplay,
      this.uomDisplay,
    ].forEach((c) => c.enable());
    this.warehousesArray.enable();
    this.syncWarehouseLocationControlStates();
    this.suppliersArray.enable();
    this.imagesArray.enable();
    this.promotionsArray.enable();
    this.priceEntriesArray.enable();
    this.formulasFormArray.enable();
    this.presentationsFormArray.enable();
    this.priceListSearch.enable({ emitEvent: false });
  }

  private disableForm(): void {
    this.form.disable();
    [
      this.typeDisplay,
      this.stateDisplay,
      this.brandDisplay,
      this.modelDisplay,
      this.categoryDisplay,
      this.groupDisplay,
      this.uomDisplay,
    ].forEach((c) => c.disable());
    this.warehousesArray.disable();
    this.suppliersArray.disable();
    this.imagesArray.disable();
    this.promotionsArray.disable();
    this.priceEntriesArray.disable();
    this.formulasFormArray.disable();
    this.presentationsFormArray.disable();
    this.priceListSearch.disable({ emitEvent: false });
  }

  // ── Autocomplete: onSelected ──────────────────────────────────────
  onTypeSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncTypeDisplay();
      this.openCreateType();
      return;
    }
    this.form.get('productTypeId')!.setValue(ev.option.value);
    this.typeDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.typeFilter.set('');
  }

  onStateSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncStateDisplay();
      this.openCreateState();
      return;
    }
    this.form.get('productStateId')!.setValue(ev.option.value);
    this.stateDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.stateFilter.set('');
  }

  onBrandSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncBrandDisplay();
      this.openCreateBrand();
      return;
    }
    this.form.get('brandId')!.setValue(ev.option.value);
    this.brandDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.brandFilter.set('');
  }

  onModelSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncModelDisplay();
      this.openCreateModel();
      return;
    }
    this.form.get('modelId')!.setValue(ev.option.value);
    this.modelDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.modelFilter.set('');
  }

  onCategorySelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncCategoryDisplay();
      this.openCreateCategory();
      return;
    }
    this.form.get('categoryId')!.setValue(ev.option.value);
    this.categoryDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.categoryFilter.set('');
  }

  onGroupSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncGroupDisplay();
      this.openCreateGroup();
      return;
    }
    this.form.get('groupId')!.setValue(ev.option.value);
    this.groupDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.groupFilter.set('');
  }

  onUomSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncUomDisplay();
      this.openCreateUom();
      return;
    }
    this.form.get('unitOfMeasureId')!.setValue(ev.option.value);
    this.uomDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.uomFilter.set('');
  }

  onPriceListSelected(ev: MatAutocompleteSelectedEvent): void {
    const priceListId = ev.option.value as string;
    const priceList = this.priceListService.priceLists
      .value()
      ?.find((entry) => entry.id === priceListId && entry.active);

    if (!priceList) {
      this.clearPriceListSearch();
      return;
    }

    const alreadyExists = this.priceEntriesArray.controls.some(
      (control) => control.get('priceListId')?.value === priceListId,
    );
    if (alreadyExists) {
      this.clearPriceListSearch();
      return;
    }

    this.priceEntriesArray.push(this.createPriceEntryGroup(this.createNewPriceEntry(priceList)));
    this.markPriceEntriesChanged();
    this.clearPriceListSearch();
  }

  // ── Autocomplete: syncDisplay (on blur) ───────────────────────────
  syncTypeDisplay(): void {
    const id = this.form.get('productTypeId')!.value;
    this.typeDisplay.setValue(
      this.typeService.types.value()?.find((t) => t.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.typeFilter.set('');
  }

  syncStateDisplay(): void {
    const id = this.form.get('productStateId')!.value;
    this.stateDisplay.setValue(
      this.stateService.states.value()?.find((s) => s.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.stateFilter.set('');
  }

  syncBrandDisplay(): void {
    const id = this.form.get('brandId')!.value;
    this.brandDisplay.setValue(
      this.brandService.brands.value()?.find((b) => b.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.brandFilter.set('');
  }

  syncModelDisplay(): void {
    const id = this.form.get('modelId')!.value;
    this.modelDisplay.setValue(
      this.modelService.models.value()?.find((m) => m.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.modelFilter.set('');
  }

  syncCategoryDisplay(): void {
    const id = this.form.get('categoryId')!.value;
    this.categoryDisplay.setValue(
      this.catCategoryService.categories.value()?.find((c) => c.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.categoryFilter.set('');
  }

  syncGroupDisplay(): void {
    const id = this.form.get('groupId')!.value;
    this.groupDisplay.setValue(
      this.groupService.groups.value()?.find((g) => g.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.groupFilter.set('');
  }

  syncUomDisplay(): void {
    const id = this.form.get('unitOfMeasureId')!.value;
    const u = this.uomService.units.value()?.find((u) => u.id === id);
    this.uomDisplay.setValue(u ? `${u.code} — ${u.name}` : '', { emitEvent: false });
    this.uomFilter.set('');
  }

  // ── Quick-create dialogs ──────────────────────────────────────────
  openCreateType(): void {
    this.dialog
      .open<QuickCreateProductTypeDialogComponent, QuickCreateProductTypeData, ProductType>(
        QuickCreateProductTypeDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: this.typeFilter() } },
      )
      .afterClosed()
      .subscribe((t) => {
        if (!t) return;
        this.form.get('productTypeId')!.setValue(t.id);
        this.typeDisplay.setValue(t.name, { emitEvent: false });
        this.typeFilter.set('');
      });
  }

  openCreateState(): void {
    this.dialog
      .open<QuickCreateProductStateDialogComponent, QuickCreateProductStateData, ProductState>(
        QuickCreateProductStateDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: this.stateFilter() } },
      )
      .afterClosed()
      .subscribe((s) => {
        if (!s) return;
        this.form.get('productStateId')!.setValue(s.id);
        this.stateDisplay.setValue(s.name, { emitEvent: false });
        this.stateFilter.set('');
      });
  }

  openCreateBrand(): void {
    this.dialog
      .open<QuickCreateBrandDialogComponent, QuickCreateBrandData, Brand>(
        QuickCreateBrandDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: this.brandFilter() } },
      )
      .afterClosed()
      .subscribe((b) => {
        if (!b) return;
        this.form.get('brandId')!.setValue(b.id);
        this.brandDisplay.setValue(b.name, { emitEvent: false });
        this.brandFilter.set('');
      });
  }

  openCreateModel(): void {
    this.dialog
      .open<QuickCreateProductModelDialogComponent, QuickCreateProductModelData, ProductModel>(
        QuickCreateProductModelDialogComponent,
        {
          disableClose: true,
          width: '400px',
          data: { initialName: this.modelFilter(), brandId: this.form.get('brandId')!.value },
        },
      )
      .afterClosed()
      .subscribe((m) => {
        if (!m) return;
        this.form.get('modelId')!.setValue(m.id);
        this.modelDisplay.setValue(m.name, { emitEvent: false });
        this.modelFilter.set('');
      });
  }

  openCreateCategory(): void {
    this.dialog
      .open<
        QuickCreateProductCategoryDialogComponent,
        QuickCreateProductCategoryData,
        ProductCatalogCategory
      >(QuickCreateProductCategoryDialogComponent, {
        disableClose: true,
        width: '400px',
        data: { initialName: this.categoryFilter() },
      })
      .afterClosed()
      .subscribe((c) => {
        if (!c) return;
        this.form.get('categoryId')!.setValue(c.id);
        this.categoryDisplay.setValue(c.name, { emitEvent: false });
        this.categoryFilter.set('');
      });
  }

  openCreateGroup(): void {
    this.dialog
      .open<QuickCreateProductGroupDialogComponent, QuickCreateProductGroupData, ProductGroup>(
        QuickCreateProductGroupDialogComponent,
        {
          disableClose: true,
          width: '400px',
          data: { initialName: this.groupFilter(), categoryId: this.form.get('categoryId')!.value },
        },
      )
      .afterClosed()
      .subscribe((g) => {
        if (!g) return;
        this.form.get('groupId')!.setValue(g.id);
        this.groupDisplay.setValue(g.name, { emitEvent: false });
        this.groupFilter.set('');
      });
  }

  openCreateUom(): void {
    this.dialog
      .open<QuickCreateUomDialogComponent, QuickCreateUomData, UnitOfMeasure>(
        QuickCreateUomDialogComponent,
        { disableClose: true, width: '400px', data: { initialName: this.uomFilter() } },
      )
      .afterClosed()
      .subscribe((u) => {
        if (!u) return;
        this.form.get('unitOfMeasureId')!.setValue(u.id);
        this.uomDisplay.setValue(`${u.code} — ${u.name}`, { emitEvent: false });
        this.uomFilter.set('');
      });
  }

  // ── FormArray row operations ──────────────────────────────────────
  addWarehouse(): void {
    this.warehousesArray.push(
      this.createWarehouseGroup({
        id: null,
        warehouseId: '',
        locationId: null,
        unitOfMeasureId: null,
        isDefault: false,
      }),
    );
  }
  removeWarehouse(i: number): void {
    this.warehousesArray.removeAt(i);
  }

  addSupplier(): void {
    this.suppliersArray.push(
      this.createSupplierGroup({
        id: null,
        supplierId: '' as unknown as string,
        supplierReference: null,
        unitCost: 0,
        isMain: false,
      }),
    );
  }
  removeSupplier(i: number): void {
    this.suppliersArray.removeAt(i);
  }

  addImage(): void {
    if (this.imagesArray.length >= this.maxProductImages) return;
    this.imagesArray.push(
      this.fb.group({
        id: [null as string | null],
        imageUrl: ['', Validators.required],
        displayOrder: [this.imagesArray.length],
      }),
    );

    this.syncImageDisplayOrder();
  }

  private syncImageDisplayOrder(): void {
    this.imagesArray.controls.forEach((control, index) => {
      control.get('displayOrder')?.setValue(index, { emitEvent: false });
    });
  }

  private createImageGroup(entry: {
    id: string | null;
    imageUrl: string;
    displayOrder: number;
  }): FormGroup {
    const group = this.fb.group({
      id: [entry.id],
      imageUrl: [entry.imageUrl, Validators.required],
      displayOrder: [entry.displayOrder],
    });

    if (this.imagesArray.disabled) {
      group.disable({ emitEvent: false });
    }

    return group;
  }

  private async ensureImageDropzone(host: HTMLDivElement): Promise<void> {
    if (this.dropzone?.element === host) {
      return;
    }

    const { default: DropzoneCtor } = await import('dropzone');
    DropzoneCtor.autoDiscover = false;

    this.destroyImageDropzone();

    const dropzone = new DropzoneCtor(host, {
      url: '/api/v1/uploads/products/images',
      autoProcessQueue: false,
      clickable: '.product-image-dropzone__button',
      previewsContainer: false,
      createImageThumbnails: false,
      acceptedFiles: 'image/*',
    });

    dropzone.on('addedfile', (file) => {
      const selectedFile = file as File;
      dropzone.removeFile(selectedFile);
      this.uploadImage(selectedFile);
    });

    dropzone.on('error', (...args) => {
      const message = args[1];
      this.imageUploadError.set(
        typeof message === 'string' ? message : 'No se pudo procesar la imagen seleccionada.',
      );
    });

    this.dropzone = dropzone;
  }

  private destroyImageDropzone(): void {
    this.dropzone?.destroy();
    this.dropzone = null;
  }

  private uploadImage(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.imageUploadError.set('Solo se permiten archivos de imagen.');
      return;
    }

    if (this.imageUploadSlotsRemaining() <= 0) {
      this.imageUploadError.set(`Solo podés cargar hasta ${this.maxProductImages} imágenes.`);
      return;
    }

    this.imageUploadError.set(null);
    this.uploadingImages.update((count) => count + 1);

    this.productImageUploadService
      .upload(file)
      .pipe(
        finalize(() => {
          this.uploadingImages.update((count) => Math.max(0, count - 1));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ imageUrl }) => {
          this.imagesArray.push(
            this.fb.group({
              id: [null as string | null],
              imageUrl: [imageUrl, Validators.required],
              displayOrder: [this.imagesArray.length],
            }),
          );
          this.syncImageDisplayOrder();
        },
        error: () => {
          this.imageUploadError.set('No se pudo subir la imagen. Intentá nuevamente.');
        },
      });
  }

  imageUploadSlotsRemaining(): number {
    return Math.max(0, this.maxProductImages - this.imagesArray.length - this.uploadingImages());
  }

  imageUploadSlotsLabel(): string {
    return this.imageUploadSlotsRemaining() === 1 ? 'lugar' : 'lugares';
  }

  resolveImageUrl(imageUrl: string | null | undefined): string {
    const normalizedUrl = imageUrl?.trim() ?? '';

    if (!normalizedUrl) {
      return '';
    }

    if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('data:')) {
      return normalizedUrl;
    }

    if (normalizedUrl.startsWith('/')) {
      return normalizedUrl;
    }

    return normalizedUrl.startsWith('media/') ? `/${normalizedUrl}` : `/media/${normalizedUrl}`;
  }

  removeImage(i: number): void {
    this.imagesArray.removeAt(i);
    this.syncImageDisplayOrder();
  }

  addPromotion(): void {
    this.promotionsArray.push(
      this.fb.group({
        id: [null as string | null],
        name: ['', Validators.required],
        discountPct: [0],
        startDate: [''],
        endDate: [''],
        isActive: [false],
      }),
    );
  }
  removePromotion(i: number): void {
    this.promotionsArray.removeAt(i);
  }

  removePriceEntry(i: number): void {
    this.priceEntriesArray.removeAt(i);
    this.markPriceEntriesChanged();
  }

  private createNewPriceEntry(priceList: PriceList): {
    id: string | null;
    priceListId: string;
    priceListName: string;
    price: number;
    profitMargin: number;
  } {
    return {
      id: null,
      priceListId: priceList.id,
      priceListName: priceList.name,
      price: 0,
      profitMargin: 0,
    };
  }

  // ── Toolbar actions ───────────────────────────────────────────────
  nuevo(): void {
    this.router.navigate(['..', 'nuevo'], { relativeTo: this.route });
  }

  editar(): void {
    this.mode.set('edit');
    this.enableForm();
  }

  save(): void {
    if (
      this.form.invalid ||
      this.warehousesArray.invalid ||
      this.suppliersArray.invalid ||
      this.imagesArray.invalid ||
      this.priceEntriesArray.invalid
    ) {
      this.form.markAllAsTouched();
      this.warehousesArray.markAllAsTouched();
      this.suppliersArray.markAllAsTouched();
      this.imagesArray.markAllAsTouched();
      this.priceEntriesArray.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Revisá los campos obligatorios.',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const v = this.form.getRawValue();
    const request: ProductRequest = {
      productCode: v.productCode!,
      name: v.name!,
      barcode: v.barcode || null,
      reference: v.reference || null,
      description: v.description || null,
      productTypeId: v.productTypeId,
      productStateId: v.productStateId,
      brandId: v.brandId,
      modelId: v.modelId,
      categoryId: v.categoryId,
      groupId: v.groupId,
      unitOfMeasureId: v.unitOfMeasureId,
      costPrice: v.costPrice ?? 0,
      profitMargin: v.profitMargin ?? 0,
      taxType: v.taxType as any,
      costingMethod: v.costingMethod as any,
      initialStock: v.initialStock ?? 0,
      minStock: v.minStock ?? 0,
      maxStock: v.maxStock ?? 0,
      manufacturedInHouse: v.manufacturedInHouse ?? false,
      costAffectingExp: v.costAffectingExp ?? false,
      manageLots: v.manageLots ?? false,
      perishable: v.perishable ?? false,
      belongsToProduct: v.belongsToProduct ?? false,
      sellBelowMin: v.sellBelowMin ?? false,
      inventoriable: v.inventoriable ?? true,
      incomeAccountId: v.incomeAccountId,
      inventoryAccountId: v.inventoryAccountId,
      costOfSalesAcctId: v.costOfSalesAcctId,
      accountingTemplateId: v.accountingTemplateId,
      serialNumber: v.serialNumber || null,
      originCountry: v.originCountry || null,
      specifications: v.specifications || null,
      version: v.version ?? 0,
      warehouses: this.warehousesArray.getRawValue().map((w: any) => ({
        id: w.id,
        warehouseId: w.warehouseId,
        locationId: w.locationId || null,
        unitOfMeasureId: w.unitOfMeasureId || null,
        isDefault: w.isDefault,
      })),
      suppliers: this.suppliersArray
        .getRawValue()
        .filter((s: any) => !!s.supplierId)
        .map((s: any) => ({
          id: s.id,
          supplierId: s.supplierId,
          supplierReference: s.supplierReference || null,
          unitCost: s.unitCost ?? null,
          isMain: s.isMain,
        })),
      images: this.imagesArray.getRawValue().map((i: any) => ({
        id: i.id,
        imageUrl: i.imageUrl,
        displayOrder: i.displayOrder,
      })),
      promotions: this.promotionsArray.getRawValue().map((p: any) => ({
        id: p.id,
        name: p.name,
        discountPct: p.discountPct,
        startDate: p.startDate,
        endDate: p.endDate,
        isActive: p.isActive,
      })),
      priceEntries: this.priceEntriesArray.getRawValue().map((pe: any) => ({
        id: pe.id,
        priceListId: pe.priceListId,
        price: pe.price === '' || pe.price === null ? 0 : Number(pe.price),
        profitMargin:
          pe.profitMargin === '' || pe.profitMargin === null ? 0 : Number(pe.profitMargin),
      })),
    };

    this.saving.set(true);
    this.error.set(null);
    const id = this.loadedId();
    const op$ = id ? this.service.update(id, request) : this.service.create(request);

    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.mode.set('view');
        this.disableForm();
        this.service.reload();
        this.clearLocalDraft();
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        if (!id) {
          this.router.navigate(['..', saved.id], { relativeTo: this.route });
        } else {
          this.loadedId.set(saved.id);
          this.loadIntoForm(saved);
        }
      },
      error: (err) => {
        this.saving.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: err?.error?.message ?? 'Error al guardar. Intentá de nuevo.',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  async cancelar(): Promise<void> {
    const isNew = this.mode() === 'new';
    const result = await Swal.fire({
      icon: 'warning',
      title: isNew ? '¿Cancelar creación?' : '¿Cancelar edición?',
      text: isNew ? 'Los datos ingresados se perderán.' : 'Los cambios no guardados se perderán.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const id = this.loadedId();
    if (id) {
      this.mode.set('view');
      this.disableForm();
      this.service.getById(id).subscribe({
        next: (data) => this.loadIntoForm(data),
        error: () => this.error.set('Error al recargar los datos.'),
      });
    } else {
      this.resetForm();
    }
  }

  buscar(): void {
    this.showSearch.set(!this.showSearch());
    if (this.showSearch()) {
      this.searchPage.set(0);
      this.searchRequests.next({
        query: this.searchControl.getRawValue(),
        page: 0,
        size: this.searchPageSize(),
      });
      return;
    }

    this.closeSearchPanel();
  }

  closeSearchPanel(): void {
    this.showSearch.set(false);
    this.searchControl.setValue('', { emitEvent: false });
    this.searchResults.set([]);
    this.searchPageData.set(null);
    this.focusedSearchResultId.set(null);
  }

  focusFirstSearchRow(): void {
    if (!this.showSearch() || !this.isBrowser) return;
    setTimeout(() => {
      const row = document.querySelector<HTMLElement>('.pf-search-table .mat-mdc-row');
      row?.focus();
    });
  }

  onSearchRowKeydown(event: KeyboardEvent, product: Product): void {
    if (!this.isBrowser) return;
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('.pf-search-table .mat-mdc-row'),
    );
    const currentIndex = rows.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.selectSearchResult(product);
        break;
      case 'Escape':
        event.preventDefault();
        this.closeSearchPanel();
        break;
      case 'ArrowDown':
        event.preventDefault();
        rows[Math.min(currentIndex + 1, rows.length - 1)]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) rows[currentIndex - 1].focus();
        else document.querySelector<HTMLElement>('.pf-search-field input')?.focus();
        break;
      case 'PageDown':
        event.preventDefault();
        rows[Math.min(currentIndex + 5, rows.length - 1)]?.focus();
        break;
      case 'PageUp':
        event.preventDefault();
        rows[Math.max(currentIndex - 5, 0)]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        rows[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        rows[rows.length - 1]?.focus();
        break;
    }
  }

  onSearchPageChange(event: PageEvent): void {
    this.searchPage.set(event.pageIndex);
    this.searchPageSize.set(event.pageSize);
    this.searchRequests.next({
      query: this.searchControl.getRawValue(),
      page: event.pageIndex,
      size: event.pageSize,
    });
  }

  isSearchRowSelected(product: Product): boolean {
    return (
      this.selectedSearchResultId() === product.id || this.focusedSearchResultId() === product.id
    );
  }

  selectSearchResult(p: Product): void {
    this.selectedSearchResultId.set(p.id);
    this.closeSearchPanel();
    this.router.navigate(['..', p.id], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  getWarehouseName(id: string | null): string {
    if (!id) return '';
    return this.warehouseService.warehouses.value()?.find((w) => w.id === id)?.name ?? id;
  }

  getWarehouseLocations(warehouseId: string | null): WarehouseLocation[] {
    if (!warehouseId) {
      return [];
    }

    return this.warehouseLocationsByWarehouseId()[warehouseId] ?? [];
  }

  getWarehouseLocationLabel(location: WarehouseLocation): string {
    return location.active ? location.name : `${location.name} (inactiva)`;
  }

  templateLabel(accountingTemplateId: string | null): string {
    if (!accountingTemplateId) return '';
    const tpls = this.templateService.templates.value() ?? [];
    const found = tpls.find((t) => t.id === accountingTemplateId);
    return found ? `${found.code} — ${found.name}` : '';
  }
}
