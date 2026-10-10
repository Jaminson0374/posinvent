import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';

import { StockManualComponent } from './stock-manual';
import { ProductService } from '../../../core/services/product.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

describe('StockManualComponent', () => {
  let fixture: ComponentFixture<StockManualComponent>;
  let component: StockManualComponent;
  let httpMock: HttpTestingController;

  const productService = { search: vi.fn() };
  const warehouseService = { search: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockManualComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StockManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('inicializa ambos formularios con valores por defecto', () => {
    expect(component.entryForm.controls.quantity.value).toBe(0);
    expect(component.entryForm.controls.unitCost.value).toBe(0);
    expect(component.exitForm.controls.quantity.value).toBe(0);
    expect(component.saving()).toBe(false);
  });

  it('mapea las selecciones del formulario de entrada', () => {
    component.onEntryProductSelected({ id: 'prod-1' });
    component.onEntryWarehouseSelected('wh-1');
    component.onEntryBatchSelected('batch-1');

    expect(component.entryForm.controls.productId.value).toBe('prod-1');
    expect(component.entryForm.controls.warehouseId.value).toBe('wh-1');
    expect(component.entryForm.controls.batchId.value).toBe('batch-1');
  });

  it('normaliza el lote nulo en el formulario de salida', () => {
    component.onExitBatchSelected(null);
    expect(component.exitForm.controls.batchId.value).toBe('');
  });

  it('no envía request cuando el formulario de entrada es inválido', async () => {
    await component.entrySubmit();

    expect(httpMock.match('/api/v1/stock/entry')).toHaveLength(0);
  });

  it('envía el request de entrada normalizado', async () => {
    component.entryForm.patchValue({
      productId: 'prod-1',
      batchId: '  ',
      warehouseId: 'wh-1',
      quantity: 5,
      unitCost: 0,
      notes: 'ingreso',
    });

    const promise = component.entrySubmit();

    const req = httpMock.expectOne('/api/v1/stock/entry');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      productId: 'prod-1',
      batchId: null,
      warehouseId: 'wh-1',
      quantity: 5,
      unitCost: 0,
      notes: 'ingreso',
    });

    req.flush({});
    await promise;

    expect(component.saving()).toBe(false);
    expect(component.entryForm.controls.quantity.value).toBe(0);
  });

  it('envía el request de salida normalizado', async () => {
    component.exitForm.patchValue({
      productId: 'prod-2',
      batchId: 'batch-2',
      warehouseId: 'wh-2',
      quantity: 3,
      reason: 'venta',
    });

    const promise = component.exitSubmit();

    const req = httpMock.expectOne('/api/v1/stock/exit');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      productId: 'prod-2',
      batchId: 'batch-2',
      warehouseId: 'wh-2',
      quantity: 3,
      reason: 'venta',
    });

    req.flush({});
    await promise;

    expect(component.saving()).toBe(false);
    expect(component.exitForm.controls.quantity.value).toBe(0);
  });

  it('deja de guardar y muestra error si falla la entrada', async () => {
    component.entryForm.patchValue({
      productId: 'prod-1',
      batchId: '',
      warehouseId: 'wh-1',
      quantity: 5,
      unitCost: 10,
      notes: '',
    });

    const promise = component.entrySubmit();

    const req = httpMock.expectOne('/api/v1/stock/entry');
    req.flush({ message: 'Stock insuficiente' }, { status: 400, statusText: 'Bad Request' });
    await promise;

    expect(component.saving()).toBe(false);
  });
});
