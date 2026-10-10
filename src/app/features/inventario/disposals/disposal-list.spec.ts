import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { PageEvent } from '@angular/material/paginator';

import { DisposalListComponent } from './disposal-list';
import { DisposalService } from '../../../core/services/disposal.service';
import type { DisposalResponse } from '../../../core/models/disposal.model';
import type { PageResponse } from '../../../core/models/page.model';

registerLocaleData(localeEsCo);

describe('DisposalListComponent', () => {
  let fixture: ComponentFixture<DisposalListComponent>;
  let component: DisposalListComponent;

  const disposal: DisposalResponse = {
    id: 'disp-1',
    productId: 'prod-1',
    batchId: null,
    warehouseId: 'wh-1',
    disposalType: 'DECOMISO_SANITARIO',
    quantity: 2,
    unitCost: 1500,
    reason: 'Sanitario',
    officialDocument: null,
    disposalDate: null,
    journalEntryId: null,
    registeredBy: null,
    createdAt: '2026-05-14T10:00:00Z',
  };

  const page: PageResponse<DisposalResponse> = {
    content: [disposal],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
  };

  const disposalService = { list: vi.fn(), create: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    disposalService.list.mockReturnValue(of(page));

    await TestBed.configureTestingModule({
      imports: [DisposalListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DisposalService, useValue: disposalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisposalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga la primera página al inicializar', () => {
    expect(disposalService.list).toHaveBeenCalledWith(0, 20);
    expect(component.data()).toEqual(page);
    expect(component.error()).toBeNull();
  });

  it('define las columnas de la tabla', () => {
    expect(component.cols).toEqual([
      'createdAt',
      'disposalType',
      'productId',
      'warehouseId',
      'quantity',
      'unitCost',
      'reason',
    ]);
  });

  it('recarga al cambiar de página', () => {
    disposalService.list.mockClear();

    component.onPageChange({ pageIndex: 1, pageSize: 5 } as PageEvent);

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(5);
    expect(disposalService.list).toHaveBeenCalledWith(1, 5);
  });

  it('expone el error cuando falla la carga', () => {
    disposalService.list.mockReturnValue(throwError(() => new Error('boom')));

    component.load();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar decomisos.');
  });

  it('traduce los tipos de decomiso a etiquetas legibles', () => {
    expect(component.typeLabel('DECOMISO_SANITARIO')).toBe('Decomiso sanitario');
    expect(component.typeLabel('RESIDUO_VENDIBLE')).toBe('Residuo vendible');
    expect(component.typeLabel('MERMA_PROCESO')).toBe('Merma proceso');
    expect(component.typeLabel('OTRO')).toBe('OTRO');
  });

  it('asigna clases de chip según el tipo', () => {
    expect(component.typeClass('DECOMISO_SANITARIO')).toBe('chip-sanitario');
    expect(component.typeClass('RESIDUO_VENDIBLE')).toBe('chip-residuo');
    expect(component.typeClass('MERMA_PROCESO')).toBe('chip-merma');
    expect(component.typeClass('OTRO')).toBe('');
  });
});
