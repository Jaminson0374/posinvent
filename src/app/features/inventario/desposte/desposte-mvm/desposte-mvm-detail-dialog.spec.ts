import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import { DesposteMvmDetailDialogComponent } from './desposte-mvm-detail-dialog';
import { DesposteService } from '../../../../core/services/desposte.service';
import type { Desposte, DesposteCut } from '../../../../core/models/desposte.model';

registerLocaleData(localeEsCo);

function createCut(overrides: Partial<DesposteCut> = {}): DesposteCut {
  return {
    id: 'cut-1',
    productId: 'prod-cut-1',
    warehouseId: 'wh-1',
    childBatchId: 'child-1',
    weight: 40,
    suggestedSalePrice: 12000,
    commercialValue: 480000,
    allocatedCost: 250000,
    unitCost: 6250,
    expirationDate: '2026-06-01',
    ...overrides,
  };
}

function createDesposte(overrides: Partial<Desposte> = {}): Desposte {
  return {
    id: 'des-1',
    sourceBatchId: 'aaaa1111-bbbb-2222-cccc-333344445555',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    inputWeight: 100,
    totalCutsWeight: 80,
    wasteWeight: 12,
    shrinkWeight: 8,
    deviation: 0,
    tolerance: 2,
    withinTolerance: true,
    yieldPercentage: 80,
    totalCommercialValue: 500000,
    totalAllocatedCost: 300000,
    notes: 'Desposte de prueba',
    createdBy: 'user-1',
    createdAt: '2026-05-14T10:00:00Z',
    cuts: [createCut()],
    ...overrides,
  };
}

describe('DesposteMvmDetailDialogComponent', () => {
  let fixture: ComponentFixture<DesposteMvmDetailDialogComponent>;
  let component: DesposteMvmDetailDialogComponent;

  const service = { processManual: vi.fn(), list: vi.fn(), getById: vi.fn() };
  const dialogRef = { close: vi.fn() };

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DesposteMvmDetailDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { id: 'des-1' } },
        { provide: DesposteService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesposteMvmDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    service.getById.mockReset();
    service.getById.mockReturnValue(of(createDesposte()));
    dialogRef.close.mockReset();
  });

  it('carga el desposte por id al inicializar', async () => {
    await setup();

    expect(service.getById).toHaveBeenCalledWith('des-1');
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.desposte()?.id).toBe('des-1');
  });

  it('renderiza rendimiento, balance, totales y notas', async () => {
    await setup();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Detalle MVM');
    expect(text).toContain('80');
    expect(text).toContain('Desposte de prueba');
    expect(text).toContain('Costo asignado');
    expect(text).toContain('Cerrar');
  });

  it('muestra la tabla de cortes con sus columnas', async () => {
    await setup();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('prod-cut-1');
    expect(text).toContain('Vencimiento');
    expect(component.cutColumns).toContain('suggestedSalePrice');
    expect(component.cutColumns).toContain('unitCost');
  });

  it('calcula la suma de salidas de masa', async () => {
    await setup();

    expect(component.totalOut()).toBe(100);
  });

  it('expone los segmentos de balance con sus clases', async () => {
    await setup();
    const segments = component.segments();

    expect(segments.map((segment) => segment.class)).toEqual([
      'seg-cuts',
      'seg-waste',
      'seg-shrink',
    ]);
    expect(segments.map((segment) => segment.pct)).toEqual([80, 12, 8]);
  });

  it('muestra el spinner mientras carga', async () => {
    const subject = new Subject<Desposte>();
    service.getById.mockReturnValue(subject.asObservable());

    await setup();

    expect(component.loading()).toBe(true);

    subject.next(createDesposte());
    subject.complete();

    expect(component.loading()).toBe(false);
    expect(component.desposte()).not.toBeNull();
  });

  it('muestra el error cuando falla la carga del detalle', async () => {
    service.getById.mockReturnValue(throwError(() => new Error('boom')));

    await setup();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar el detalle del desposte.');
    expect(fixture.nativeElement.textContent).toContain('Error al cargar el detalle del desposte.');
  });
});
