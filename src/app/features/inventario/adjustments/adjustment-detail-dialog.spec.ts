import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdjustmentDetailDialogComponent } from './adjustment-detail-dialog';
import type { StockAdjustment } from '../../../core/models/adjustment.model';

registerLocaleData(localeEsCo);

const adjustment: StockAdjustment = {
  id: 'adj-1',
  productId: 'prod-1',
  batchId: null,
  warehouseId: 'wh-1',
  adjustmentType: 'DAMAGE',
  quantityBefore: 10,
  quantityAfter: 7,
  unitCost: 1200,
  reason: 'Daño en bodega',
  createdBy: null,
  createdAt: '2026-05-14T10:00:00Z',
};

describe('AdjustmentDetailDialogComponent', () => {
  let fixture: ComponentFixture<AdjustmentDetailDialogComponent>;
  let component: AdjustmentDetailDialogComponent;
  const dialogRef = { close: vi.fn() };

  async function setup(data: StockAdjustment): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AdjustmentDetailDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustmentDetailDialogComponent);
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
    await setup(adjustment);

    expect(component).toBeTruthy();
    expect(component.data).toEqual(adjustment);
  });

  it('renderiza los campos del ajuste', async () => {
    await setup(adjustment);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Detalle del ajuste');
    expect(text).toContain('Daño');
    expect(text).toContain('prod-1');
    expect(text).toContain('wh-1');
    expect(text).toContain('Cantidad antes');
    expect(text).toContain('Cantidad después');
    expect(text).toContain('Diferencia');
    expect(text).toContain('Costo unitario');
    expect(text).toContain('Costo total');
    expect(text).toContain('Creado por');
    expect(text).toContain('Cerrar');
  });

  it('muestra "—" en los campos nulos', async () => {
    await setup({ ...adjustment, batchId: null, createdBy: null });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('—');
    expect(component.data.batchId).toBeNull();
    expect(component.data.createdBy).toBeNull();
  });

  it('muestra la diferencia con signo negativo y color rojo', async () => {
    await setup({ ...adjustment, quantityBefore: 10, quantityAfter: 7 });

    expect(component.difference()).toBe(-3);
    expect(component.differenceText()).toBe('-3');
    expect(component.differenceClass()).toBe('add-diff-neg');
    expect(fixture.nativeElement.textContent).toContain('-3');
  });

  it('muestra la diferencia con signo positivo y color verde', async () => {
    await setup({ ...adjustment, quantityBefore: 10, quantityAfter: 13 });

    expect(component.difference()).toBe(3);
    expect(component.differenceText()).toBe('+3');
    expect(component.differenceClass()).toBe('add-diff-pos');
    expect(fixture.nativeElement.textContent).toContain('+3');
  });

  it('calcula el costo total sobre el valor absoluto de la diferencia', async () => {
    await setup({ ...adjustment, quantityBefore: 10, quantityAfter: 7, unitCost: 1200 });

    expect(component.totalCost()).toBe(3600);
  });

  it('muestra el chip con la clase del tipo', async () => {
    await setup(adjustment);
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;

    expect(component.typeClass('DAMAGE')).toBe('chip-damage');
    expect(chip.classList).toContain('chip-damage');
  });
});
