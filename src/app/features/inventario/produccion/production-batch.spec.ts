import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { ProductionBatchComponent } from './production-batch';
import { ProductService } from '../../../core/services/product.service';
import { FormulaService } from '../../../core/services/formula.service';
import { ProductionService } from '../../../core/services/production.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import type { Product } from '../../../core/models/product.model';
import type {
  ProductFormula,
  ProduceResponse,
} from '../../../core/models/product-formula.model';

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
  __esModule: true,
}));

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'f-1',
    productCode: 'FRM-1',
    name: 'Fórmula Uno',
    productTypeId: 'type-1',
    ...overrides,
  } as unknown as Product;
}

function formula(overrides: Partial<ProductFormula> = {}): ProductFormula {
  return {
    id: 'comp-1',
    parentProductId: 'f-1',
    componentProductId: 'prod-2',
    quantity: 2,
    unitOfMeasureId: null,
    sequenceNumber: 1,
    notes: null,
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z',
    ...overrides,
  };
}

const produceResponse: ProduceResponse = {
  batchId: 'batch-9',
  productName: 'Fórmula Uno',
  quantityProduced: 3,
  mpd: 600,
  mod: 100,
  cif: 0,
  totalCost: 700,
  unitCost: 233.33,
  shrinkage: 0,
  items: [],
};

describe('ProductionBatchComponent', () => {
  let fixture: ComponentFixture<ProductionBatchComponent>;
  let component: ProductionBatchComponent;

  const route: { queryParams: BehaviorSubject<Record<string, string>> } = {
    queryParams: new BehaviorSubject<Record<string, string>>({}),
  };
  const productService = { search: vi.fn() };
  const formulaService = { list: vi.fn() };
  const productionService = { produce: vi.fn() };
  const warehouseService = { warehouses: { value: signal([]) } };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    route.queryParams = new BehaviorSubject<Record<string, string>>({});
    productService.search.mockReset();
    productService.search.mockReturnValue(
      of({
        content: [product({ id: 'f-1' }), product({ id: 'p-2', productTypeId: null })],
        page: 0,
        size: 200,
        totalElements: 2,
        totalPages: 1,
        last: true,
      }),
    );
    formulaService.list.mockReset();
    formulaService.list.mockReturnValue(of([formula()]));
    productionService.produce.mockReset();
    productionService.produce.mockReturnValue(of(produceResponse));
    (Swal.fire as ReturnType<typeof vi.fn>).mockReset();

    await TestBed.configureTestingModule({
      imports: [ProductionBatchComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ProductService, useValue: productService },
        { provide: FormulaService, useValue: formulaService },
        { provide: ProductionService, useValue: productionService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionBatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga solo los productos que son fórmulas', () => {
    expect(productService.search).toHaveBeenCalledWith('', 0, 200);
    expect(component.availableFormulas().map((p) => p.id)).toEqual(['f-1']);
  });

  it('avanza y retrocede de paso', () => {
    expect(component.step()).toBe(1);
    component.nextStep();
    expect(component.step()).toBe(2);
    component.prevStep();
    expect(component.step()).toBe(1);
  });

  it('selecciona el producto y carga los componentes', () => {
    component.availableFormulas.set([product({ id: 'f-1' })]);
    component.selectedFormulaId.set('f-1');

    component.onFormulaSelected();

    expect(component.selectedProduct()?.id).toBe('f-1');
    expect(formulaService.list).toHaveBeenCalledWith('f-1');
    expect(component.components()).toEqual([formula()]);
    expect(component.loading()).toBe(false);
  });

  it('no carga componentes sin fórmula seleccionada', () => {
    formulaService.list.mockClear();

    component.loadComponents();

    expect(formulaService.list).not.toHaveBeenCalled();
  });

  it('respeta el query param formulaId al inicializar', () => {
    formulaService.list.mockClear();

    route.queryParams.next({ formulaId: 'f-2' });

    expect(component.selectedFormulaId()).toBe('f-2');
    expect(formulaService.list).toHaveBeenCalledWith('f-2');
  });

  it('no produce cuando faltan datos requeridos', () => {
    component.produce();
    expect(productionService.produce).not.toHaveBeenCalled();

    component.selectedFormulaId.set('f-1');
    component.quantity.set(0);
    component.produce();
    expect(productionService.produce).not.toHaveBeenCalled();

    component.quantity.set(2);
    component.warehouseId.set('');
    component.produce();
    expect(productionService.produce).not.toHaveBeenCalled();
  });

  it('envía la producción y muestra el resultado', () => {
    component.selectedFormulaId.set('f-1');
    component.warehouseId.set('wh-1');
    component.quantity.set(3);
    component.laborCost.set(100);
    component.overheadCost.set(null);

    component.produce();

    expect(productionService.produce).toHaveBeenCalledWith({
      formulaProductId: 'f-1',
      warehouseId: 'wh-1',
      quantity: 3,
      laborCost: 100,
      overheadCost: null,
      notes: null,
    });
    expect(component.batchResult()).toEqual(produceResponse);
    expect(component.step()).toBe(4);
    expect(component.producing()).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
  });

  it('muestra el error de producción y deja de producir', () => {
    productionService.produce.mockReturnValue(throwError(() => ({ error: { message: 'Sin stock' } })));
    component.selectedFormulaId.set('f-1');
    component.warehouseId.set('wh-1');
    component.quantity.set(3);

    component.produce();

    expect(component.producing()).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', text: 'Sin stock' }),
    );
  });

  it('estima el M.P.D. a partir de los componentes y la cantidad', () => {
    component.components.set([formula({ quantity: 2 })]);
    component.quantity.set(3);

    expect(component.getMpdEstimate()).toBe(600);
  });
});
