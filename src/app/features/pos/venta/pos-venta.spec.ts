import '@angular/compiler';
import { WritableSignal, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { Product } from '../../../core/models/product.model';
import { ThirdParty } from '../../../core/models/third-party.model';
import { computeDiscountTotals } from '../../../core/domain/discount';
import { ProductCatalogCategory, UnitOfMeasure } from '../../../core/models/product-catalog.model';
import { SCALE_STATUS, ScaleReading, ScaleStatus } from '../../../core/models/scale.model';
import { ScaleService } from '../../../core/services/scale.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import { ProductCatalogCategoryService } from '../../../core/services/product-catalog-category.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { PosService } from '../../../core/services/pos.service';
import { SaleService } from '../../../core/services/sale.service';
import { PosVentaComponent } from './pos-venta';

registerLocaleData(localeEsCo);

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

function makeProduct(partial: Partial<Product>): Product {
  return {
    id: 'p1',
    productCode: 'P1',
    name: 'Producto',
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
    salePrice: 10000,
    costingMethod: 'PEPS',
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
    inventoriable: false,
    serialNumber: null,
    originCountry: null,
    specifications: null,
    incomeAccountId: null,
    inventoryAccountId: null,
    costOfSalesAcctId: null,
    accountingTemplateId: null,
    active: true,
    version: 1,
    createdBy: 'user',
    createdAt: '2026-01-01T00:00:00Z',
    updatedBy: null,
    updatedAt: '2026-01-01T00:00:00Z',
    warehouses: [],
    suppliers: [],
    images: [],
    promotions: [],
    priceEntries: [],
    ...partial,
  };
}

const KG_UNIT: UnitOfMeasure = {
  id: 'uom-kg',
  code: 'KG',
  name: 'Kilogramo',
  baseUnit: 'kg',
  active: true,
};
const UND_UNIT: UnitOfMeasure = {
  id: 'uom-und',
  code: 'UND',
  name: 'Unidad',
  baseUnit: 'unit',
  active: true,
};

describe('PosVentaComponent — weight capture', () => {
  let fixture: ComponentFixture<PosVentaComponent>;
  let component: PosVentaComponent;
  let scaleReading: WritableSignal<ScaleReading | null>;
  let scaleStatus: WritableSignal<ScaleStatus>;
  let scaleError: WritableSignal<string | null>;
  let scaleService: {
    currentReading: typeof scaleReading;
    status: typeof scaleStatus;
    errorMessage: typeof scaleError;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    startPolling: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
  };

  const weightProduct = makeProduct({
    id: 'p-weight',
    name: 'Queso',
    unitOfMeasureId: 'uom-kg',
    salePrice: 25000,
  });
  const unitProduct = makeProduct({
    id: 'p-unit',
    name: 'Gaseosa',
    unitOfMeasureId: 'uom-und',
    salePrice: 3500,
  });

  beforeEach(async () => {
    scaleReading = signal<ScaleReading | null>(null);
    scaleStatus = signal<ScaleStatus>(SCALE_STATUS.CONNECTED);
    scaleError = signal<string | null>(null);
    scaleService = {
      currentReading: scaleReading,
      status: scaleStatus,
      errorMessage: scaleError,
      connect: vi.fn(async () => undefined),
      disconnect: vi.fn(async () => undefined),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    };

    const unitService = {
      units: {
        value: () => [KG_UNIT, UND_UNIT] as UnitOfMeasure[],
      },
    };
    const categoryService = {
      categories: { value: () => [] as ProductCatalogCategory[] },
      reload: vi.fn(),
    };
    const warehouseService = { listAll: () => of([]) };
    const cashRegisterService = { listActive: () => of([]) };
    const posService = {
      searchProducts: () =>
        of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 0, last: true }),
    };

    await TestBed.configureTestingModule({
      imports: [PosVentaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ScaleService, useValue: scaleService },
        { provide: UnitOfMeasureService, useValue: unitService },
        { provide: ProductCatalogCategoryService, useValue: categoryService },
        { provide: WarehouseService, useValue: warehouseService },
        { provide: CashRegisterService, useValue: cashRegisterService },
        { provide: PosService, useValue: posService },
        { provide: SaleService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('detects weight products from their UoM code', () => {
    expect(component.isWeightProduct(weightProduct)).toBe(true);
    expect(component.isWeightProduct(unitProduct)).toBe(false);
  });

  it('adds a weight product with a pending zero quantity', () => {
    component.addToOrder(weightProduct);

    const line = component.orderLines()[0];
    expect(line.isWeight).toBe(true);
    expect(line.quantity).toBe(0);
    expect(line.subtotal).toBe(0);
  });

  it('adds a unit product with quantity 1 as before', () => {
    component.addToOrder(unitProduct);

    const line = component.orderLines()[0];
    expect(line.isWeight).toBe(false);
    expect(line.quantity).toBe(1);
    expect(line.subtotal).toBe(3500);
  });

  it('captures a stable reading as the line quantity in kilograms', () => {
    component.addToOrder(weightProduct);
    scaleReading.set({
      weight: 1.5,
      unit: 'kg',
      stable: true,
      timestamp: '2026-01-01T00:00:00Z',
    });

    component.captureWeight();

    const line = component.orderLines()[0];
    expect(line.quantity).toBe(1.5);
    expect(line.subtotal).toBe(37500);
  });

  it('normalises a gram reading to kilograms', () => {
    component.addToOrder(weightProduct);
    scaleReading.set({
      weight: 1500,
      unit: 'g',
      stable: true,
      timestamp: '2026-01-01T00:00:00Z',
    });

    component.captureWeight();

    expect(component.orderLines()[0].quantity).toBe(1.5);
  });

  it('ignores an unstable reading', () => {
    component.addToOrder(weightProduct);
    scaleReading.set({
      weight: 2,
      unit: 'kg',
      stable: false,
      timestamp: '2026-01-01T00:00:00Z',
    });

    component.captureWeight();

    expect(component.orderLines()[0].quantity).toBe(0);
  });

  it('ignores capture when there is no reading', () => {
    component.addToOrder(weightProduct);
    scaleReading.set(null);

    component.captureWeight();

    expect(component.orderLines()[0].quantity).toBe(0);
  });

  it('reports canCapture only when connected and stable', () => {
    scaleReading.set({
      weight: 1,
      unit: 'kg',
      stable: true,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(component.canCapture()).toBe(true);

    scaleStatus.set(SCALE_STATUS.DISCONNECTED);
    expect(component.canCapture()).toBe(false);

    scaleStatus.set(SCALE_STATUS.CONNECTED);
    scaleReading.set({
      weight: 1,
      unit: 'kg',
      stable: false,
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(component.canCapture()).toBe(false);
  });

  it('captures into the explicitly selected line', () => {
    component.addToOrder(weightProduct);
    component.addToOrder(weightProduct); // re-selects the same line, quantity stays 0
    scaleReading.set({
      weight: 3,
      unit: 'kg',
      stable: true,
      timestamp: '2026-01-01T00:00:00Z',
    });

    component.captureWeightForLine(0);

    expect(component.orderLines()[0].quantity).toBe(3);
  });
});

/** Makes the Swal payment dialog resolve with a single cash line covering the total. */
function mockPaymentSwal(total = 10000): void {
  vi.mocked(Swal.fire).mockImplementation((async (opts: { title?: string }) => {
    if (opts?.title === 'Cobrar') {
      return {
        isConfirmed: true,
        value: { lines: [{ method: 'EFECTIVO', amount: total }], change: 0 },
      };
    }
    return { isConfirmed: true };
  }) as never);
}

describe('PosVentaComponent — discounts', () => {
  let fixture: ComponentFixture<PosVentaComponent>;
  let component: PosVentaComponent;
  let saleService: {
    createDocument: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    transitionDocument: ReturnType<typeof vi.fn>;
  };
  let posService: {
    searchProducts: ReturnType<typeof vi.fn>;
    checkout: ReturnType<typeof vi.fn>;
    authorizeDiscount: ReturnType<typeof vi.fn>;
  };

  const exentoProduct = makeProduct({
    id: 'p-exento',
    name: 'Exento',
    taxType: 'EXENTO',
    salePrice: 10000,
    unitOfMeasureId: 'uom-und',
  });
  const iva19Product = makeProduct({
    id: 'p-iva19',
    name: 'Iva 19',
    taxType: 'IVA_19',
    salePrice: 5000,
    unitOfMeasureId: 'uom-und',
  });

  beforeEach(async () => {
    saleService = {
      createDocument: vi.fn(() => of({ id: 'doc-1' })),
      addItem: vi.fn(() => of({ id: 'doc-1' })),
      transitionDocument: vi.fn(() => of({ id: 'doc-1' })),
    };
    posService = {
      searchProducts: vi.fn(() =>
        of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 0, last: true }),
      ),
      checkout: vi.fn(),
      authorizeDiscount: vi.fn(),
    };

    const unitService = { units: { value: () => [KG_UNIT, UND_UNIT] as UnitOfMeasure[] } };
    const categoryService = {
      categories: { value: () => [] as ProductCatalogCategory[] },
      reload: vi.fn(),
    };
    const warehouseService = { listAll: () => of([{ id: 'wh-1', warehouseType: 'GENERAL', active: true }]) };
    const cashRegisterService = { listActive: () => of([{ id: 'cr-1', active: true }]) };
    const scaleService = {
      currentReading: signal<ScaleReading | null>(null),
      status: signal<ScaleStatus>(SCALE_STATUS.DISCONNECTED),
      errorMessage: signal<string | null>(null),
      connect: vi.fn(),
      disconnect: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PosVentaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ScaleService, useValue: scaleService },
        { provide: UnitOfMeasureService, useValue: unitService },
        { provide: ProductCatalogCategoryService, useValue: categoryService },
        { provide: WarehouseService, useValue: warehouseService },
        { provide: CashRegisterService, useValue: cashRegisterService },
        { provide: PosService, useValue: posService },
        { provide: SaleService, useValue: saleService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  it('mirrors the backend DiscountTotalsIntegrationTest numbers', () => {
    // Reference: DiscountTotalsIntegrationTest.checkoutAppliesLineAndDocumentDiscountsBeforeIva
    // EXENTO gross 10,000 with 10% line discount; IVA_19 gross 10,000 with 500 fixed;
    // 10% document discount prorated 900 / 950.
    const totals = computeDiscountTotals(
      [
        { gross: 10000, taxRatePercent: 0, discountType: 'PCT', discountValue: 10 },
        { gross: 10000, taxRatePercent: 19, discountType: 'AMOUNT', discountValue: 500 },
      ],
      'PCT',
      10,
    );

    expect(totals.netBeforeDocument).toBe(18500);
    expect(totals.documentDiscount).toBe(1850);
    expect(totals.lines[0].documentAllocated).toBe(900);
    expect(totals.lines[1].documentAllocated).toBe(950);
    expect(totals.lines[0].finalBase).toBe(8100);
    expect(totals.lines[1].finalBase).toBe(8550);
    expect(totals.net).toBe(16650);
    expect(totals.tax0).toBe(0);
    expect(totals.tax5).toBe(0);
    expect(totals.tax19).toBe(1624.5);
    expect(totals.total).toBe(18274.5);
    expect(totals.lineDiscountTotal).toBe(1500);
    expect(totals.discountTotal).toBe(3350);
  });

  it('recalculates component totals with line and document discounts before IVA', () => {
    component.addToOrder(exentoProduct); // 10,000 EXENTO
    component.addToOrder(iva19Product); // 5,000 IVA_19
    component.incrementLine(1); // quantity 2 -> gross 10,000

    component.setLineDiscountType(0, 'PCT');
    component.setLineDiscountValue(0, '10');
    component.setLineDiscountType(1, 'AMOUNT');
    component.setLineDiscountValue(1, '500');
    component.setDocumentDiscountType('PCT');
    component.setDocumentDiscountValue('10');

    expect(component.subtotal()).toBe(16650);
    expect(component.taxTotals().tax19).toBe(1624.5);
    expect(component.grandTotal()).toBe(18274.5);
    expect(component.lineDiscountTotal()).toBe(1500);
    expect(component.documentDiscountAmount()).toBe(1850);
  });

  it('sends line discounts and retries checkout with a token after a 409', async () => {
    mockPaymentSwal();
    vi.spyOn(MatDialog.prototype, 'open').mockReturnValue({
      afterClosed: () => of({ username: 'admin', password: 'secret' }),
    } as never);
    posService.checkout
      .mockReturnValueOnce(
        throwError(() => ({ status: 409, error: { errorCode: 'DISCOUNT_AUTHORIZATION_REQUIRED' } })),
      )
      .mockReturnValueOnce(
        of({ invoiceId: 'inv-1', documentNumber: 'F-1', totalAmount: 18274.5, changeAmount: 0 }),
      );
    posService.authorizeDiscount.mockReturnValue(
      of({ authorizationId: 'auth-1', expiresAt: '2026-01-01T00:00:00Z', authorizedBy: 'admin' }),
    );

    component.selectedCustomer.set({ id: 'c-1', name: 'Cliente' } as ThirdParty);
    component.addToOrder(iva19Product);
    component.setLineDiscountType(0, 'AMOUNT');
    component.setLineDiscountValue(0, '500');
    component.setDocumentDiscountType('PCT');
    component.setDocumentDiscountValue('5');
    component.setDiscountReason('Prueba');

    await component.cobrar();

    expect(saleService.addItem).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({ discountType: 'AMOUNT', discountValue: 500 }),
    );
    expect(posService.checkout).toHaveBeenCalledTimes(2);
    expect(posService.checkout.mock.calls[0][0]).toMatchObject({
      documentDiscountType: 'PCT',
      documentDiscountValue: 5,
      discountReason: 'Prueba',
    });
    expect(posService.checkout.mock.calls[0][0].discountAuthorizationId).toBeUndefined();
    expect(posService.authorizeDiscount).toHaveBeenCalledWith({
      username: 'admin',
      password: 'secret',
      cashRegisterId: 'cr-1',
    });
    expect(posService.checkout.mock.calls[1][0]).toMatchObject({
      discountAuthorizationId: 'auth-1',
    });
  });
});
