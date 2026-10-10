import '@angular/compiler';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import {
  QuickCreatePriceListDialogComponent,
  QuickCreatePriceListData,
} from './quick-create-price-list.dialog';
import { PriceListService } from '../../../../core/services/price-list.service';
import type { PriceList } from '../../../../core/models/product-catalog.model';

const priceList: PriceList = {
  id: 'pl-1',
  code: 'MAY',
  name: 'Mayorista',
  description: 'Precio mayorista',
  active: true,
};

describe('QuickCreatePriceListDialogComponent', () => {
  const service = { create: vi.fn(), update: vi.fn(), reload: vi.fn() };
  const dialogRef = { close: vi.fn() };

  async function setup(
    data: QuickCreatePriceListData,
  ): Promise<{ fixture: ComponentFixture<QuickCreatePriceListDialogComponent>; component: QuickCreatePriceListDialogComponent }> {
    await TestBed.configureTestingModule({
      imports: [QuickCreatePriceListDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: PriceListService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(QuickCreatePriceListDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    service.create.mockReset();
    service.update.mockReset();
    service.reload.mockReset();
    dialogRef.close.mockReset();
    service.create.mockReturnValue(of(priceList));
    service.update.mockReturnValue(of(priceList));
  });

  describe('modo creación', () => {
    let fixture: ComponentFixture<QuickCreatePriceListDialogComponent>;
    let component: QuickCreatePriceListDialogComponent;

    beforeEach(async () => {
      ({ fixture, component } = await setup({ initialName: 'Temporal' }));
    });

    it('crea el componente', () => {
      expect(component).toBeTruthy();
    });

    it('detecta modo creación y precarga el nombre inicial', () => {
      expect(component.isEditMode).toBe(false);
      expect(component.form.controls.name.value).toBe('Temporal');
      expect(component.form.controls.code.value).toBe('');
    });

    it('no llama al servicio cuando el formulario es inválido', () => {
      component.submit();

      expect(service.create).not.toHaveBeenCalled();
      expect(component.form.controls.code.touched).toBe(true);
    });

    it('crea la lista con los valores normalizados', () => {
      component.form.patchValue({ code: 'MAY', name: 'Mayorista', description: '' });

      component.submit();

      expect(service.create).toHaveBeenCalledWith('MAY', 'Mayorista', undefined);
      expect(service.reload).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(priceList);
      expect(component.saving()).toBe(false);
    });

    it('propaga la descripción cuando está presente', () => {
      component.form.patchValue({ code: 'MAY', name: 'Mayorista', description: 'Principal' });

      component.submit();

      expect(service.create).toHaveBeenCalledWith('MAY', 'Mayorista', 'Principal');
    });

    it('expone el mensaje de error del backend', () => {
      service.create.mockReturnValue(throwError(() => ({ error: { message: 'Duplicado' } })));

      component.form.patchValue({ code: 'MAY', name: 'Mayorista', description: '' });
      component.submit();

      expect(component.error()).toBe('Duplicado');
      expect(component.saving()).toBe(false);
    });

    it('usa un mensaje genérico si el backend no informa uno', () => {
      service.create.mockReturnValue(throwError(() => ({ error: {} })));

      component.form.patchValue({ code: 'MAY', name: 'Mayorista', description: '' });
      component.submit();

      expect(component.error()).toBe('Error al crear la lista de precios.');
    });

    it('cierra el diálogo con close()', () => {
      component.close();

      expect(dialogRef.close).toHaveBeenCalled();
    });
  });

  describe('modo edición', () => {
    let fixture: ComponentFixture<QuickCreatePriceListDialogComponent>;
    let component: QuickCreatePriceListDialogComponent;

    beforeEach(async () => {
      ({ fixture, component } = await setup({ priceList }));
    });

    it('detecta modo edición y precarga la lista', () => {
      expect(component.isEditMode).toBe(true);
      expect(component.form.controls.code.value).toBe('MAY');
      expect(component.form.controls.name.value).toBe('Mayorista');
      expect(component.form.controls.description.value).toBe('Precio mayorista');
    });

    it('actualiza la lista usando el id existente', () => {
      component.form.patchValue({ code: 'MAY2', name: 'Mayorista 2', description: 'Nueva' });

      component.submit();

      expect(service.update).toHaveBeenCalledWith('pl-1', 'MAY2', 'Mayorista 2', 'Nueva');
      expect(service.create).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(priceList);
    });

    it('usa el mensaje de error de actualización por defecto', () => {
      service.update.mockReturnValue(throwError(() => ({ error: {} })));

      component.form.patchValue({ code: 'MAY2', name: 'Mayorista 2', description: '' });
      component.submit();

      expect(component.error()).toBe('Error al actualizar la lista de precios.');
    });
  });
});
