import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { ProductService } from '../../../../core/services/product.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { CompanyConfigService } from '../../../../core/services/company-config.service';
import { PurchaseRetentionConfigService } from '../../../../core/services/purchase-retention-config.service';
import { QuickCreateSupplierDialogComponent } from '../../../inventario/products/dialogs/quick-create-supplier.dialog';
import type {
  ThirdParty,
  ThirdPartySupplierOption,
} from '../../../../core/models/third-party.model';
import type {
  PurchaseOrder,
  PurchaseOrderRequest,
} from '../../../../core/models/purchase-order.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';
import type { Product } from '../../../../core/models/product.model';
import { TAX_LABELS, TAX_RATES } from '../../../../core/models/purchase-order.model';
import type { TaxType } from '../../../../core/models/purchase-order.model';
import type { PurchaseRetentionConfig } from '../../../../core/models/purchase-retention-config.model';

type LineForm = FormGroup<{
  productId: FormControl<string>;
  productDisplay: FormControl<string>;
  warehouseId: FormControl<string>;
  orderedQty: FormControl<number>;
  discountPct: FormControl<number>;
  taxType: FormControl<string>;
  unitCost: FormControl<number>;
}>;

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './orden-form.html',
  styleUrl: './orden-form.css',
})
export class OrdenFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PurchaseOrderService);
  readonly productService = inject(ProductService);
  private readonly warehouseService = inject(WarehouseService);
  readonly thirdPartyService = inject(ThirdPartyService);
  readonly uomService = inject(UnitOfMeasureService);
  private readonly companyConfigService = inject(CompanyConfigService);
  private readonly retentionConfigService = inject(PurchaseRetentionConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly TAX_LABELS = TAX_LABELS;

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEditing = signal(false);
  private loadedId: string | null = null;
  readonly orderStatus = signal<string | null>(null);
  readonly productSearch = signal<Record<number, string>>({});
  readonly orderTotal = signal(0);
  readonly orderSubtotal = signal(0);
  readonly orderDiscount = signal(0);
  readonly orderIva = signal(0);
  readonly orderRetefuente = signal(0);
  readonly retentionConfigs = signal<PurchaseRetentionConfig[]>([]);
  readonly supplierTaxRegime = signal<string | null>(null);
  readonly supplierPersonType = signal<string | null>(null);
  readonly lineSubtotals = signal<number[]>([]);
  readonly lineDiscountAmounts = signal<number[]>([]);
  readonly lineIvaAmounts = signal<number[]>([]);
  readonly applicableRetentions = computed(() => {
    const base = this.orderSubtotal() - this.orderDiscount();
    const regime = this.supplierTaxRegime();
    const person = this.supplierPersonType();
    return this.retentionConfigs()
      .filter((c) => c.active)
      .filter((c) => !c.appliesToTaxRegime || c.appliesToTaxRegime === regime)
      .filter((c) => !c.appliesToPersonType || c.appliesToPersonType === person)
      .filter((c) => base >= (c.baseMin ?? 0))
      .map((c) => ({
        name: c.name,
        rate: c.rate,
        amount: base * (c.rate / 100),
      }));
  });

  // ── New purchase order fields ────────────────────────────────────
  readonly supplierAddress = signal<string>('');
  readonly supplierPhone = signal<string>('');
  readonly calculatedDueDate = signal<string>('');
  readonly paymentMethods = ['EFECTIVO', 'TRANSFERENCIA', 'CREDITO', 'CHEQUE', 'OTRO'];
  readonly supportDocumentTypes = ['COTIZACION', 'CONTRATO', 'ORDEN_COMPRA', 'OTRO'];
  readonly currencies = ['COP', 'USD', 'EUR'];

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Buyer employee autocomplete ───────────────────────────────────
  readonly buyerDisplay = new FormControl('', { nonNullable: true });
  readonly employees = signal<ThirdParty[]>([]);
  readonly buyerSearch = signal('');

  readonly filteredEmployees = computed(() => {
    const q = this.buyerSearch().toLowerCase().trim();
    if (!q) return this.employees();
    return this.employees().filter(
      (e) => e.name.toLowerCase().includes(q) || e.numIdentification.includes(q),
    );
  });

  // ── Catalog data ──────────────────────────────────────────────────
  readonly products = computed(() => this.productService.products.value()?.content ?? []);
  readonly warehouses = computed(() => this.warehouseService.warehouses.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    orderDate: [new Date(), Validators.required],
    dueDate: [''],
    buyerId: [''],
    paymentMethod: [''],
    supportDocumentType: [''],
    supportDocumentNumber: [''],
    currency: ['COP'],
    notes: [''],
    linesArray: this.fb.array<LineForm>([]),
  });

  readonly linesArray = this.form.controls.linesArray;

  /** Abreviatura de unidad de medida por índice de línea (ej: { 0: 'kg', 1: 'und' }) */
  readonly lineUnitMap = signal<Record<number, string>>({});

  // Re-resolve all line units when the UOM catalog loads (handles late-arriving data)
  private readonly _uomEffect = effect(() => {
    this.uomService.units.value(); // track this signal
    untracked(() => {
      if (this.linesArray.length > 0) this.resolveAllLineUnits();
    });
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);

      if (!id) {
        this.loadedId = null;
        this.isEditing.set(false);
        this.orderStatus.set(null);
        this.resetForm();
      } else {
        this.loadedId = id;
        this.isEditing.set(true);
        this.loadOrder(id);
      }
    });

    this.linesArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcTotals());

    this.form.controls.orderDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcDueDate());

    this.thirdPartyService.getEmployees().subscribe((emps) => this.employees.set(emps));

    this.companyConfigService.getConfig().subscribe((config) => {
      // keep company config for future use
    });

    this.retentionConfigService.listActive().subscribe((configs) => {
      this.retentionConfigs.set(configs);
    });
  }

  private recalcTotals(): void {
    const lines = this.linesArray.getRawValue();
    const subtotals = lines.map((l) => (l.orderedQty || 0) * (l.unitCost || 0));
    const discountAmounts = subtotals.map((sub, i) => sub * ((lines[i].discountPct || 0) / 100));
    const ivaAmounts = subtotals.map((sub, i) => {
      const taxable = sub - discountAmounts[i];
      const rate = TAX_RATES[(lines[i].taxType || 'EXENTO') as TaxType] || 0;
      return taxable * (rate / 100);
    });

    this.lineSubtotals.set(subtotals);
    this.lineDiscountAmounts.set(discountAmounts);
    this.lineIvaAmounts.set(ivaAmounts);

    const totalSubtotal = subtotals.reduce((sum, v) => sum + v, 0);
    const totalDiscount = discountAmounts.reduce((sum, v) => sum + v, 0);
    const totalIva = ivaAmounts.reduce((sum, v) => sum + v, 0);

    this.orderSubtotal.set(totalSubtotal);
    this.orderDiscount.set(totalDiscount);
    this.orderIva.set(totalIva);

    const totalRete = this.applicableRetentions().reduce((sum, r) => sum + r.amount, 0);
    this.orderRetefuente.set(totalRete);
    this.orderTotal.set(totalSubtotal - totalDiscount + totalIva - totalRete);
  }

  private recalcDueDate(): void {
    const supplierId = this.form.controls.supplierId.getRawValue();
    if (!supplierId) return;
    this.thirdPartyService.getById(supplierId).subscribe((supplier) => {
      if (supplier.creditDays > 0) {
        const orderDate = this.form.controls.orderDate.getRawValue();
        const dueDate = this.addDays(orderDate, supplier.creditDays);
        this.form.controls.dueDate.setValue(dueDate);
        this.calculatedDueDate.set(dueDate);
      }
    });
  }

  taxLabel(taxType: string): string {
    return TAX_LABELS[taxType as TaxType] ?? 'Exento';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  addDays(date: Date, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private resetForm(): void {
    this.form.reset({
      orderDate: new Date(),
      dueDate: '',
      buyerId: '',
      paymentMethod: '',
      supportDocumentType: '',
      supportDocumentNumber: '',
      currency: 'COP',
      notes: '',
      supplierId: '',
    });
    this.supplierDisplay.setValue('');
    this.supplierAddress.set('');
    this.supplierPhone.set('');
    this.calculatedDueDate.set('');
    this.buyerDisplay.setValue('');
    this.linesArray.clear();
    this.lineUnitMap.set({});
    this.addLine();
  }

  private loadOrder(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (order) => {
        this.loading.set(false);
        this.orderStatus.set(order.status);
        this.loadIntoForm(order);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar la orden de compra.');
      },
    });
  }

  private loadIntoForm(order: PurchaseOrder): void {
    this.form.patchValue({
      supplierId: order.supplierId,
      orderDate: new Date(order.orderDate),
      dueDate: order.dueDate,
      buyerId: order.buyerId ?? '',
      paymentMethod: order.paymentMethod,
      supportDocumentType: order.supportDocumentType,
      supportDocumentNumber: order.supportDocumentNumber,
      currency: order.currency ?? 'COP',
      notes: order.notes ?? '',
    });
    this.supplierAddress.set(order.supplierAddress ?? '');
    this.syncSupplierDisplay();
    this.syncBuyerDisplay();

    this.linesArray.clear();
    this.lineUnitMap.set({});
    (order.lines ?? []).forEach((line) => this.linesArray.push(this.createLineGroup(line)));
    if (this.linesArray.length === 0) {
      this.addLine();
    }
    this.resolveAllLineUnits();
  }

  private resolveAllLineUnits(): void {
    const uoms = this.uomService.units.value() ?? [];
    const uomMap = new Map(uoms.map((u) => [u.id, u]));
    const map: Record<number, string> = {};
    this.linesArray.getRawValue().forEach((line, i) => {
      if (!line.productId) return;
      const product = this.products().find((p) => p.id === line.productId);
      if (product?.unitOfMeasureId) {
        const uom = uomMap.get(product.unitOfMeasureId);
        if (uom) map[i] = uom.code;
      }
    });
    this.lineUnitMap.set(map);
  }

  private createLineGroup(existing?: Partial<LineForm['value']>): LineForm {
    return this.fb.nonNullable.group({
      productId: [existing?.productId ?? '', Validators.required],
      productDisplay: [this.getProductName(existing?.productId) ?? ''],
      warehouseId: [existing?.warehouseId ?? '', Validators.required],
      orderedQty: [existing?.orderedQty ?? 1, [Validators.required, Validators.min(0.001)]],
      discountPct: [existing?.discountPct ?? 0, [Validators.min(0), Validators.max(100)]],
      taxType: [existing?.taxType ?? 'EXENTO'],
      unitCost: [existing?.unitCost ?? 0, [Validators.required, Validators.min(0)]],
    }) as unknown as LineForm;
  }

  private getProductName(productId: string | undefined): string {
    if (!productId) return '';
    const p = this.products().find((pr) => pr.id === productId);
    return p ? `${p.productCode} — ${p.name}` : '';
  }

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.loadSupplierDetails(ev.option.value);
  }

  private loadSupplierDetails(supplierId: string): void {
    this.thirdPartyService.getById(supplierId).subscribe((supplier) => {
      this.supplierAddress.set(supplier.address ?? '');
      this.supplierPhone.set(supplier.phone ?? '');
      this.supplierTaxRegime.set(supplier.taxRegime ?? null);
      this.supplierPersonType.set(supplier.personType ?? null);
      if (supplier.creditDays > 0) {
        const orderDate = this.form.controls.orderDate.getRawValue();
        const dueDate = this.addDays(orderDate, supplier.creditDays);
        this.form.controls.dueDate.setValue(dueDate);
        this.calculatedDueDate.set(dueDate);
      }
    });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
    if (id) {
      this.loadSupplierDetails(id);
    }
  }

  private openCreateSupplier(): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) return;
        this.thirdPartyService.reload();
        this.form.controls.supplierId.setValue(supplier.id);
        this.supplierDisplay.setValue(`${supplier.name} (${supplier.numIdentification})`, {
          emitEvent: false,
        });
        this.loadSupplierDetails(supplier.id);
      });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    const status = tp.active ? '' : ' — inactivo';
    return `${fullName} (${tp.numIdentification})${status}`;
  }

  // ── Buyer ─────────────────────────────────────────────────────────
  onBuyerSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.buyerDisplay.setValue('', { emitEvent: false });
      // TODO: open create employee dialog
      return;
    }
    this.form.controls.buyerId.setValue(ev.option.value);
    const emp = this.employees().find((e) => e.id === ev.option.value);
    this.buyerDisplay.setValue(emp ? `${emp.name} (${emp.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  syncBuyerDisplay(): void {
    const id = this.form.controls.buyerId.getRawValue();
    if (!id) {
      this.buyerDisplay.setValue('');
      return;
    }
    const emp = this.employees().find((e) => e.id === id);
    this.buyerDisplay.setValue(emp ? `${emp.name} (${emp.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  // ── Lines ─────────────────────────────────────────────────────────
  addLine(): void {
    this.linesArray.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.linesArray.length <= 1) return;
    this.linesArray.removeAt(index);
    this.lineUnitMap.update((m) => {
      const next: Record<number, string> = {};
      Object.entries(m).forEach(([k, v]) => {
        const i = Number(k);
        next[i > index ? i - 1 : i] = v;
      });
      return next;
    });
  }

  // ── Line product autocomplete ─────────────────────────────────────
  onProductSearch(lineIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearch.update((v) => ({ ...v, [lineIndex]: input.value }));
  }

  filteredProducts(lineIndex: number): Product[] {
    const q = (this.productSearch()[lineIndex] ?? '').toLowerCase().trim();
    if (!q) return this.products().filter((p) => p.active);
    return this.products().filter(
      (p) =>
        p.active && (p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q)),
    );
  }

  onLineProductSelected(index: number, ev: MatAutocompleteSelectedEvent): void {
    const line = this.linesArray.at(index);
    const product = this.products().find((p) => p.id === ev.option.value);
    line.controls.productId.setValue(ev.option.value);
    line.controls.productDisplay.setValue(
      product ? `${product.productCode} — ${product.name}` : ev.option.viewValue,
    );
    if (product) {
      // Auto-fill unit cost from product
      line.controls.unitCost.setValue(product.costPrice ?? 0, { emitEvent: false });
      // Auto-fill tax type from product
      line.controls.taxType.setValue(product.taxType ?? 'EXENTO', { emitEvent: false });
      // Auto-fill discount from active promotion if any
      const today = new Date().toISOString().split('T')[0];
      const activePromo = (product.promotions ?? []).find(
        (promo) => promo.isActive && promo.startDate <= today && promo.endDate >= today,
      );
      if (activePromo) {
        line.controls.discountPct.setValue(activePromo.discountPct, { emitEvent: false });
      }
    }
    this.resolveLineUnit(index, product);
  }

  private resolveLineUnit(index: number, product?: Product | null): void {
    if (!product?.unitOfMeasureId) {
      this.lineUnitMap.update((m) => {
        const next = { ...m };
        delete next[index];
        return next;
      });
      return;
    }
    const uoms = this.uomService.units.value() ?? [];
    const uom = uoms.find((u) => u.id === product.unitOfMeasureId);
    this.lineUnitMap.update((m) => ({
      ...m,
      [index]: uom?.code ?? '',
    }));
  }

  syncLineProductDisplay(index: number): void {
    const line = this.linesArray.at(index);
    const pid = line.controls.productId.getRawValue();
    if (pid && line.controls.productDisplay.getRawValue()) return;
    line.controls.productDisplay.setValue(this.getProductName(pid));
  }

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid || this.linesArray.invalid) {
      this.form.markAllAsTouched();
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const raw = this.form.getRawValue();
    const date =
      raw.orderDate instanceof Date ? raw.orderDate.toISOString().split('T')[0] : raw.orderDate;

    const request: PurchaseOrderRequest = {
      supplierId: raw.supplierId,
      orderDate: date,
      dueDate: raw.dueDate || null,
      buyerId: raw.buyerId || null,
      paymentMethod: raw.paymentMethod || null,
      supportDocumentType: raw.supportDocumentType || null,
      supportDocumentNumber: raw.supportDocumentNumber || null,
      currency: raw.currency || 'COP',
      notes: raw.notes || null,
      lines: this.linesArray.getRawValue().map((line, idx) => ({
        productId: line.productId,
        warehouseId: line.warehouseId,
        orderedQty: line.orderedQty,
        unitCost: line.unitCost,
        discountPct: line.discountPct ?? 0,
        taxType: (line.taxType || 'EXENTO') as TaxType,
        lineNumber: idx + 1,
      })),
    };

    this.saving.set(true);
    this.error.set(null);

    const action = this.loadedId
      ? this.service.update(this.loadedId, request)
      : this.service.create(request);

    action.subscribe({
      next: () => {
        this.service.reload();
        this.saving.set(false);
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Error al guardar la orden de compra.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  recibir(): void {
    if (!this.loadedId) return;
    this.router.navigate(['/compras/recepcion/nueva'], { queryParams: { ocId: this.loadedId } });
  }
}
