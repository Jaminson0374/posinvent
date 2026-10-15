import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localesEs from '@angular/common/locales/es-CO';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { QuoteFormComponent } from './quote-form';
import { SaleService } from '../../../core/services/sale.service';
import { ProductService } from '../../../core/services/product.service';
import { StockService, AvailableBatch } from '../../../core/services/stock.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

registerLocaleData(localesEs);

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const FEFO_BATCH: AvailableBatch = {
  batchId: 'batch-fefo',
  expirationDate: '2026-01-01',
  availableQuantity: 10,
};
const LATER_BATCH: AvailableBatch = {
  batchId: 'batch-later',
  expirationDate: '2026-06-01',
  availableQuantity: 5,
};

describe('QuoteFormComponent', () => {
  let fixture: ComponentFixture<QuoteFormComponent>;
  let component: QuoteFormComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const saleService = {
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    addItem: vi.fn(),
    transitionDocument: vi.fn(),
  };
  const productService = {
    products: { value: () => ({ content: [] }), isLoading: () => false },
    pageSize: signal(20),
    query: signal(''),
  };
  const batchRef = {
    value: () => [] as AvailableBatch[],
    isLoading: () => false,
    hasValue: () => true,
    destroy: vi.fn(),
  };
  const stockService = { availableBatches: vi.fn(() => batchRef) };
  const warehouseService = { search: vi.fn(), getById: vi.fn(() => of(null)) };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    router = { navigate: vi.fn() };
    batchRef.value = () => [] as AvailableBatch[];
    batchRef.isLoading = () => false;
    stockService.availableBatches.mockReturnValue(batchRef);

    await TestBed.configureTestingModule({
      imports: [QuoteFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
        { provide: Router, useValue: router },
        { provide: SaleService, useValue: saleService },
        { provide: ProductService, useValue: productService },
        { provide: StockService, useValue: stockService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('requires a warehouse on the form', () => {
    expect(component.form.controls.warehouseId.value).toBe('');
    expect(component.form.controls.warehouseId.hasError('required')).toBe(true);

    component.form.controls.warehouseId.setValue('wh-1');
    expect(component.form.controls.warehouseId.hasError('required')).toBe(false);
  });

  it('defaults the line batch to the first available (FEFO) option', () => {
    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');

    component.applyBatchOptions(0, [FEFO_BATCH, LATER_BATCH]);

    expect(line.controls.batchId.value).toBe('batch-fefo');
  });

  it('preserves a manual batch override that is still valid', () => {
    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');

    component.applyBatchOptions(0, [FEFO_BATCH, LATER_BATCH]);
    line.controls.batchId.setValue('batch-later');
    component.applyBatchOptions(0, [FEFO_BATCH, LATER_BATCH]);

    expect(line.controls.batchId.value).toBe('batch-later');
  });

  it('replaces an invalid batch selection with the FEFO default', () => {
    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');
    line.controls.batchId.setValue('missing-batch');

    component.applyBatchOptions(0, [FEFO_BATCH, LATER_BATCH]);

    expect(line.controls.batchId.value).toBe('batch-fefo');
  });

  it('clears the batch when no options remain', () => {
    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');
    line.controls.batchId.setValue('batch-fefo');

    component.applyBatchOptions(0, []);

    expect(line.controls.batchId.value).toBe('');
  });

  it('sends the real warehouseId and the per-line batchId on save', async () => {
    saleService.createDocument.mockReturnValue(of({ id: 'doc-1' }));
    saleService.addItem.mockReturnValue(of({ id: 'doc-1' }));

    component.form.controls.clientId.setValue('client-1');
    component.form.controls.warehouseId.setValue('wh-1');

    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');
    line.controls.batchId.setValue('batch-1');
    line.controls.quantity.setValue(2);
    line.controls.unitPrice.setValue(1000);

    await component.save();

    expect(saleService.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1', warehouseId: 'wh-1' }),
    );
    expect(saleService.addItem).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({ productId: 'prod-1', batchId: 'batch-1', quantity: 2 }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/pos/cotizaciones']);
  });

  it('blocks submit when a product line has no batch selected', async () => {
    component.form.controls.clientId.setValue('client-1');
    component.form.controls.warehouseId.setValue('wh-1');

    const line = component.linesArray.at(0);
    line.controls.productId.setValue('prod-1');
    line.controls.batchId.setValue('');
    line.controls.quantity.setValue(1);
    line.controls.unitPrice.setValue(100);

    await component.save();

    expect(saleService.createDocument).not.toHaveBeenCalled();
  });
});
