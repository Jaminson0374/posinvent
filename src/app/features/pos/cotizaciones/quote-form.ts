import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
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
import { HttpClient, HttpResourceRef } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, filter, firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SaleService } from '../../../core/services/sale.service';
import { ProductService } from '../../../core/services/product.service';
import { AvailableBatch, StockService } from '../../../core/services/stock.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import { ThirdParty } from '../../../core/models/third-party.model';
import { Product } from '../../../core/models/product.model';
import {
  SalesDocument,
  SalesDocumentType,
  SalesDocumentStatus,
  SalesDocumentRequest,
  SaleItemRequest,
} from '../../../core/models/sale.model';
import { PageResponse } from '../../../core/models/page.model';
import { QuickCreateClientDialogComponent } from '../../admin/third-parties/dialogs/quick-create-client.dialog';
import Swal from 'sweetalert2';

type LineForm = FormGroup<{
  productId: FormControl<string>;
  productDisplay: FormControl<string>;
  quantity: FormControl<number>;
  unitPrice: FormControl<number>;
  taxType: FormControl<string>;
  batchId: FormControl<string>;
}>;

interface LineBatchResource {
  productId: string;
  warehouseId: string;
  ref: HttpResourceRef<AvailableBatch[] | undefined>;
}

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatDialogModule,
    WarehousePickerComponent,
  ],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css',
})
export class QuoteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly saleService = inject(SaleService);
  readonly productService = inject(ProductService);
  readonly stockService = inject(StockService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly warehousePicker = viewChild(WarehousePickerComponent);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<'new' | 'edit'>('new');
  private loadedId: string | null = null;
  readonly documentData = signal<SalesDocument | null>(null);

  readonly clientDisplay = new FormControl('', { nonNullable: true });
  readonly clientOptions = signal<ThirdParty[]>([]);
  readonly clientLoading = signal(false);

  // Per-line available batches (keyed by the line form group). The signal is what the template reads,
  // so options stay reactive when a line is added, a product changes, or the warehouse changes.
  readonly batchOptionsByLine = signal<ReadonlyMap<LineForm, AvailableBatch[]>>(new Map());
  private readonly batchResources = new Map<LineForm, LineBatchResource>();
  private readonly batchRefresh = signal(0);

  readonly products = computed(() => this.productService.products.value()?.content ?? []);

  readonly productSearchQuery = signal('');
  readonly filteredProducts = computed(() => {
    const q = this.productSearchQuery().toLowerCase().trim();
    const prods = this.products();
    if (!q) return prods;
    return prods.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.productCode ?? '').toLowerCase().includes(q),
    );
  });

  readonly typeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'QUOTE', label: 'Cotización' },
    { value: 'ORDER', label: 'Pedido' },
  ];

  readonly taxTypeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'IVA0', label: 'IVA 0%' },
    { value: 'IVA5', label: 'IVA 5%' },
    { value: 'IVA8', label: 'IVA 8%' },
    { value: 'IVA19', label: 'IVA 19%' },
  ];

  readonly form = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    type: ['QUOTE', Validators.required],
    warehouseId: ['', Validators.required],
    linesArray: this.fb.array<LineForm>([]),
  });

  readonly linesArray = this.form.controls.linesArray;

  constructor() {
    // Load the available batches for every line whose product and warehouse are set, then apply the
    // FEFO default. `batchRefresh` is bumped by the form handlers because FormControl values are not signals.
    effect(() => {
      this.batchRefresh();
      const warehouseId = this.form.controls.warehouseId.value;
      const next = new Map<LineForm, AvailableBatch[]>();

      for (const line of this.linesArray.controls) {
        const productId = line.controls.productId.value;

        if (!productId || !warehouseId) {
          next.set(line, []);
          this.applyFefoDefault(line, []);
          continue;
        }

        const ref = this.resolveBatchResource(line, productId, warehouseId);
        if (!ref.hasValue()) {
          // Options are still loading: keep the current batch until we know which ones are valid.
          next.set(line, []);
          continue;
        }

        const options = ref.value() ?? [];
        next.set(line, options);
        this.applyFefoDefault(line, options);
      }

      this.batchOptionsByLine.set(next);
    });
  }

  private resolveBatchResource(
    line: LineForm,
    productId: string,
    warehouseId: string,
  ): HttpResourceRef<AvailableBatch[] | undefined> {
    const cached = this.batchResources.get(line);
    if (cached && cached.productId === productId && cached.warehouseId === warehouseId) {
      return cached.ref;
    }

    cached?.ref.destroy();
    const ref = this.stockService.availableBatches(productId, warehouseId);
    this.batchResources.set(line, { productId, warehouseId, ref });
    return ref;
  }

  // Selects the FEFO batch (first option) unless the operator already picked a batch that is still valid.
  private applyFefoDefault(line: LineForm, options: AvailableBatch[]): void {
    const current = line.controls.batchId.value;
    const stillValid = !!current && options.some((option) => option.batchId === current);
    if (stillValid) return;

    const next = options.length > 0 ? options[0].batchId : '';
    if (current !== next) {
      line.controls.batchId.setValue(next, { emitEvent: false });
    }
  }

  applyBatchOptions(index: number, options: AvailableBatch[]): void {
    const line = this.linesArray.at(index);
    this.batchOptionsByLine.update((map) => new Map(map).set(line, options));
    this.applyFefoDefault(line, options);
  }

  batchOptionsFor(line: LineForm): AvailableBatch[] {
    return this.batchOptionsByLine().get(line) ?? [];
  }

  batchLabel(batch: AvailableBatch): string {
    const shortId = batch.batchId.slice(0, 8);
    const expiration = batch.expirationDate ? `vence ${batch.expirationDate}` : 'sin vencimiento';
    return `Lote ${shortId} — ${expiration} — disp. ${batch.availableQuantity}`;
  }

  private refreshBatches(): void {
    this.batchRefresh.update((tick) => tick + 1);
  }

  readonly subtotal = computed(() =>
    this.linesArray.controls.reduce(
      (sum, line) => sum + line.controls.quantity.value * line.controls.unitPrice.value,
      0,
    ),
  );

  readonly taxTotals = computed(() => {
    let tax0 = 0;
    let tax5 = 0;
    let tax8 = 0;
    let tax19 = 0;

    for (const line of this.linesArray.controls) {
      const qty = line.controls.quantity.value;
      const price = line.controls.unitPrice.value;
      const taxType = line.controls.taxType.value;
      const amount = qty * price;
      const rate = this.taxRate(taxType);
      const tax = amount * rate;

      if (rate === 0) tax0 += tax;
      else if (rate === 0.05) tax5 += tax;
      else if (rate === 0.08) tax8 += tax;
      else tax19 += tax;
    }

    return { tax0, tax5, tax8, tax19, totalTax: tax0 + tax5 + tax8 + tax19 };
  });

  readonly grandTotal = computed(() => this.subtotal() + this.taxTotals().totalTax);

  readonly availableTransitions = computed(() => {
    const doc = this.documentData();
    if (!doc) return [];
    return this.getTransitions(doc.status);
  });

  ngOnInit(): void {
    this.productService.pageSize.set(200);
    this.productService.query.set('');

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);

      if (!id) {
        this.loadedId = null;
        this.mode.set('new');
        this.resetForm();
      } else {
        this.loadedId = id;
        this.mode.set('edit');
        this.loadDocument(id);
      }
    });

    this.clientDisplay.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        const q = value.trim();
        if (q.length >= 2) {
          this.searchClients(q);
        } else {
          this.clientOptions.set([]);
        }
      });
  }

  private resetForm(): void {
    this.form.reset({ type: 'QUOTE', clientId: '', warehouseId: '' });
    this.clientDisplay.setValue('');
    this.warehousePicker()?.clearDisplayValue();
    this.batchResources.clear();
    this.batchOptionsByLine.set(new Map());
    this.linesArray.clear();
    this.addLine();
  }

  private loadDocument(id: string): void {
    this.loading.set(true);
    this.saleService.getDocument(id).subscribe({
      next: (doc) => {
        this.loading.set(false);
        this.documentData.set(doc);
        this.form.patchValue({
          clientId: doc.clientId,
          type: doc.type,
          warehouseId: doc.warehouseId ?? '',
        });
        this.syncClientDisplay();
        this.syncWarehouseDisplay(doc.warehouseId);

        this.batchResources.clear();
        this.linesArray.clear();
        (doc.items ?? []).forEach((item) => this.linesArray.push(this.createLineGroup(item)));
        if (this.linesArray.length === 0) {
          this.addLine();
        }
        this.refreshBatches();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el documento.');
      },
    });
  }

  private createLineGroup(
    existing?: Partial<{
      productId: string;
      quantity: number;
      unitPrice: number;
      taxType: string;
      batchId: string | null;
    }>,
  ): LineForm {
    return this.fb.nonNullable.group({
      productId: [existing?.productId ?? '', Validators.required],
      productDisplay: [this.getProductName(existing?.productId) ?? ''],
      quantity: [existing?.quantity ?? 1, [Validators.required, Validators.min(0.001)]],
      unitPrice: [existing?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      taxType: [existing?.taxType ?? 'IVA0', Validators.required],
      batchId: [existing?.batchId ?? ''],
    }) as unknown as LineForm;
  }

  private syncWarehouseDisplay(warehouseId: string | null | undefined): void {
    if (!warehouseId) return;
    this.warehouseService.getById(warehouseId).subscribe({
      next: (warehouse) => {
        if (!warehouse) return;
        this.warehousePicker()?.searchControl.setValue(warehouse.name, { emitEvent: false });
      },
    });
  }

  private getProductName(productId: string | undefined): string {
    if (!productId) return '';
    const p = this.products().find((pr) => pr.id === productId);
    return p ? `${p.productCode} — ${p.name}` : '';
  }

  private searchClients(query: string): void {
    this.clientLoading.set(true);
    const params = `page=0&size=10&q=${encodeURIComponent(query)}`;
    this.http.get<PageResponse<ThirdParty>>(`/api/v1/third-parties?${params}`).subscribe({
      next: (page) => {
        this.clientOptions.set(
          page.content.filter((c: ThirdParty) => c.type === 'CLIENT' || c.type === 'BOTH'),
        );
        this.clientLoading.set(false);
      },
      error: () => {
        this.clientOptions.set([]);
        this.clientLoading.set(false);
      },
    });
  }

  onClientSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.clientDisplay.setValue('', { emitEvent: false });
      this.clientOptions.set([]);
      this.openCreateClient();
      return;
    }
    this.form.controls.clientId.setValue(ev.option.value);
    const client = this.clientOptions().find((c) => c.id === ev.option.value);
    this.clientDisplay.setValue(
      client
        ? `${client.name} ${client.lastName ?? ''} (${client.numIdentification})`.trim()
        : ev.option.viewValue,
      { emitEvent: false },
    );
    this.clientOptions.set([]);
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
        this.form.controls.clientId.setValue(client.id);
        this.clientDisplay.setValue(
          `${client.name} ${client.lastName ?? ''} (${client.numIdentification})`.trim(),
          { emitEvent: false },
        );
      });
  }

  syncClientDisplay(): void {
    const id = this.form.controls.clientId.getRawValue();
    if (!id) return;

    this.http.get<ThirdParty>(`/api/v1/third-parties/${id}`).subscribe({
      next: (client) => {
        this.clientDisplay.setValue(
          `${client.name} ${client.lastName ?? ''} (${client.numIdentification})`.trim(),
          { emitEvent: false },
        );
      },
    });
  }

  clientLabel(tp: ThirdParty): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    return `${fullName} (${tp.numIdentification})`;
  }

  addLine(): void {
    this.linesArray.push(this.createLineGroup());
    this.refreshBatches();
  }

  removeLine(index: number): void {
    if (this.linesArray.length <= 1) return;

    const line = this.linesArray.at(index);
    this.batchResources.get(line)?.ref.destroy();
    this.batchResources.delete(line);
    this.batchOptionsByLine.update((map) => {
      const next = new Map(map);
      next.delete(line);
      return next;
    });

    this.linesArray.removeAt(index);
    this.refreshBatches();
  }

  onLineProductSelected(index: number, ev: MatAutocompleteSelectedEvent): void {
    const line = this.linesArray.at(index);
    const product = this.products().find((p) => p.id === ev.option.value);
    line.controls.productId.setValue(ev.option.value);
    line.controls.batchId.setValue('', { emitEvent: false });
    line.controls.productDisplay.setValue(
      product ? `${product.productCode} — ${product.name}` : ev.option.viewValue,
    );
    this.productSearchQuery.set('');
    this.refreshBatches();
  }

  onWarehouseSelected(id: string): void {
    this.form.controls.warehouseId.setValue(id);
    this.refreshBatches();
  }

  onWarehouseCleared(): void {
    this.form.controls.warehouseId.setValue('');
    this.refreshBatches();
  }

  syncLineProductDisplay(index: number): void {
    const line = this.linesArray.at(index);
    const pid = line.controls.productId.getRawValue();
    if (pid && line.controls.productDisplay.getRawValue()) return;
    line.controls.productDisplay.setValue(this.getProductName(pid));
  }

  onProductSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearchQuery.set(input.value);
  }

  private taxRate(taxType: string): number {
    switch (taxType) {
      case 'IVA5':
        return 0.05;
      case 'IVA8':
        return 0.08;
      case 'IVA19':
        return 0.19;
      default:
        return 0;
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.linesArray.invalid) {
      this.form.markAllAsTouched();
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const missingBatch = this.linesArray.controls.some(
      (line) => line.controls.productId.value && !line.controls.batchId.value,
    );
    if (missingBatch) {
      this.error.set('Cada producto debe tener un lote seleccionado.');
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const raw = this.form.getRawValue();
    const request: SalesDocumentRequest = {
      type: raw.type as SalesDocumentType,
      clientId: raw.clientId,
      warehouseId: raw.warehouseId,
    };

    this.saving.set(true);
    this.error.set(null);

    try {
      const doc: SalesDocument = await firstValueFrom(this.saleService.createDocument(request));

      await this.saveItems(doc.id);

      await Swal.fire({
        icon: 'success',
        title: this.loadedId ? 'Documento actualizado' : 'Documento creado',
        text: `El documento fue ${this.loadedId ? 'actualizado' : 'creado'} correctamente.`,
        confirmButtonColor: '#15803d',
      });

      this.router.navigate(['/pos/cotizaciones']);
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: err?.error?.message ?? 'Error al guardar el documento. Intentá de nuevo.',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  private async saveItems(documentId: string): Promise<void> {
    const items = this.linesArray.getRawValue();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || item.quantity <= 0) continue;

      const request: SaleItemRequest = {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxType: item.taxType,
        batchId: item.batchId || null,
      };

      await firstValueFrom(this.saleService.addItem(documentId, request));
    }
  }

  async transition(targetStatus: SalesDocumentStatus): Promise<void> {
    const doc = this.documentData();
    if (!doc) return;

    const statusLabel = this.statusLabel(targetStatus);
    const result = await Swal.fire({
      icon: 'question',
      title: `¿Cambiar a "${statusLabel}"?`,
      text: `El documento pasará al estado "${statusLabel}".`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803d',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.saleService.transitionDocument(doc.id, targetStatus),
      );
      this.documentData.set(updated);
      this.saving.set(false);

      await Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: `El documento ahora está en estado "${statusLabel}".`,
        confirmButtonColor: '#15803d',
      });
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error al cambiar estado',
        text: err?.error?.message ?? 'No se pudo cambiar el estado.',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  private getTransitions(
    status: SalesDocumentStatus,
  ): Array<{ status: SalesDocumentStatus; label: string }> {
    switch (status) {
      case 'DRAFT':
        return [{ status: 'SENT', label: 'Enviar' }];
      case 'SENT':
        return [
          { status: 'ACCEPTED', label: 'Aceptar' },
          { status: 'REJECTED', label: 'Rechazar' },
        ];
      case 'ACCEPTED':
        return [
          { status: 'CONFIRMED', label: 'Confirmar' },
          { status: 'CANCELLED', label: 'Cancelar' },
        ];
      case 'CONFIRMED':
        return [{ status: 'CANCELLED', label: 'Cancelar' }];
      default:
        return [];
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'SENT':
        return 'Enviada';
      case 'ACCEPTED':
        return 'Aceptada';
      case 'REJECTED':
        return 'Rechazada';
      case 'EXPIRED':
        return 'Expirada';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'INVOICED':
        return 'Facturado';
      default:
        return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'chip-draft';
      case 'SENT':
        return 'chip-sent';
      case 'ACCEPTED':
        return 'chip-accepted';
      case 'REJECTED':
        return 'chip-rejected';
      case 'EXPIRED':
        return 'chip-expired';
      case 'CONFIRMED':
        return 'chip-confirmed';
      case 'CANCELLED':
        return 'chip-cancelled';
      default:
        return 'chip-default';
    }
  }

  volver(): void {
    this.router.navigate(['/pos/cotizaciones']);
  }
}
