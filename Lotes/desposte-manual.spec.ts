import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import type { Batch } from '../../../../core/models/batch.model';
import type { ManualDesposteResult } from '../../../../core/models/desposte.model';
import type { Product } from '../../../../core/models/product.model';
import type { UserRole } from '../../../../core/models/user.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { BatchService } from '../../../../core/services/batch.service';
import { DesposteService } from '../../../../core/services/desposte.service';
import { ProductService } from '../../../../core/services/product.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { DesposteManualComponent, createProductsPage } from './desposte-manual';

describe('DesposteManualComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  const batch: Batch = {
    id: '4d0cb536-d4ae-45f1-b58f-c2416a857378',
    supplierId: '29c403d7-e98f-492e-879d-b9076ff75356',
    warehouseId: '53e9326a-e5d8-4444-a88d-3137c19866a0',
    entryDate: '2026-05-14',
    initialWeight: 120,
    purchaseCost: 580_000,
    status: 'OPEN',
    notes: null,
    createdBy: '8bf3f501-ebbe-4104-b77c-3d85e06ae3b5',
    createdAt: '2026-05-14T10:00:00Z',
  };

  const product: Product = {
    id: 'ff61ea18-ae57-45fa-89f0-fd0dd6762f39',
    productCode: 'CUT-001',
    name: 'Paleta',
    barcode: null,
    reference: null,
    description: null,
    productTypeId: null,
    productStateId: null,
    brandId: null,
    modelId: null,
    categoryId: null,
    groupId: null,
    unitOfMeasureId: null,
    costPrice: 0,
    profitMargin: 0,
    taxType: 'EXENTO',
    salePrice: 0,
    costingMethod: 'YIELD_COSTING',
    initialStock: 0,
    minStock: 0,
    maxStock: 0,
    manufacturedInHouse: false,
    costAffectingExp: false,
    manageLots: true,
    perishable: true,
    belongsToProduct: false,
    sellBelowMin: false,
    inventoriable: true,
    totalStock: 0,
    serialNumber: null,
    originCountry: null,
    specifications: null,
    incomeAccountId: null,
    inventoryAccountId: null,
    costOfSalesAcctId: null,
    active: true,
    version: 0,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z',
    warehouses: [],
    suppliers: [],
    images: [],
    promotions: [],
    priceEntries: [],
  };

  const inactiveProduct: Product = {
    ...product,
    id: 'd824ca3e-30d0-494d-9eca-8702c6ddc0d9',
    productCode: 'CUT-002',
    name: 'Producto inactivo',
    active: false,
  };

  const nonInventoriableProduct: Product = {
    ...product,
    id: '7c0d30d6-b59a-4ca0-aa47-b06442dd0eff',
    productCode: 'CUT-003',
    name: 'Producto no inventariable',
    inventoriable: false,
  };

  const warehouse: Warehouse = {
    id: 'fa741a93-3646-459a-8dfd-c9e1000bda08',
    name: 'Bodega Cortes',
    location: 'Zona A',
    warehouseType: 'CORTES',
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
  };

  const result: ManualDesposteResult = {
    sourceBatchId: batch.id,
    massBalance: {
      inputWeight: 120,
      totalCutsWeight: 118,
      wasteWeight: 1,
      shrinkWeight: 1,
      deviation: 0,
      tolerance: 0.6,
      withinTolerance: true,
    },
    totalCommercialValue: 2_832_000,
    totalAllocatedCost: 580_000,
    cuts: [
      {
        productId: product.id,
        warehouseId: warehouse.id,
        weight: 118,
        suggestedSalePrice: 24_000,
        commercialValue: 2_832_000,
        allocatedCost: 580_000,
        unitCost: 4_915.25,
      },
    ],
    stockUpserts: [
      {
        productId: product.id,
        batchId: batch.id,
        warehouseId: warehouse.id,
        quantityDelta: 118,
        unitCost: 4_915.25,
      },
    ],
    sourceBatchTransition: {
      batchId: batch.id,
      previousStatus: 'OPEN',
      nextStatus: 'CLOSED',
      action: 'CLOSE',
    },
  };

  const role = vi.fn<() => UserRole | undefined>();
  const batchService = {
    listProcessable: vi.fn(),
  };
  const productService = {
    search: vi.fn(),
  };
  const warehouseService = {
    listAll: vi.fn(),
  };
  const desposteService = {
    processManual: vi.fn(),
  };

  beforeEach(async () => {
    role.mockReturnValue('ADMIN');
    batchService.listProcessable.mockReturnValue(of([batch]));
    productService.search.mockReturnValue(of(createProductsPage([product])));
    warehouseService.listAll.mockReturnValue(of([warehouse]));
    desposteService.processManual.mockReturnValue(of(result));

    await TestBed.configureTestingModule({
      imports: [DesposteManualComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: { userRole: role } },
        { provide: BatchService, useValue: batchService },
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
        { provide: DesposteService, useValue: desposteService },
      ],
    }).compileComponents();
  });

  it('envia el request minimo compatible con el backend', () => {
    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.form.patchValue({
      sourceBatchId: batch.id,
      manualJustification: '  Desposte manual de prueba  ',
      wasteWeight: 1,
      shrinkWeight: 1,
      notes: '   ',
    });
    component.cuts.at(0).patchValue({
      productId: product.id,
      warehouseId: warehouse.id,
      weight: 118,
      suggestedSalePrice: 24_000,
    });

    component.submit();

    expect(desposteService.processManual).toHaveBeenCalledWith({
      sourceBatchId: batch.id,
      sourceType: 'MANUAL',
      manualJustification: 'Desposte manual de prueba',
      wasteWeight: 1,
      shrinkWeight: 1,
      notes: null,
      cuts: [
        {
          expirationDate: null,
          productId: product.id,
          warehouseId: warehouse.id,
          weight: 118,
          suggestedSalePrice: 24_000,
        },
      ],
    });
    expect(component.submitSuccess()).toContain('Desposte registrado');
    expect(component.lastResult()).toEqual(result);
  });

  it('muestra un resumen operativo claro luego del submit exitoso', () => {
    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.form.patchValue({
      sourceBatchId: batch.id,
      manualJustification: 'Desposte manual de prueba',
      wasteWeight: 1,
      shrinkWeight: 1,
      notes: '',
    });

    component.selectProduct(component.cuts.at(0), product);
    component.cuts.at(0).patchValue({
      warehouseId: warehouse.id,
      weight: 118,
      suggestedSalePrice: 24_000,
    });

    component.submit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Resumen operativo');
    expect(text).toContain('Lote origen');
    expect(text).toContain('Balance de masa');
    expect(text).toContain('Valor comercial total');
    expect(text).toContain('Costo total asignado');
    expect(text).toContain('Cortes generados');
    expect(text).toContain('Paleta · CUT-001');
    expect(text).toContain('Bodega Cortes · Zona A');
    expect(text).toContain('Abierto → Cerrado');
  });

  it('muestra el mensaje legible cuando el backend responde ErrorResponse', () => {
    desposteService.processManual.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              timestamp: '2026-05-14T12:00:00Z',
              errorCode: 'DESPOSTE_VALIDATION_ERROR',
              message: 'Validación backend',
              details: {
                cuts: ['El corte 1 requiere productId'],
                sourceBatchId: 'UUID inválido',
              },
            },
          }),
      ),
    );

    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.form.patchValue({
      sourceBatchId: batch.id,
      manualJustification: 'Desposte manual de prueba',
      wasteWeight: 1,
      shrinkWeight: 1,
      notes: '',
    });
    component.cuts.at(0).patchValue({
      productId: product.id,
      warehouseId: warehouse.id,
      weight: 118,
      suggestedSalePrice: 24_000,
    });

    component.submit();

    expect(component.submitError()).toContain('Validación backend');
    expect(component.submitError()).toContain('cuts: El corte 1 requiere productId');
    expect(component.submitError()).toContain('sourceBatchId: UUID inválido');
  });

  it('busca productos por fila, filtra opciones válidas y limpia el producto al editar', () => {
    vi.useFakeTimers();
    productService.search.mockReturnValue(
      of(createProductsPage([product, inactiveProduct, nonInventoriableProduct])),
    );

    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(productService.search).not.toHaveBeenCalled();

    const cut = component.cuts.at(0);
    cut.controls.productSearch.setValue('Pal');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalledWith('Pal', 0, 10);
    expect(component.productSearchResults(cut)).toEqual([product]);

    component.selectProduct(cut, product);
    expect(cut.controls.productId.getRawValue()).toBe(product.id);

    cut.controls.productSearch.setValue('Paleta especial', { emitEvent: false });
    component.onProductSearchInput(cut, 'Paleta especial');

    expect(cut.controls.productId.getRawValue()).toBe('');
  });

  it('reutiliza el cache compartido entre filas para variantes equivalentes del término', () => {
    vi.useFakeTimers();

    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.addCut();

    const firstCut = component.cuts.at(0);
    const secondCut = component.cuts.at(1);

    firstCut.controls.productSearch.setValue('Pal');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalled();
    expect(component.productSearchResults(firstCut)).toEqual([product]);

    productService.search.mockClear();

    secondCut.controls.productSearch.setValue(' pal ');

    vi.advanceTimersByTime(250);

    expect(productService.search).not.toHaveBeenCalled();
    expect(component.productSearchResults(firstCut)).toEqual([product]);
    expect(component.productSearchResults(secondCut)).toEqual([product]);
  });

  it('deduplica requests en vuelo entre filas para variantes equivalentes del término', () => {
    vi.useFakeTimers();

    const searchResponse$ = new Subject<ReturnType<typeof createProductsPage>>();
    productService.search.mockReturnValue(searchResponse$.asObservable());

    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.addCut();

    const firstCut = component.cuts.at(0);
    const secondCut = component.cuts.at(1);

    firstCut.controls.productSearch.setValue('Pal');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalledTimes(1);
    expect(component.productSearchLoading(firstCut)).toBe(true);

    secondCut.controls.productSearch.setValue('pal');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalledTimes(1);
    expect(component.productSearchLoading(secondCut)).toBe(true);

    searchResponse$.next(createProductsPage([product, inactiveProduct, nonInventoriableProduct]));
    searchResponse$.complete();

    expect(component.productSearchLoading(firstCut)).toBe(false);
    expect(component.productSearchLoading(secondCut)).toBe(false);
    expect(component.productSearchResults(firstCut)).toEqual([product]);
    expect(component.productSearchResults(secondCut)).toEqual([product]);
  });

  it('no vuelve a buscar en la misma fila cuando solo cambia mayúsculas o espacios', () => {
    vi.useFakeTimers();

    const fixture = TestBed.createComponent(DesposteManualComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    productService.search.mockClear();

    const cut = component.cuts.at(0);

    cut.controls.productSearch.setValue('Pal');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalledTimes(1);

    cut.controls.productSearch.setValue(' pal ');

    vi.advanceTimersByTime(250);

    expect(productService.search).toHaveBeenCalledTimes(1);
    expect(component.productSearchResults(cut)).toEqual([product]);
  });
});
