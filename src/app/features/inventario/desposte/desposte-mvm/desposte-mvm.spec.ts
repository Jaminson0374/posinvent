import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { DesposteMvmComponent } from './desposte-mvm';
import { DesposteMvmDetailDialogComponent } from './desposte-mvm-detail-dialog';
import { balanceSegments, formatSigned, yieldClass } from './desposte-mvm-format';
import { DesposteService } from '../../../../core/services/desposte.service';
import type { Desposte } from '../../../../core/models/desposte.model';
import type { PageResponse } from '../../../../core/models/page.model';

registerLocaleData(localeEsCo);

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
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-05-14T10:00:00Z',
    cuts: [],
    ...overrides,
  };
}

function createPage(content: Desposte[]): PageResponse<Desposte> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    last: true,
  };
}

describe('desposte-mvm-format', () => {
  describe('balanceSegments', () => {
    it('splits cuts, waste and shrink as percentages of the input weight', () => {
      const segments = balanceSegments({
        inputWeight: 100,
        totalCutsWeight: 80,
        wasteWeight: 12,
        shrinkWeight: 8,
      });

      expect(segments.map((segment) => segment.key)).toEqual(['cuts', 'waste', 'shrink']);
      expect(segments.map((segment) => segment.value)).toEqual([80, 12, 8]);
      expect(segments.map((segment) => segment.pct)).toEqual([80, 12, 8]);
      expect(segments.map((segment) => segment.class)).toEqual(['seg-cuts', 'seg-waste', 'seg-shrink']);
      expect(segments.map((segment) => segment.label)).toEqual([
        'Cortes aprovechables',
        'Desperdicio',
        'Merma técnica',
      ]);
    });

    it('returns 0% when the input weight is zero or invalid', () => {
      const segments = balanceSegments({
        inputWeight: 0,
        totalCutsWeight: 10,
        wasteWeight: 2,
        shrinkWeight: 1,
      });

      expect(segments.every((segment) => segment.pct === 0)).toBe(true);
    });
  });

  describe('yieldClass', () => {
    it('maps yield percentages to css classes', () => {
      expect(yieldClass(95)).toBe('yield-good');
      expect(yieldClass(90)).toBe('yield-good');
      expect(yieldClass(80)).toBe('yield-warn');
      expect(yieldClass(60)).toBe('yield-bad');
    });
  });

  describe('formatSigned', () => {
    it('prefixes positive values and keeps negatives', () => {
      expect(formatSigned(1.5)).toBe('+1.50');
      expect(formatSigned(-2.25)).toBe('-2.25');
      expect(formatSigned(0)).toBe('0.00');
    });
  });
});

describe('DesposteMvmComponent', () => {
  let fixture: ComponentFixture<DesposteMvmComponent>;
  let component: DesposteMvmComponent;

  const service = { processManual: vi.fn(), list: vi.fn(), getById: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    service.list.mockReset();
    service.list.mockReturnValue(
      of(
        createPage([
          createDesposte({ id: 'des-1', yieldPercentage: 80, withinTolerance: true }),
          createDesposte({
            id: 'des-2',
            sourceBatchId: 'ffff9999-8888-7777-6666-555544443333',
            yieldPercentage: 70,
            withinTolerance: false,
          }),
        ]),
      ),
    );

    await TestBed.configureTestingModule({
      imports: [DesposteMvmComponent, NoopAnimationsModule, MatDialogModule],
      providers: [{ provide: DesposteService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(DesposteMvmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga el listado con la página inicial', () => {
    expect(service.list).toHaveBeenCalledWith(undefined, undefined, 0, 20);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.rows()).toHaveLength(2);
  });

  it('renderiza las filas con lote corto, rendimiento y valor comercial', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('aaaa1111');
    expect(text).toContain('80');
    expect(text).toContain('Balance de masa');
  });

  it('muestra la leyenda de colores', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Cortes aprovechables');
    expect(text).toContain('Desperdicio');
    expect(text).toContain('Merma técnica');
  });

  it('calcula el resumen: despostes, rendimiento promedio y % fuera de tolerancia', () => {
    expect(component.totalElements()).toBe(2);
    expect(component.avgYield()).toBe(75);
    expect(component.outOfTolerancePct()).toBe(50);
    expect(component.outOfToleranceCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('2 despostes');
  });

  it('dibuja una barra de balance con tres segmentos', () => {
    const segments = fixture.nativeElement.querySelectorAll('.balance-seg');
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  it('muestra el estado vacío cuando no hay despostes', () => {
    service.list.mockReturnValue(of(createPage([])));

    component.load();
    fixture.detectChanges();

    expect(component.totalElements()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No hay despostes');
  });

  it('expone el error cuando falla la carga', () => {
    service.list.mockReturnValue(throwError(() => new Error('boom')));

    component.load();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar los despostes.');
    expect(fixture.nativeElement.textContent).toContain('Error al cargar los despostes.');
  });

  it('aplica filtros de fecha y reinicia la página', () => {
    service.list.mockClear();

    component.onFromChange('2026-01-01');
    component.onToChange('2026-02-01');
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 60 } as never);
    component.applyFilters();

    expect(component.page()).toBe(0);
    expect(service.list).toHaveBeenLastCalledWith('2026-01-01', '2026-02-01', 0, 20);
  });

  it('limpia los filtros', () => {
    service.list.mockClear();

    component.onFromChange('2026-01-01');
    component.onToChange('2026-02-01');
    component.clearFilters();

    expect(component.from()).toBe('');
    expect(component.to()).toBe('');
    expect(service.list).toHaveBeenLastCalledWith(undefined, undefined, 0, 20);
  });

  it('cambia de página y recarga', () => {
    service.list.mockClear();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 30 } as never);

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(10);
    expect(service.list).toHaveBeenLastCalledWith(undefined, undefined, 1, 10);
  });

  it('abre el diálogo de detalle con la fila al hacer click', () => {
    const openSpy = vi
      .spyOn(MatDialog.prototype, 'open')
      .mockReturnValue({ afterClosed: () => of(undefined) } as never);

    component.openDetail(component.rows()[0]);

    expect(openSpy).toHaveBeenCalledWith(DesposteMvmDetailDialogComponent, {
      data: { id: 'des-1' },
      width: '760px',
    });
  });
});
