import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WarehouseDetailComponent } from './warehouse-detail';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ProductService } from '../../../../core/services/product.service';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import type { Warehouse } from '../../../../core/models/warehouse.model';
import type { InventoryStock } from '../../../../core/models/stock.model';
import type { PageResponse } from '../../../../core/models/page.model';
import type { Product } from '../../../../core/models/product.model';
import type { UnitOfMeasure } from '../../../../core/models/product-catalog.model';

registerLocaleData(localeEsCo);

const warehouse: Warehouse = {
  id: 'wh-1',
  name: 'Bodega Central',
  location: 'Zona A',
  warehouseType: 'GENERAL',
  active: true,
  createdBy: 'test',
  createdAt: '2026-05-14T10:00:00Z',
  updatedBy: null,
  updatedAt: '2026-05-14T10:00:00Z',
};

const stock: InventoryStock = {
  id: 'stock-1',
  productId: 'prod-1',
  batchId: 'batch-1',
  warehouseId: 'wh-1',
  currentQuantity: 10,
  committedQuantity: 0,
  availableQuantity: 10,
  unitCost: 5,
  updatedAt: '2026-05-14T10:00:00Z',
};

const product: Product = {
  id: 'prod-1',
  productCode: 'CUT-1',
  name: 'Paleta',
  description: 'Paleta de cerdo',
  unitOfMeasureId: 'uom-1',
  costPrice: 1000,
  salePrice: 1500,
} as unknown as Product;

const uom: UnitOfMeasure = {
  id: 'uom-1',
  code: 'KG',
  name: 'Kilogramo',
  baseUnit: null,
  active: true,
};

describe('WarehouseDetailComponent', () => {
  let fixture: ComponentFixture<WarehouseDetailComponent>;
  let component: WarehouseDetailComponent;
  let httpMock: HttpTestingController;

  const warehousesValue = signal<Warehouse[]>([warehouse]);
  const productsValue = signal<PageResponse<Product> | undefined>({
    content: [product],
    page: 0,
    size: 1,
    totalElements: 1,
    totalPages: 1,
    last: true,
  });
  const unitsValue = signal<UnitOfMeasure[]>([uom]);
  const productError = signal<string | null>(null);
  const productLoading = signal(false);

  const warehouseService = { warehouses: { value: warehousesValue } };
  const productService = {
    allProducts: { value: productsValue, isLoading: productLoading, error: productError },
  };
  const uomService = { units: { value: unitsValue, isLoading: signal(false) } };
  const route = {
    snapshot: { paramMap: { get: vi.fn().mockReturnValue('wh-1') } },
  };

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    warehousesValue.set([warehouse]);
    productsValue.set({
      content: [product],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    unitsValue.set([uom]);
    productError.set(null);
    productLoading.set(false);

    await TestBed.configureTestingModule({
      imports: [WarehouseDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: WarehouseService, useValue: warehouseService },
        { provide: ProductService, useValue: productService },
        { provide: UnitOfMeasureService, useValue: uomService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WarehouseDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/stock/warehouse/wh-1').flush([stock]);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('toma el id de la bodega desde la ruta', () => {
    expect(component.warehouseId()).toBe('wh-1');
    expect(component.warehouse()?.id).toBe('wh-1');
  });

  it('define las columnas de la tabla', () => {
    expect(component.displayedColumns).toEqual([
      'productCode',
      'description',
      'stock',
      'unitOfMeasure',
      'costPrice',
      'salePrice',
    ]);
  });

  it('combina stock, productos y unidades de medida en filas', () => {
    expect(component.stockRows()).toEqual([
      {
        productId: 'prod-1',
        productCode: 'CUT-1',
        description: 'Paleta de cerdo',
        stock: 10,
        unitOfMeasure: 'Kilogramo',
        costPrice: 1000,
        salePrice: 1500,
      },
    ]);
  });

  it('calcula el estado de carga combinado', () => {
    expect(component.loading()).toBe(false);

    productLoading.set(true);
    expect(component.loading()).toBe(true);
  });

  it('expone el error de productos', () => {
    productError.set('fallo');

    expect(component.error()).toBe('fallo');
  });

  it('muestra la información de la bodega en pantalla', () => {
    expect(fixture.nativeElement.textContent).toContain('Bodega Central');
  });
});
