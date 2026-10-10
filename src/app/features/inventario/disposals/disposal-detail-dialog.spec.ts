import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DisposalDetailDialogComponent } from './disposal-detail-dialog';
import type { DisposalResponse } from '../../../core/models/disposal.model';

registerLocaleData(localeEsCo);

const disposal: DisposalResponse = {
  id: 'disp-1',
  productId: 'prod-1',
  batchId: null,
  warehouseId: 'wh-1',
  disposalType: 'DECOMISO_SANITARIO',
  quantity: 2,
  unitCost: 1500,
  reason: 'Producto vencido',
  officialDocument: null,
  disposalDate: null,
  journalEntryId: null,
  registeredBy: null,
  createdAt: '2026-05-14T10:00:00Z',
};

describe('DisposalDetailDialogComponent', () => {
  let fixture: ComponentFixture<DisposalDetailDialogComponent>;
  let component: DisposalDetailDialogComponent;
  const dialogRef = { close: vi.fn() };

  async function setup(data: DisposalResponse): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DisposalDetailDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisposalDetailDialogComponent);
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
    await setup(disposal);

    expect(component).toBeTruthy();
    expect(component.data).toEqual(disposal);
  });

  it('renderiza los campos del decomiso', async () => {
    await setup(disposal);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Detalle del decomiso');
    expect(text).toContain('Decomiso sanitario');
    expect(text).toContain('prod-1');
    expect(text).toContain('wh-1');
    expect(text).toContain('Cantidad');
    expect(text).toContain('Costo unitario');
    expect(text).toContain('Costo total');
    expect(text).toContain('Motivo');
    expect(text).toContain('Documento oficial');
    expect(text).toContain('Fecha decomiso');
    expect(text).toContain('Asiento contable');
    expect(text).toContain('Registrado por');
    expect(text).toContain('Cerrar');
  });

  it('muestra "—" en los campos nulos', async () => {
    await setup(disposal);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('—');
    expect(component.data.batchId).toBeNull();
    expect(component.data.officialDocument).toBeNull();
    expect(component.data.disposalDate).toBeNull();
    expect(component.data.journalEntryId).toBeNull();
    expect(component.data.registeredBy).toBeNull();
  });

  it('muestra los valores no nulos cuando existen', async () => {
    await setup({
      ...disposal,
      batchId: 'lot-1',
      officialDocument: 'DOC-9',
      disposalDate: '2026-05-20T00:00:00Z',
      journalEntryId: 'je-1',
      registeredBy: 'user-1',
    });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('lot-1');
    expect(text).toContain('DOC-9');
    expect(text).toContain('je-1');
    expect(text).toContain('user-1');
  });

  it('calcula el costo total como cantidad por costo unitario', async () => {
    await setup({ ...disposal, quantity: 2, unitCost: 1500 });

    expect(component.totalCost()).toBe(3000);
  });

  it('muestra el chip con la clase del tipo', async () => {
    await setup(disposal);
    const chip = fixture.nativeElement.querySelector('.chip') as HTMLElement;

    expect(component.typeClass('DECOMISO_SANITARIO')).toBe('chip-sanitario');
    expect(chip.classList).toContain('chip-sanitario');
  });
});
