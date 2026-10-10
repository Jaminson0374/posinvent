import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KardexDetailDialogComponent } from './kardex-detail-dialog';
import type { InventoryMovement } from '../../../core/models/kardex.model';

registerLocaleData(localeEsCo);

const movement: InventoryMovement = {
  id: 'mov-1',
  productId: 'prod-1',
  batchId: null,
  warehouseId: 'wh-1',
  movementType: 'ENTRY',
  quantity: 3,
  unitCost: 1200,
  previousQty: 0,
  newQty: 3,
  referenceType: 'TRANSFER',
  referenceId: 'tr-1',
  notes: null,
  createdBy: null,
  createdAt: '2026-05-14T10:00:00Z',
};

describe('KardexDetailDialogComponent', () => {
  let fixture: ComponentFixture<KardexDetailDialogComponent>;
  let component: KardexDetailDialogComponent;
  let router: Router;
  const dialogRef = { close: vi.fn() };

  async function setup(data: InventoryMovement): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [KardexDetailDialogComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(KardexDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    dialogRef.close.mockReset();
  });

  beforeEach(() => {
    dialogRef.close.mockReset();
  });

  it('crea el componente y expone la data recibida', async () => {
    await setup(movement);

    expect(component).toBeTruthy();
    expect(component.data).toEqual(movement);
  });

  it('renderiza los campos del movimiento', async () => {
    await setup(movement);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Entrada');
    expect(text).toContain('prod-1');
    expect(text).toContain('wh-1');
    expect(text).toContain('TRANSFER / tr-1');
    expect(text).toContain('Costo unitario');
    expect(text).toContain('Costo total');
    expect(text).toContain('Creado por');
  });

  it('muestra "—" en los campos nulos', async () => {
    await setup({ ...movement, referenceType: null, referenceId: null });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('—');
    expect(component.referenceText()).toBe('—');
    expect(component.data.batchId).toBeNull();
    expect(component.data.notes).toBeNull();
    expect(component.data.createdBy).toBeNull();
  });

  it('calcula el costo total como cantidad por costo unitario', async () => {
    await setup({ ...movement, quantity: 3, unitCost: 1200 });

    expect(component.totalCost()).toBe(3600);
  });

  it('muestra "Ver documento origen" cuando la referencia es navegable', async () => {
    await setup(movement);

    expect(component.canViewSource()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ver documento origen');
  });

  it('oculta "Ver documento origen" para referencias no navegables', async () => {
    await setup({ ...movement, referenceType: 'ENTRY', referenceId: null });

    expect(component.canViewSource()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Ver documento origen');
  });

  it('cierra el diálogo y navega al traslado de origen', async () => {
    await setup(movement);

    component.viewSource();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/traslados', 'tr-1']);
  });

  it('navega a ajustes cuando la referencia es un ajuste', async () => {
    await setup({ ...movement, referenceType: 'ADJUSTMENT' });

    component.viewSource();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/ajustes']);
  });

  it('navega a decomisos cuando la referencia es un decomiso', async () => {
    await setup({ ...movement, referenceType: 'DISPOSAL' });

    component.viewSource();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/decomisos']);
  });

  it('no navega cuando no hay referencia', async () => {
    await setup({ ...movement, referenceType: 'TRANSFER', referenceId: null });

    expect(component.canViewSource()).toBe(false);

    component.viewSource();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
