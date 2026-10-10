import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { DisposalFormComponent } from './disposal-form';
import { DisposalService } from '../../../core/services/disposal.service';
import { ProductService } from '../../../core/services/product.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

describe('DisposalFormComponent', () => {
  let fixture: ComponentFixture<DisposalFormComponent>;
  let component: DisposalFormComponent;

  const disposalService = { create: vi.fn(), list: vi.fn() };
  const productService = { search: vi.fn() };
  const warehouseService = { search: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    disposalService.create.mockReturnValue(of({ id: 'disp-1' }));

    await TestBed.configureTestingModule({
      imports: [DisposalFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DisposalService, useValue: disposalService },
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisposalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('expone las opciones de tipo de decomiso', () => {
    expect(component.typeOptions.map((o) => o.value)).toEqual([
      'DECOMISO_SANITARIO',
      'RESIDUO_VENDIBLE',
      'MERMA_PROCESO',
    ]);
  });

  it('inicializa el formulario con los valores por defecto', () => {
    expect(component.form.controls.disposalType.value).toBe('DECOMISO_SANITARIO');
    expect(component.form.controls.quantity.value).toBe(1);
    expect(component.saving()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('mapea las selecciones de producto, bodega y lote', () => {
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
    component.submit();

    expect(disposalService.create).not.toHaveBeenCalled();
    expect(component.form.controls.productId.touched).toBe(true);
  });

  it('envía el request de decomiso normalizado al servicio', () => {
    component.form.patchValue({
      productId: 'prod-1',
      batchId: '   ',
      warehouseId: 'wh-1',
      disposalType: 'RESIDUO_VENDIBLE',
      quantity: 3.5,
      reason: 'Residuo',
    });

    component.submit();

    expect(disposalService.create).toHaveBeenCalledWith({
      productId: 'prod-1',
      batchId: null,
      warehouseId: 'wh-1',
      disposalType: 'RESIDUO_VENDIBLE',
      quantity: 3.5,
      reason: 'Residuo',
    });
    expect(component.saving()).toBe(false);
  });

  it('expone el mensaje de error del backend', () => {
    disposalService.create.mockReturnValue(
      throwError(() => ({ error: { message: 'Decomiso inválido' } })),
    );

    component.form.patchValue({
      productId: 'prod-1',
      batchId: '',
      warehouseId: 'wh-1',
      disposalType: 'MERMA_PROCESO',
      quantity: 1,
      reason: 'Merma',
    });

    component.submit();

    expect(component.error()).toBe('Decomiso inválido');
    expect(component.saving()).toBe(false);
  });
});
