import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { PageEvent } from '@angular/material/paginator';

import { AdjustmentListComponent } from './adjustment-list';
import { AdjustmentService } from '../../../core/services/adjustment.service';
import type { StockAdjustment } from '../../../core/models/adjustment.model';
import type { PageResponse } from '../../../core/models/page.model';

describe('AdjustmentListComponent', () => {
  let fixture: ComponentFixture<AdjustmentListComponent>;
  let component: AdjustmentListComponent;

  const adjustment: StockAdjustment = {
    id: 'adj-1',
    productId: 'prod-1',
    batchId: null,
    warehouseId: 'wh-1',
    adjustmentType: 'DAMAGE',
    quantityBefore: 10,
    quantityAfter: 7,
    unitCost: 1200,
    reason: 'Daño',
    createdBy: null,
    createdAt: '2026-05-14T10:00:00Z',
  };

  const page: PageResponse<StockAdjustment> = {
    content: [adjustment],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
  };

  const adjustmentService = {
    list: vi.fn(),
    create: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    adjustmentService.list.mockReturnValue(of(page));

    await TestBed.configureTestingModule({
      imports: [AdjustmentListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdjustmentService, useValue: adjustmentService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga la primera página al inicializar', () => {
    expect(adjustmentService.list).toHaveBeenCalledWith(0, 20);
    expect(component.data()).toEqual(page);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('define las columnas de la tabla', () => {
    expect(component.displayedColumns).toEqual([
      'createdAt',
      'adjustmentType',
      'productId',
      'warehouseId',
      'quantityBefore',
      'quantityAfter',
      'reason',
    ]);
  });

  it('recarga al cambiar de página y conserva el tamaño', () => {
    adjustmentService.list.mockClear();

    const event = { pageIndex: 2, pageSize: 10 } as PageEvent;
    component.onPageChange(event);

    expect(component.page()).toBe(2);
    expect(component.size()).toBe(10);
    expect(adjustmentService.list).toHaveBeenCalledWith(2, 10);
  });

  it('expone el error cuando falla la carga', () => {
    adjustmentService.list.mockReturnValue(throwError(() => new Error('boom')));

    component.load();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar los ajustes.');
  });

  it('traduce los tipos de ajuste a etiquetas legibles', () => {
    expect(component.typeLabel('PHYSICAL_COUNT')).toBe('Conteo físico');
    expect(component.typeLabel('DAMAGE')).toBe('Daño');
    expect(component.typeLabel('EXPIRATION')).toBe('Vencimiento');
    expect(component.typeLabel('THEFT')).toBe('Hurto');
    expect(component.typeLabel('OTHER')).toBe('Otro');
    expect(component.typeLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('asigna clases de chip según el tipo', () => {
    expect(component.typeClass('PHYSICAL_COUNT')).toBe('chip-physical');
    expect(component.typeClass('DAMAGE')).toBe('chip-damage');
    expect(component.typeClass('EXPIRATION')).toBe('chip-expiration');
    expect(component.typeClass('THEFT')).toBe('chip-theft');
    expect(component.typeClass('OTHER')).toBe('chip-other');
    expect(component.typeClass('UNKNOWN')).toBe('chip-other');
  });
});
