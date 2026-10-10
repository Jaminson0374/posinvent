import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { TransferFormComponent } from './transfer-form';
import { TransferService } from '../../../core/services/transfer.service';
import { ProductService } from '../../../core/services/product.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
  __esModule: true,
}));

describe('TransferFormComponent', () => {
  let fixture: ComponentFixture<TransferFormComponent>;
  let component: TransferFormComponent;

  const transferService = { create: vi.fn(), list: vi.fn() };
  const productService = { search: vi.fn() };
  const warehouseService = { search: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    transferService.create.mockReturnValue(of({ id: 'tr-1' }));

    await TestBed.configureTestingModule({
      imports: [TransferFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransferService, useValue: transferService },
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('inicializa el formulario con un ítem y valores por defecto', () => {
    expect(component.items.length).toBe(1);
    expect(component.items.at(0).get('quantity')?.value).toBe(1);
    expect(component.form.controls.sourceWarehouseId.value).toBe('');
    expect(component.saving()).toBe(false);
  });

  it('agrega y quita ítems respetando un mínimo de uno', () => {
    component.addItem();
    expect(component.items.length).toBe(2);

    component.removeItem(0);
    expect(component.items.length).toBe(1);

    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('mapea las bodegas y los ítems seleccionados', () => {
    component.onSourceWarehouse('wh-1');
    component.onTargetWarehouse('wh-2');
    component.onProductSelected(0, { id: 'prod-1', name: 'Paleta', code: 'CUT-1' });
    component.onBatchSelected(0, 'batch-1');

    expect(component.form.controls.sourceWarehouseId.value).toBe('wh-1');
    expect(component.form.controls.targetWarehouseId.value).toBe('wh-2');
    expect(component.items.at(0).get('productId')?.value).toBe('prod-1');
    expect(component.items.at(0).get('batchId')?.value).toBe('batch-1');
  });

  it('normaliza el lote nulo a cadena vacía', () => {
    component.onBatchSelected(0, null);
    expect(component.items.at(0).get('batchId')?.value).toBe('');
  });

  it('no llama al servicio cuando el formulario es inválido', () => {
    component.submit();

    expect(transferService.create).not.toHaveBeenCalled();
    expect(component.form.controls.sourceWarehouseId.touched).toBe(true);
  });

  it('envía el request de traslado normalizado', () => {
    component.form.patchValue({
      sourceWarehouseId: 'wh-1',
      targetWarehouseId: 'wh-2',
      notes: '  Traslado interno  ',
      items: [{ productId: 'prod-1', batchId: '  ', quantity: 4 }],
    });

    component.submit();

    expect(transferService.create).toHaveBeenCalledWith({
      sourceWarehouseId: 'wh-1',
      targetWarehouseId: 'wh-2',
      notes: 'Traslado interno',
      items: [{ productId: 'prod-1', batchId: null, quantity: 4 }],
    });
    expect(component.saving()).toBe(false);
  });

  it('omite las notas cuando están vacías', () => {
    component.form.patchValue({
      sourceWarehouseId: 'wh-1',
      targetWarehouseId: 'wh-2',
      notes: '   ',
      items: [{ productId: 'prod-1', batchId: '', quantity: 1 }],
    });

    component.submit();

    expect(transferService.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: undefined }),
    );
  });

  it('expone el mensaje de error del backend', () => {
    transferService.create.mockReturnValue(
      throwError(() => ({ error: { message: 'Traslado inválido' } })),
    );

    component.form.patchValue({
      sourceWarehouseId: 'wh-1',
      targetWarehouseId: 'wh-2',
      notes: '',
      items: [{ productId: 'prod-1', batchId: '', quantity: 1 }],
    });

    component.submit();

    expect(component.error()).toBe('Traslado inválido');
    expect(component.saving()).toBe(false);
  });
});
