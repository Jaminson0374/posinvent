import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { ExpiringBatchesComponent } from './expiring-batches';
import { daysUntil, toDate, urgencyClass, urgencyLabel, urgencyLevel } from './expiring-format';
import { DisposalService } from '../../../core/services/disposal.service';
import type { ExpiringBatch } from '../../../core/models/disposal.model';

function createBatch(overrides: Partial<ExpiringBatch> = {}): ExpiringBatch {
  return {
    batch_id: 'batch-1',
    product_id: 'prod-1',
    product_name: 'Paleta de cerdo',
    warehouse_id: 'wh-1',
    warehouse_name: 'Bodega Central',
    expiration_date: '2026-01-31',
    current_qty: 12,
    ...overrides,
  };
}

describe('expiring-format', () => {
  describe('toDate', () => {
    it('parses an ISO date-only string as a local calendar date', () => {
      const date = toDate('2026-01-31');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(31);
    });

    it('parses epoch milliseconds', () => {
      expect(toDate(0)?.getTime()).toBe(0);
      const epoch = Date.UTC(2026, 0, 31);
      expect(toDate(epoch)?.getTime()).toBe(epoch);
    });

    it('parses a [y, m, d] calendar array', () => {
      const date = toDate([2026, 1, 31]);
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(31);
    });

    it('returns null for values that are not dates', () => {
      expect(toDate(null)).toBeNull();
      expect(toDate(undefined)).toBeNull();
      expect(toDate('')).toBeNull();
      expect(toDate('not-a-date')).toBeNull();
      expect(toDate({})).toBeNull();
      expect(toDate([2026, 1])).toBeNull();
      expect(toDate(Number.NaN)).toBeNull();
    });
  });

  describe('daysUntil', () => {
    it('returns positive whole days for future dates', () => {
      expect(daysUntil(new Date(2026, 0, 31), new Date(2026, 0, 1))).toBe(30);
    });

    it('returns negative days for past dates', () => {
      expect(daysUntil(new Date(2026, 0, 25), new Date(2026, 0, 31))).toBe(-6);
    });
  });

  describe('urgency', () => {
    it('classifies by remaining days', () => {
      expect(urgencyLevel(-1)).toBe('EXPIRED');
      expect(urgencyLevel(0)).toBe('CRITICAL');
      expect(urgencyLevel(7)).toBe('CRITICAL');
      expect(urgencyLevel(8)).toBe('HIGH');
      expect(urgencyLevel(15)).toBe('HIGH');
      expect(urgencyLevel(16)).toBe('UPCOMING');
      expect(urgencyLevel(30)).toBe('UPCOMING');
      expect(urgencyLevel(31)).toBe('NORMAL');
    });

    it('maps levels to labels', () => {
      expect(urgencyLabel('EXPIRED')).toBe('Vencido');
      expect(urgencyLabel('CRITICAL')).toBe('Crítico');
      expect(urgencyLabel('HIGH')).toBe('Alto');
      expect(urgencyLabel('UPCOMING')).toBe('Próximo');
      expect(urgencyLabel('NORMAL')).toBe('Normal');
    });

    it('maps levels to css classes', () => {
      expect(urgencyClass('EXPIRED')).toBe('urgency-expired');
      expect(urgencyClass('CRITICAL')).toBe('urgency-critical');
      expect(urgencyClass('HIGH')).toBe('urgency-high');
      expect(urgencyClass('UPCOMING')).toBe('urgency-upcoming');
      expect(urgencyClass('NORMAL')).toBe('urgency-normal');
    });
  });
});

describe('ExpiringBatchesComponent', () => {
  let fixture: ComponentFixture<ExpiringBatchesComponent>;
  let component: ExpiringBatchesComponent;
  let router: Router;

  const MS_PER_DAY = 86_400_000;
  const service = { list: vi.fn(), create: vi.fn(), expiringSoon: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    service.expiringSoon.mockReset();
    service.expiringSoon.mockReturnValue(
      of([
        createBatch({ batch_id: 'batch-1', expiration_date: '2026-01-31' }),
        createBatch({
          batch_id: 'batch-2',
          product_name: 'Chorizo',
          expiration_date: '2026-02-10',
        }),
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [ExpiringBatchesComponent, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: DisposalService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpiringBatchesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga los lotes con los días por defecto (30)', () => {
    expect(service.expiringSoon).toHaveBeenCalledWith(30);
    expect(component.days()).toBe(30);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.rows()).toHaveLength(2);
  });

  it('renderiza las filas con producto, bodega y lote', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Paleta de cerdo');
    expect(text).toContain('Bodega Central');
    expect(text).toContain('batch-1');
  });

  it('ordena las filas por vencimiento ascendente', () => {
    service.expiringSoon.mockReturnValue(
      of([
        createBatch({ batch_id: 'later', expiration_date: '2026-12-01' }),
        createBatch({ batch_id: 'sooner', expiration_date: '2026-11-01' }),
      ]),
    );

    component.load();

    expect(component.rows().map((row) => row.batch.batch_id)).toEqual(['sooner', 'later']);
  });

  it('clasifica urgencias y cuenta vencidos y ≤7 días', () => {
    const now = Date.now();
    service.expiringSoon.mockReturnValue(
      of([
        createBatch({ batch_id: 'expired', expiration_date: now - 3 * MS_PER_DAY }),
        createBatch({ batch_id: 'critical', expiration_date: now + 2 * MS_PER_DAY }),
        createBatch({ batch_id: 'upcoming', expiration_date: now + 20 * MS_PER_DAY }),
        createBatch({ batch_id: 'normal', expiration_date: now + 60 * MS_PER_DAY }),
      ]),
    );

    component.load();

    expect(component.rows().map((row) => row.urgency)).toEqual([
      'EXPIRED',
      'CRITICAL',
      'UPCOMING',
      'NORMAL',
    ]);
    expect(component.expiredCount()).toBe(1);
    expect(component.criticalCount()).toBe(1);
  });

  it('muestra el estado vacío cuando no hay lotes', () => {
    service.expiringSoon.mockReturnValue(of([]));

    component.load();
    fixture.detectChanges();

    expect(component.total()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay lotes por vencer en los próximos 30 días.',
    );
  });

  it('expone el error cuando falla la carga', () => {
    service.expiringSoon.mockReturnValue(throwError(() => new Error('boom')));

    component.load();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar los vencimientos.');
    expect(fixture.nativeElement.textContent).toContain('Error al cargar los vencimientos.');
  });

  it('recarga con el valor correcto al cambiar los días', () => {
    service.expiringSoon.mockClear();

    component.onDaysChange(7);

    expect(component.days()).toBe(7);
    expect(service.expiringSoon).toHaveBeenCalledWith(7);
  });

  it('navega al detalle del lote al hacer click en una fila', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToBatch(component.rows()[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/inventario/lotes', 'batch-1']);
  });

  it('formatea los días restantes con signo', () => {
    expect(component.formatDays(5)).toBe('+5');
    expect(component.formatDays(0)).toBe('0');
    expect(component.formatDays(-4)).toBe('-4');
    expect(component.formatDays(null)).toBe('—');
  });
});
