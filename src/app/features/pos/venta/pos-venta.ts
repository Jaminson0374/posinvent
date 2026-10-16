import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product } from '../../../core/models/product.model';
import { ThirdParty } from '../../../core/models/third-party.model';
import { UnitOfMeasure } from '../../../core/models/product-catalog.model';
import { SCALE_STATUS, isWeightUomCode, toKilograms } from '../../../core/models/scale.model';
import { PosService } from '../../../core/services/pos.service';
import { SaleService } from '../../../core/services/sale.service';
import { ScaleService } from '../../../core/services/scale.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import { ProductCatalogCategoryService } from '../../../core/services/product-catalog-category.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { Warehouse } from '../../../core/models/warehouse.model';
import { CashRegister } from '../../../core/models/cash-register.model';
import { PageResponse } from '../../../core/models/page.model';
import { QuickCreateClientDialogComponent } from '../../admin/third-parties/dialogs/quick-create-client.dialog';
import { ScaleConfigDialogComponent } from './scale-config-dialog';
import Swal from 'sweetalert2';

interface OrderLine {
  productId: string;
  productName: string;
  unitPrice: number;
  taxType: string;
  quantity: number;
  subtotal: number;
  isWeight: boolean;
}

@Component({
  selector: 'app-pos-venta',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatCardModule,
    MatTableModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './pos-venta.html',
  styleUrl: './pos-venta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosVentaComponent {
  private readonly http = inject(HttpClient);
  private readonly posService = inject(PosService);
  private readonly saleService = inject(SaleService);
  private readonly scaleService = inject(ScaleService);
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly categoryService = inject(ProductCatalogCategoryService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly categoryOptions = computed(() => {
    const cats = this.categoryService.categories.value();
    if (!cats) return [{ id: '', name: 'Todos', active: true }];
    return [{ id: '', name: 'Todos', active: true }, ...cats];
  });
  readonly selectedCategoryCtrl = new FormControl<string | null>(null);
  readonly selectedCategory = signal<string | null>(null);

  // ── Order lines ──
  readonly orderLines = signal<OrderLine[]>([]);
  readonly displayedColumns = ['product', 'qty', 'price', 'subtotal', 'actions'];

  // ── Scale ──
  readonly scaleReading = this.scaleService.currentReading;
  readonly scaleStatus = this.scaleService.status;
  readonly scaleError = this.scaleService.errorMessage;
  readonly isScaleActive = signal(false);
  readonly selectedLineIndex = signal<number | null>(null);

  readonly isScaleConnected = computed(() => this.scaleStatus() === SCALE_STATUS.CONNECTED);
  readonly canCapture = computed(() => {
    const reading = this.scaleReading();
    return this.isScaleConnected() && !!reading && reading.stable;
  });
  readonly scaleStatusLabel = computed(() => {
    switch (this.scaleStatus()) {
      case SCALE_STATUS.CONNECTED:
        return 'Conectada';
      case SCALE_STATUS.ERROR:
        return 'Error';
      default:
        return 'Desconectada';
    }
  });

  /** Product UoM lookup, used to decide weight vs unit behaviour. */
  private readonly unitById = computed(() => {
    const map = new Map<string, UnitOfMeasure>();
    for (const unit of this.unitOfMeasureService.units.value() ?? []) {
      map.set(unit.id, unit);
    }
    return map;
  });

  // ── Customer ──
  readonly selectedCustomer = signal<ThirdParty | null>(null);
  readonly customerSearchControl = new FormControl('', { nonNullable: true });
  readonly customerOptions = signal<ThirdParty[]>([]);
  readonly customerLoading = signal(false);

  // ── Product search ──
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly products = signal<Product[]>([]);
  readonly searchLoading = signal(false);

  // ── POS infrastructure ──
  readonly selectedWarehouse = signal<Warehouse | null>(null);
  readonly selectedCashRegister = signal<CashRegister | null>(null);
  readonly infrastructureError = signal<string | null>(null);

  // ── Computed totals ──
  readonly subtotal = computed(() =>
    this.orderLines().reduce((sum, line) => sum + line.subtotal, 0),
  );

  readonly taxTotals = computed(() => {
    const lines = this.orderLines();
    let tax0 = 0;
    let tax5 = 0;
    let tax8 = 0;
    let tax19 = 0;

    for (const line of lines) {
      const rate = this.resolveTaxRate(line.taxType);
      const tax = line.subtotal * rate;
      if (rate === 0) tax0 += tax;
      else if (rate === 0.05) tax5 += tax;
      else if (rate === 0.08) tax8 += tax;
      else tax19 += tax;
    }

    return { tax0, tax5, tax8, tax19, totalTax: tax0 + tax5 + tax8 + tax19 };
  });

  readonly grandTotal = computed(() => this.subtotal() + this.taxTotals().totalTax);

  readonly grandTotalFormatted = computed(() => this.formatCurrency(this.grandTotal()));

  // ── Computed: filtered products ──
  readonly filteredProducts = computed(() => {
    const catId = this.selectedCategory();
    const prods = this.products();
    if (catId === null) return [];
    if (catId === '') return prods;
    return prods.filter((p) => p.categoryId === catId);
  });

  constructor() {
    // Sync category FormControl → signal — load products when any category selected
    this.selectedCategoryCtrl.valueChanges.pipe(takeUntilDestroyed()).subscribe((catId) => {
      this.selectedCategory.set(catId);
      if (catId !== null) {
        this.loadAllProducts();
      } else {
        this.products.set([]);
      }
    });

    // Search products on input change
    this.searchControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        const q = value.trim();
        if (q.length >= 2) {
          this.searchLoading.set(true);
          this.posService.searchProducts(q).subscribe({
            next: (page: PageResponse<Product>) => {
              this.products.set(page.content);
              this.searchLoading.set(false);
            },
            error: () => {
              this.products.set([]);
              this.searchLoading.set(false);
            },
          });
        } else {
          this.loadAllProducts();
        }
      });

    // Search customers on input change
    this.customerSearchControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        const q = value.trim();
        if (q.length >= 2) {
          this.customerLoading.set(true);
          const params = `page=0&size=10&q=${encodeURIComponent(q)}`;
          this.http.get<PageResponse<ThirdParty>>(`/api/v1/third-parties?${params}`).subscribe({
            next: (page: PageResponse<ThirdParty>) => {
              this.customerOptions.set(
                page.content.filter((c: ThirdParty) => c.type === 'CLIENT' || c.type === 'BOTH'),
              );
              this.customerLoading.set(false);
            },
            error: () => {
              this.customerOptions.set([]);
              this.customerLoading.set(false);
            },
          });
        } else {
          this.customerOptions.set([]);
        }
      });

    // Load POS infrastructure (warehouse + cash register)
    this.warehouseService.listAll().subscribe({
      next: (warehouses) => {
        const general = warehouses.find((w) => w.warehouseType === 'GENERAL' && w.active);
        this.selectedWarehouse.set(general ?? warehouses.find((w) => w.active) ?? null);
      },
      error: () => this.infrastructureError.set('No se pudo cargar la bodega'),
    });

    this.cashRegisterService.listActive().subscribe({
      next: (registers) => {
        this.selectedCashRegister.set(registers.length > 0 ? registers[0] : null);
      },
      error: () => this.infrastructureError.set('No se pudo cargar la caja registradora'),
    });

    // Auto-reload data when returning to this tab (after creating products/clients elsewhere)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.reloadVisibleData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  reloadVisibleData(): void {
    this.categoryService.reload();
    if (this.products().length > 0 || this.selectedCategory()) {
      this.loadAllProducts();
    }
  }

  private loadAllProducts(): void {
    this.searchLoading.set(true);
    this.posService.searchProducts('').subscribe({
      next: (page: PageResponse<Product>) => {
        this.products.set(page.content);
        this.searchLoading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.searchLoading.set(false);
      },
    });
  }

  // ── Helpers ──

  mainImage(product: Product): string {
    const images = product.images ?? [];
    if (images.length === 0) return '';

    const sorted = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
    return this.resolveImageUrl(sorted[0].imageUrl);
  }

  private resolveImageUrl(imageUrl: string | null | undefined): string {
    const normalized = (imageUrl ?? '').trim();
    if (!normalized) return '';
    if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith('data:')) return normalized;
    if (normalized.startsWith('/')) return normalized;
    return normalized.startsWith('media/') ? `/${normalized}` : `/media/${normalized}`;
  }

  private resolveTaxRate(taxType: string): number {
    switch (taxType) {
      case 'IVA_5':
        return 0.05;
      case 'IVA_8':
        return 0.08;
      case 'IVA_19':
        return 0.19;
      default:
        return 0;
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatTaxLabel(taxType: string): string {
    switch (taxType) {
      case 'IVA_5':
        return '5%';
      case 'IVA_8':
        return '8%';
      case 'IVA_19':
        return '19%';
      default:
        return '0%';
    }
  }

  displayCustomer(customer: ThirdParty): string {
    if (!customer) return '';
    return `${customer.name}${customer.lastName ? ' ' + customer.lastName : ''} — ${customer.numIdentification}`;
  }

  displayProduct(product: Product): string {
    if (!product) return '';
    return `${product.name} — ${product.productCode}`;
  }

  // ── Order line actions ──

  /** True when the product's UoM is a weight unit (KG/GR/G/LB/...). */
  isWeightProduct(product: Product): boolean {
    if (!product.unitOfMeasureId) return false;
    const unit = this.unitById().get(product.unitOfMeasureId);
    return isWeightUomCode(unit?.code ?? null);
  }

  /** Selects (or toggles) an order line as the target of the next weighing. */
  selectLine(index: number): void {
    this.selectedLineIndex.set(this.selectedLineIndex() === index ? null : index);
  }

  addToOrder(product: Product): void {
    const current = this.orderLines();
    const idx = current.findIndex((l) => l.productId === product.id);
    const isWeight = this.isWeightProduct(product);

    if (idx >= 0) {
      if (isWeight) {
        // Weight products await an explicit scale capture; select the line.
        this.selectedLineIndex.set(idx);
      } else {
        const line = current[idx];
        const newQty = line.quantity + 1;
        this.orderLines.update((lines) =>
          lines.map((l, i) =>
            i === idx ? { ...l, quantity: newQty, subtotal: newQty * l.unitPrice } : l,
          ),
        );
      }
    } else {
      const newLine: OrderLine = {
        productId: product.id,
        productName: product.name,
        unitPrice: product.salePrice,
        taxType: product.taxType,
        quantity: isWeight ? 0 : 1,
        subtotal: isWeight ? 0 : product.salePrice,
        isWeight,
      };
      this.orderLines.update((lines) => [...lines, newLine]);
      if (isWeight) this.selectedLineIndex.set(this.orderLines().length - 1);
    }

    this.searchControl.setValue('', { emitEvent: false });
  }

  incrementLine(index: number): void {
    this.orderLines.update((lines) =>
      lines.map((l, i) => {
        if (i !== index) return l;
        const qty = l.quantity + 1;
        return { ...l, quantity: qty, subtotal: qty * l.unitPrice };
      }),
    );
  }

  decrementLine(index: number): void {
    const current = this.orderLines();
    if (current[index].quantity <= 1) {
      this.removeLine(index);
      return;
    }
    this.orderLines.update((lines) =>
      lines.map((l, i) => {
        if (i !== index) return l;
        const qty = l.quantity - 1;
        return { ...l, quantity: qty, subtotal: qty * l.unitPrice };
      }),
    );
  }

  removeLine(index: number): void {
    this.orderLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  // ── Customer selection ──

  onCustomerSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.customerSearchControl.setValue('', { emitEvent: false });
      this.customerOptions.set([]);
      this.openCreateClient();
      return;
    }
    this.selectCustomer(ev.option.value as ThirdParty);
  }

  selectCustomer(customer: ThirdParty): void {
    this.selectedCustomer.set(customer);
    this.customerSearchControl.setValue('', { emitEvent: false });
    this.customerOptions.set([]);
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
  }

  private openCreateClient(): void {
    this.dialog
      .open<QuickCreateClientDialogComponent, undefined, ThirdParty>(
        QuickCreateClientDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((client) => {
        if (!client) return;
        this.selectedCustomer.set(client);
      });
  }

  // ── Cotizar ──

  async cotizar(): Promise<void> {
    const lines = this.orderLines();
    const customer = this.selectedCustomer();

    if (lines.length === 0) {
      Swal.fire({
        title: 'Sin productos',
        text: 'Agregá al menos un producto a la orden.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    if (lines.some((l) => !(l.quantity > 0))) {
      Swal.fire({
        title: 'Producto sin cantidad',
        text: 'Hay un producto a granel sin peso capturado.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    if (!customer) {
      Swal.fire({
        title: 'Sin cliente',
        text: 'Seleccioná un cliente para continuar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    const warehouse = this.selectedWarehouse();
    if (!warehouse) {
      Swal.fire({
        title: 'Infraestructura no disponible',
        text: 'No se encontró bodega activa. Reintentá en unos segundos.',
        icon: 'error',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    Swal.fire({
      title: 'Creando cotización...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      // 1. Create QUOTE document
      const quote = await this.saleService
        .createDocument({
          type: 'QUOTE',
          clientId: customer.id,
          warehouseId: warehouse.id,
        })
        .toPromise()!;

      const docId = quote!.id;

      // 2. Add all items
      for (const line of lines) {
        await this.saleService
          .addItem(docId, {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxType: line.taxType,
          })
          .toPromise()!;
      }

      // 3. Transition to SENT
      await this.saleService.transitionDocument(docId, 'SENT').toPromise()!;

      // 4. Success
      await Swal.fire({
        title: '¡Cotización creada!',
        html: `
          <p>Cotización: <strong>${quote!.documentNumber}</strong></p>
          <p>Cliente: <strong>${customer.name}${customer.lastName ? ' ' + customer.lastName : ''}</strong></p>
          <p>Total: <strong>${this.formatCurrency(this.grandTotal())}</strong></p>
        `,
        icon: 'success',
        confirmButtonText: 'Nueva venta',
      });

      // Reset state
      this.orderLines.set([]);
      this.selectedCustomer.set(null);
      this.searchControl.setValue('', { emitEvent: false });
      this.products.set([]);
    } catch (err: unknown) {
      console.error('Quote creation error:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire({
        title: 'Error al crear cotización',
        text: message,
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  }

  // ── Scale ──

  async toggleScale(): Promise<void> {
    if (this.isScaleActive()) {
      this.scaleService.stopPolling();
      await this.scaleService.disconnect();
      this.isScaleActive.set(false);
      return;
    }

    await this.scaleService.connect();
    if (this.scaleService.status() === SCALE_STATUS.CONNECTED) {
      this.scaleService.startPolling();
      this.isScaleActive.set(true);
    } else {
      this.isScaleActive.set(false);
    }
  }

  openScaleConfig(): void {
    this.dialog
      .open(ScaleConfigDialogComponent, { width: '480px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Captures the current stable reading and stores it as the line quantity (kg). */
  captureWeight(targetIndex?: number): void {
    const reading = this.scaleReading();
    if (!reading) {
      this.showScaleWarning('No hay lectura de la báscula. Conectala e intentá de nuevo.');
      return;
    }
    if (!reading.stable) {
      this.showScaleWarning('La báscula aún no está estable. Esperá unos segundos.');
      return;
    }

    const index = this.resolveWeightLineIndex(targetIndex);
    if (index === null) {
      this.showScaleWarning('Seleccioná una línea de producto a granel para capturar el peso.');
      return;
    }

    const kilograms = Math.round(toKilograms(reading.weight, reading.unit) * 1000) / 1000;
    if (!(kilograms > 0)) {
      this.showScaleWarning('El peso capturado debe ser mayor que cero.');
      return;
    }

    this.setLineQuantity(index, kilograms);
  }

  captureWeightForLine(index: number): void {
    this.captureWeight(index);
  }

  private resolveWeightLineIndex(targetIndex?: number): number | null {
    const lines = this.orderLines();
    if (
      targetIndex !== undefined &&
      targetIndex >= 0 &&
      targetIndex < lines.length &&
      lines[targetIndex].isWeight
    ) {
      return targetIndex;
    }

    const selected = this.selectedLineIndex();
    if (selected !== null && selected < lines.length && lines[selected].isWeight) {
      return selected;
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].isWeight) return i;
    }
    return null;
  }

  private setLineQuantity(index: number, quantity: number): void {
    this.orderLines.update((lines) =>
      lines.map((l, i) => (i === index ? { ...l, quantity, subtotal: quantity * l.unitPrice } : l)),
    );
  }

  private showScaleWarning(text: string): void {
    Swal.fire({ title: 'Báscula', text, icon: 'warning', confirmButtonText: 'Entendido' });
  }

  // ── Functional buttons ──

  openDrawer(): void {
    Swal.fire({
      title: 'Próximamente',
      text: 'Apertura de cajón portamonedas.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }

  printTicket(): void {
    Swal.fire({
      title: 'Próximamente',
      text: 'Impresión de ticket.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }

  cancelTicket(): void {
    Swal.fire({
      title: 'Próximamente',
      text: 'Anulación de ticket.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }

  lastTicket(): void {
    Swal.fire({
      title: 'Próximamente',
      text: 'Reimprimir último ticket.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }

  preTicket(): void {
    Swal.fire({
      title: 'Próximamente',
      text: 'Vista previa del ticket.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }

  calculadora(): void {
    const result = prompt('Calculadora — ingresá una expresión:');
    if (result === null) return;
    try {
      // eslint-disable-next-line no-new-func
      const value = new Function('return ' + result)();
      Swal.fire({
        title: 'Resultado',
        text: `${result} = ${value}`,
        icon: 'info',
        confirmButtonText: 'Cerrar',
      });
    } catch {
      Swal.fire({
        title: 'Error',
        text: 'Expresión inválida.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  }

  // ── COBRAR ──

  async cobrar(): Promise<void> {
    const lines = this.orderLines();
    const customer = this.selectedCustomer();

    if (lines.length === 0) {
      Swal.fire({
        title: 'Sin productos',
        text: 'Agregá al menos un producto a la orden.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    if (lines.some((l) => !(l.quantity > 0))) {
      Swal.fire({
        title: 'Producto sin cantidad',
        text: 'Hay un producto a granel sin peso capturado.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    if (!customer) {
      Swal.fire({
        title: 'Sin cliente',
        text: 'Seleccioná un cliente para continuar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // Ask for payment details (split payment + change for cash)
    const grandTotal = this.grandTotal();
    const paymentResult = await this.openPaymentDialog(grandTotal);
    if (!paymentResult) return;

    Swal.fire({
      title: 'Procesando pago...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const warehouse = this.selectedWarehouse();
    const cashRegister = this.selectedCashRegister();

    if (!warehouse || !cashRegister) {
      Swal.fire({
        title: 'Infraestructura no disponible',
        text: 'No se encontró bodega o caja registradora activa. Reintentá en unos segundos.',
        icon: 'error',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    const warehouseId = warehouse.id;
    const cashRegisterId = cashRegister.id;

    try {
      // 1. Create ORDER
      const order = await this.saleService
        .createDocument({
          type: 'ORDER',
          clientId: customer.id,
          warehouseId,
        })
        .toPromise()!;

      const docId = order!.id;

      // 2. Add all items
      for (const line of lines) {
        await this.saleService
          .addItem(docId, {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxType: line.taxType,
          })
          .toPromise()!;
      }

      // 3. Transition to CONFIRMED
      await this.saleService.transitionDocument(docId, 'CONFIRMED').toPromise()!;

      // 4. Checkout
      const result = await this.posService
        .checkout({
          orderId: docId,
          cashRegisterId,
          payments: paymentResult.lines,
        })
        .toPromise()!;

      // 5. Success
      const totalStr = this.formatCurrency(this.grandTotal());
      const changeStr = this.formatCurrency(paymentResult.change);
      const changeHtml =
        paymentResult.change > 0 ? `<p>Vuelto: <strong>${changeStr}</strong></p>` : '';
      await Swal.fire({
        title: '¡Venta exitosa!',
        html: `
          <p>Factura: <strong>${result!.documentNumber}</strong></p>
          <p>Total: <strong>${totalStr}</strong></p>
          ${changeHtml}
        `,
        icon: 'success',
        confirmButtonText: 'Nueva venta',
      });

      // Reset state
      this.orderLines.set([]);
      this.selectedCustomer.set(null);
      this.searchControl.setValue('', { emitEvent: false });
      this.products.set([]);
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire({
        title: 'Error al procesar',
        text: message,
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
      });
    }
  }

  private async openPaymentDialog(
    total: number,
  ): Promise<{ lines: { method: string; amount: number }[]; change: number } | null> {
    const totalStr = this.formatCurrency(total);
    const methods = [
      { value: 'EFECTIVO', label: 'Efectivo' },
      { value: 'TARJETA', label: 'Tarjeta' },
      { value: 'TRANSFERENCIA', label: 'Transferencia' },
    ];

    const buildHtml = (lines: { method: string; amount: string }[], cashTendered: string) => {
      const paid = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
      const pending = Math.max(0, total - paid);
      const cashPortion = lines
        .filter((l) => l.method === 'EFECTIVO')
        .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
      const tendered = parseFloat(cashTendered) || 0;
      const change = Math.max(0, tendered - cashPortion);
      const hasCash = lines.some((l) => l.method === 'EFECTIVO');

      const linesHtml = lines
        .map(
          (l, i) => `
          <div class="sw-payment-row" style="display:flex;gap:4px;align-items:center;margin-bottom:2px;">
            <select class="sw-payment-method swal2-select" style="flex:1; width:10px" data-index="${i}">
              ${methods
                .map(
                  (m) =>
                    `<option value="${m.value}" ${l.method === m.value ? 'selected' : ''}>${m.label}</option>`,
                )
                .join('')}
            </select>
            <input class="sw-payment-amount swal2-input" style="flex:1;" type="number" min="0" step="100" placeholder="Monto" value="${l.amount}" data-index="${i}" />
            <button type="button" class="sw-payment-remove swal2-cancel swal2-styled" style="padding:3px 6px;flex-shrink:0;min-width:20px;" data-index="${i}">✕</button>
          </div>`,
        )
        .join('');

      const cashFieldHtml = `
        <div id="sw-cash-field" style="margin-bottom:12px;padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;${hasCash ? '' : 'display:none;'}">
          <label style="font-size:20 px;color:#166534;font-weight:800;">Recibido en efectivo</label>
          <input id="sw-cash-tendered" class="swal2-input" style="width:60%;margin-top:4px;font-size:2em;font-weight:700;" type="number" min="0" step="100" placeholder="¿Con cuánto paga?" value="${cashTendered}" />
        </div>`;

      return `
        <div style="text-align:left;margin-bottom:12px;">
          <strong style="font-size:0.95em;">Total a pagar:</strong><br/>
          <span id="sw-total" style="font-size:2em;color:#1e293b;font-weight:800;">${totalStr}</span>
        </div>
        <div id="sw-payment-lines" style="max-height:180px;overflow-y:auto;margin-bottom:12px;">
          ${linesHtml}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <button type="button" id="sw-add-payment" class="swal2-confirm swal2-styled" style="padding:6px 14px;font-size:13px;">+ Agregar método</button>
          <div style="text-align:right;">
            <div style="font-size:12px;color:#64748b;">Pendiente: <strong id="sw-pending" style="color:${pending > 0 ? '#ef4444' : '#15803d'};">${this.formatCurrency(pending)}</strong></div>
          </div>
        </div>
        ${cashFieldHtml}
        <div id="sw-change-section" style="text-align:right;padding-top:8px;border-top:2px solid ${change > 0 ? '#43a047' : '#e0e0e0'};margin-top:4px;">
          <div style="font-size:0.85em;color:#64748b;">Vuelto</div>
          <span id="sw-change" style="font-size:2em;font-weight:800;color:${change > 0 ? '#43a047' : '#94a3b8'};">${change > 0 ? this.formatCurrency(change) : '—'}</span>
        </div>
      `;
    };

    let paymentLines: { method: string; amount: string }[] = [
      { method: 'EFECTIVO', amount: String(total) },
    ];
    let cashTenderedValue = String(total);

    const result = await Swal.fire({
      title: 'Cobrar',
      html: buildHtml(paymentLines, cashTenderedValue),
      showCancelButton: true,
      confirmButtonText: 'Cobrar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      allowOutsideClick: false,
      width: '700px',
      didOpen: () => {
        const popup = Swal.getPopup()!;

        // Make modal draggable by its header
        const header = popup.querySelector('.swal2-title') as HTMLElement | null;
        if (header) {
          header.style.cursor = 'move';
          let dragging = false;
          let startX = 0;
          let startY = 0;
          let popupLeft = 0;
          let popupTop = 0;

          const onDown = (e: MouseEvent) => {
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = popup.getBoundingClientRect();
            popupLeft = rect.left;
            popupTop = rect.top;
            popup.style.position = 'fixed';
            popup.style.margin = '0';
            popup.style.left = popupLeft + 'px';
            popup.style.top = popupTop + 'px';
            popup.style.transition = 'none';
            document.body.style.userSelect = 'none';
          };

          const onMove = (e: MouseEvent) => {
            if (!dragging) return;
            e.preventDefault();
            popup.style.left = popupLeft + e.clientX - startX + 'px';
            popup.style.top = popupTop + e.clientY - startY + 'px';
          };

          const onUp = () => {
            dragging = false;
            popup.style.transition = '';
            document.body.style.userSelect = '';
          };

          header.addEventListener('mousedown', onDown);
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);

          const cleanupDrag = () => {
            header.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          popup.addEventListener('destroy', cleanupDrag, { once: true });
        }

        const linesContainer = popup.querySelector('#sw-payment-lines')!;

        const refresh = () => {
          const methodEls = popup.querySelectorAll<HTMLSelectElement>('.sw-payment-method');
          const amountEls = popup.querySelectorAll<HTMLInputElement>('.sw-payment-amount');
          const cashEl = popup.querySelector('#sw-cash-tendered') as HTMLInputElement | null;
          methodEls.forEach((sel, i) => {
            if (i < paymentLines.length) paymentLines[i].method = sel.value;
          });
          amountEls.forEach((inp, i) => {
            if (i < paymentLines.length) paymentLines[i].amount = inp.value;
          });
          if (cashEl) cashTenderedValue = cashEl.value;

          const paid = paymentLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
          const pending = Math.max(0, total - paid);
          const cashPortion = paymentLines
            .filter((l) => l.method === 'EFECTIVO')
            .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
          const tendered = parseFloat(cashTenderedValue) || 0;
          const change = Math.max(0, tendered - cashPortion);

          const pendingEl = popup.querySelector('#sw-pending') as HTMLElement;
          const changeEl = popup.querySelector('#sw-change') as HTMLElement;
          const changeSection = popup.querySelector('#sw-change-section') as HTMLElement;
          pendingEl.textContent = this.formatCurrency(pending);
          pendingEl.style.color = pending > 0 ? '#ef4444' : '#15803d';
          changeEl.textContent = change > 0 ? this.formatCurrency(change) : '—';
          changeEl.style.color = change > 0 ? '#43a047' : '#94a3b8';
          changeSection.style.borderTopColor = change > 0 ? '#43a047' : '#e0e0e0';

          // Show/hide cash field based on whether there's a cash payment line
          const cashField = popup.querySelector('#sw-cash-field') as HTMLElement | null;
          const hasCash = paymentLines.some((l) => l.method === 'EFECTIVO');
          if (cashField) (cashField as HTMLElement).style.display = hasCash ? '' : 'none';
        };

        popup.addEventListener('input', refresh);
        popup.addEventListener('change', refresh);

        popup.querySelector('#sw-add-payment')!.addEventListener('click', () => {
          paymentLines.push({ method: 'EFECTIVO', amount: '' });
          const rebuildBody = popup.querySelector('.swal2-html-container') as HTMLElement;
          const cashFieldWrapper = popup.querySelector('#sw-cash-field') as HTMLElement | null;
          const changeSection = popup.querySelector('#sw-change-section') as HTMLElement;

          // Rebuild lines section
          linesContainer.innerHTML = paymentLines
            .map(
              (l, i) => `
            <div class="sw-payment-row" style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
              <select class="sw-payment-method swal2-select" style="flex:1;" data-index="${i}">
                ${methods.map((m) => `<option value="${m.value}" ${l.method === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
              <input class="sw-payment-amount swal2-input" style="flex:1;" type="number" min="0" step="100" placeholder="Monto" value="${l.amount}" data-index="${i}" />
              <button type="button" class="sw-payment-remove swal2-cancel swal2-styled" style="padding:6px 10px;flex-shrink:0;min-width:32px;" data-index="${i}">✕</button>
            </div>`,
            )
            .join('');

          // Show cash field if needed (insert after lines if not visible)
          refresh();
        });

        popup.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('sw-payment-remove')) {
            const idx = parseInt(target.dataset['index'] || '');
            if (paymentLines.length > 1) {
              paymentLines.splice(idx, 1);
              target.closest('.sw-payment-row')?.remove();
              refresh();
            }
          }
        });
      },
      preConfirm: () => {
        const popup = Swal.getPopup()!;
        const methodEls = popup.querySelectorAll<HTMLSelectElement>('.sw-payment-method');
        const amountEls = popup.querySelectorAll<HTMLInputElement>('.sw-payment-amount');
        const cashEl = popup.querySelector('#sw-cash-tendered') as HTMLInputElement | null;
        const lines: { method: string; amount: number }[] = [];
        methodEls.forEach((sel, i) => {
          const amount = parseFloat(amountEls[i]?.value || '0');
          if (amount > 0) {
            lines.push({ method: sel.value, amount });
          }
        });
        if (lines.length === 0) {
          Swal.showValidationMessage('Ingresá al menos un monto de pago');
          return false;
        }
        const paid = lines.reduce((s, l) => s + l.amount, 0);
        if (paid < total) {
          Swal.showValidationMessage(
            `Falta ${this.formatCurrency(total - paid)} para completar el pago`,
          );
          return false;
        }
        const cashPortion = lines
          .filter((l) => l.method === 'EFECTIVO')
          .reduce((s, l) => s + l.amount, 0);
        const tendered = parseFloat(cashEl?.value || '0');
        if (cashPortion > 0 && tendered < cashPortion) {
          Swal.showValidationMessage(
            `El efectivo recibido (${this.formatCurrency(tendered)}) es menor al monto en efectivo (${this.formatCurrency(cashPortion)})`,
          );
          return false;
        }
        const change = Math.max(0, tendered - cashPortion);
        return { lines, change };
      },
    });

    if (!result.isConfirmed) return null;
    return (
      (result.value as { lines: { method: string; amount: number }[]; change: number }) ?? null
    );
  }
}
