import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { AdjustmentFormComponent } from './adjustment-form';
import { AdjustmentService } from '../../../core/services/adjustment.service';
import { ProductService } from '../../../core/services/product.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
  __esModule: true,
}));

describe('AdjustmentFormComponent', () => {
  let fixture: ComponentFixture<AdjustmentFormComponent>;
  let component: AdjustmentFormComponent;

  const adjustmentService = {
    create: vi.fn(),
    list: vi.fn(),
  };
  const productService = { search: vi.fn() };
  const warehouseService = { search: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    adjustmentService.create.mockReturnValue(of({ id: 'adj-1' }));

    await TestBed.configureTestingModule({
      imports: [AdjustmentFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdjustmentService, useValue: adjustmentService },
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustmentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('expone las cinco opciones de tipo de ajuste', () => {
    expect(component.typeOptions).toHaveLength(5);
    expect(component.typeOptions.map((o) => o.value)).toEqual([
      'PHYSICAL_COUNT',
      'DAMAGE',
      'EXPIRATION',
      'THEFT',
      'OTHER',
    ]);
  });

  it('inicializa el formulario con los valores por defecto', () => {
    expect(component.form.controls.adjustmentType.value).toBe('PHYSICAL_COUNT');
    expect(component.form.controls.quantityAfter.value).toBe(0);
    expect(component.saving()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('mapea las selecciones de producto, bodega y lote al formulario', () => {
    component.onProductSelected({ id: 'prod-1', name: 'Paleta', code: 'CUT-1' });
    component.onWarehouseSelected('wh-1');
    component.onBatchSelected('batch-1');

    expect(component.form.controls.productId.value).toBe('prod-1');
    expect(component.form.controls.warehouseId.value).toBe('wh-1');
    expect(component.form.controls.batchId.value).toBe('batch-1');
  });

  it('normaliza la selección nula de lote a cadena vacía', () => {
    component.onBatchSelected(null);
    expect(component.form.controls.batchId.value).toBe('');
  });

  it('no llama al servicio cuando el formulario es inválido', () => {
    adjustmentService.create.mockClear();

    component.submit();

    expect(adjustmentService.create).not.toHaveBeenCalled();
    expect(component.form.controls.productId.touched).toBe(true);
  });

  it('envía el request de ajuste normalizado al servicio', () => {
    component.form.patchValue({
      productId: 'prod-1',
      batchId: '  ',
      warehouseId: 'wh-1',
      adjustmentType: 'DAMAGE',
      quantityAfter: 7,
      reason: '  Producto dañado  ',
    });

    component.submit();

    expect(adjustmentService.create).toHaveBeenCalledTimes(1);
    expect(adjustmentService.create).toHaveBeenCalledWith({
      productId: 'prod-1',
      batchId: null,
      warehouseId: 'wh-1',
      adjustmentType: 'DAMAGE',
      quantityAfter: 7,
      reason: '  Producto dañado  ',
    });
    expect(component.saving()).toBe(false);
  });

  it('conserva el batchId cuando viene definido', () => {
    component.form.patchValue({
      productId: 'prod-1',
      batchId: 'batch-9',
      warehouseId: 'wh-1',
      adjustmentType: 'THEFT',
      quantityAfter: 1,
      reason: 'Hurto',
    });

    component.submit();

    expect(adjustmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'batch-9' }),
    );
  });

  it('expone el mensaje de error del backend y deja de guardar', () => {
    adjustmentService.create.mockReturnValue(
      throwError(() => ({ error: { message: 'Ajuste inválido' } })),
    );

    component.form.patchValue({
      productId: 'prod-1',
      batchId: '',
      warehouseId: 'wh-1',
      adjustmentType: 'PHYSICAL_COUNT',
      quantityAfter: 3,
      reason: 'Conteo',
    });

    component.submit();

    expect(component.error()).toBe('Ajuste inválido');
    expect(component.saving()).toBe(false);
  });

  it('usa un mensaje genérico cuando el backend no informa uno', () => {
    adjustmentService.create.mockReturnValue(throwError(() => ({ error: {} })));

    component.form.patchValue({
      productId: 'prod-1',
      batchId: '',
      warehouseId: 'wh-1',
      adjustmentType: 'OTHER',
      quantityAfter: 2,
      reason: 'Otro',
    });

    component.submit();

    expect(component.error()).toBe('Error al crear el ajuste.');
  });
});
