import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { WarehouseFormComponent } from './warehouse-form';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { WAREHOUSE_TYPE_LABELS } from '../../../../core/models/warehouse.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

function warehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh-1',
    name: 'Bodega Central',
    location: 'Zona A',
    warehouseType: 'CORTES',
    active: true,
    createdBy: 'test',
    createdAt: '2026-05-14T10:00:00Z',
    updatedBy: null,
    updatedAt: '2026-05-14T10:00:00Z',
    ...overrides,
  };
}

describe('WarehouseFormComponent', () => {
  let fixture: ComponentFixture<WarehouseFormComponent>;
  let component: WarehouseFormComponent;

  const service = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    reload: vi.fn(),
  };

  async function setup(paramId: string | null): Promise<void> {
    const route = { snapshot: { paramMap: { get: () => paramId } } };

    await TestBed.configureTestingModule({
      imports: [WarehouseFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: WarehouseService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    service.getById.mockReturnValue(of(warehouse()));
    service.create.mockReturnValue(of(warehouse()));
    service.update.mockReturnValue(of(warehouse()));
  });

  describe('modo creación', () => {
    beforeEach(async () => {
      await setup(null);
    });

    it('crea el componente y renderiza el formulario', () => {
      expect(component).toBeTruthy();
      expect(component.form.contains('name')).toBe(true);
      expect(component.form.contains('warehouseType')).toBe(true);
      expect(component.form.contains('location')).toBe(true);
    });

    it('expone las opciones de tipo mapeadas desde las etiquetas', () => {
      expect(component.typeOptions.map((o) => o.value)).toEqual(Object.keys(WAREHOUSE_TYPE_LABELS));
    });

    it('no está en modo edición', () => {
      expect(component.isEdit()).toBe(false);
      expect(component.warehouseId()).toBeNull();
    });

    it('no llama al servicio cuando el formulario es inválido', () => {
      component.submit();

      expect(service.create).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(component.form.controls.name.touched).toBe(true);
    });

    it('no llama al servicio cuando el tipo no fue seleccionado', () => {
      component.form.patchValue({ name: 'Bodega Norte' });

      component.submit();

      expect(service.create).not.toHaveBeenCalled();
    });

    it('crea la bodega con el request normalizado', () => {
      component.form.patchValue({
        name: 'Bodega Norte',
        warehouseType: 'CANAL',
        location: '  Pasillo 3  ',
      });

      component.submit();

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith('Bodega Norte', 'CANAL', '  Pasillo 3  ');
      expect(service.update).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    });
  });

  describe('modo edición', () => {
    beforeEach(async () => {
      await setup('wh-1');
    });

    it('carga la bodega por id y precarga el formulario', () => {
      expect(service.getById).toHaveBeenCalledWith('wh-1');
      expect(component.isEdit()).toBe(true);
      expect(component.warehouseId()).toBe('wh-1');
      expect(component.form.getRawValue()).toEqual({
        name: 'Bodega Central',
        warehouseType: 'CORTES',
        location: 'Zona A',
      });
    });

    it('envía el update al servicio con el id', () => {
      component.form.patchValue({ name: 'Bodega Central 2', warehouseType: 'GENERAL' });

      component.submit();

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith('wh-1', 'Bodega Central 2', 'GENERAL', 'Zona A');
      expect(service.create).not.toHaveBeenCalled();
    });

    it('expone el error del backend y deja de guardar', () => {
      service.update.mockReturnValue(
        throwError(() => ({ error: { message: 'Bodega inválida' } })),
      );

      component.submit();

      expect(component.error()).toBe('Bodega inválida');
      expect(component.saving()).toBe(false);
    });
  });
});
