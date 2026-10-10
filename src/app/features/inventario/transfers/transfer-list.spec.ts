import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { PageEvent } from '@angular/material/paginator';

import { TransferListComponent } from './transfer-list';
import { TransferService } from '../../../core/services/transfer.service';
import type { TransferResponse, TransferItemResponse } from '../../../core/models/transfer.model';

function createTransfer(overrides: Partial<TransferResponse> = {}): TransferResponse {
  return {
    id: 'tr-1',
    sourceWarehouseId: 'wh-1',
    targetWarehouseId: 'wh-2',
    status: 'DRAFT',
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-05-14T10:00:00Z',
    confirmedBy: null,
    confirmedAt: null,
    items: [],
    ...overrides,
  };
}

describe('TransferListComponent', () => {
  let fixture: ComponentFixture<TransferListComponent>;
  let component: TransferListComponent;
  let router: Router;

  const item: TransferItemResponse = {
    id: 'it-1',
    productId: 'prod-1',
    batchId: null,
    quantity: 5,
    unitCost: 1200,
  };

  const transfer = createTransfer({ items: [item] });
  const page = {
    content: [transfer],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
  };

  const transferService = {
    list: vi.fn(),
    create: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    getById: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    transferService.list.mockReturnValue(of(page));
    transferService.confirm.mockReturnValue(of(createTransfer({ status: 'CONFIRMED' })));
    transferService.cancel.mockReturnValue(of(createTransfer({ status: 'CANCELLED' })));

    await TestBed.configureTestingModule({
      imports: [TransferListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransferService, useValue: transferService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TransferListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('carga la primera página al inicializar', () => {
    expect(transferService.list).toHaveBeenCalledWith(0, 20);
    expect(component.data()).toEqual(page);
    expect(component.error()).toBeNull();
  });

  it('define las columnas de la tabla', () => {
    expect(component.cols).toEqual([
      'createdAt',
      'status',
      'sourceWarehouseId',
      'targetWarehouseId',
      'items',
      'notes',
      'actions',
    ]);
  });

  it('recarga al cambiar de página', () => {
    transferService.list.mockClear();

    component.onPageChange({ pageIndex: 1, pageSize: 5 } as PageEvent);

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(5);
    expect(transferService.list).toHaveBeenCalledWith(1, 5);
  });

  it('confirma un traslado y recarga la lista', () => {
    transferService.list.mockClear();

    component.confirm('tr-1');

    expect(transferService.confirm).toHaveBeenCalledWith('tr-1');
    expect(transferService.list).toHaveBeenCalledTimes(1);
  });

  it('cancela un traslado y recarga la lista', () => {
    transferService.list.mockClear();

    component.cancel('tr-1');

    expect(transferService.cancel).toHaveBeenCalledWith('tr-1');
    expect(transferService.list).toHaveBeenCalledTimes(1);
  });

  it('muestra alerta cuando falla la confirmación', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    transferService.confirm.mockReturnValue(
      throwError(() => ({ error: { message: 'No se pudo confirmar' } })),
    );

    component.confirm('tr-1');

    expect(alertSpy).toHaveBeenCalledWith('No se pudo confirmar');
    alertSpy.mockRestore();
  });

  it('traduce los estados a etiquetas legibles', () => {
    expect(component.statusLabel('DRAFT')).toBe('Borrador');
    expect(component.statusLabel('CONFIRMED')).toBe('Confirmado');
    expect(component.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(component.statusLabel('OTRO')).toBe('OTRO');
  });

  it('asigna clases de chip según el estado', () => {
    expect(component.statusClass('DRAFT')).toBe('chip-draft');
    expect(component.statusClass('CONFIRMED')).toBe('chip-confirmed');
    expect(component.statusClass('CANCELLED')).toBe('chip-cancelled');
    expect(component.statusClass('OTRO')).toBe('');
  });

  it('cuenta los ítems y maneja listas ausentes', () => {
    expect(component.itemCount([item, item])).toBe('2 ítems');
    expect(component.itemCount([])).toBe('0 ítems');
  });

  it('navega al detalle del traslado', () => {
    component.viewDetail('tr-9');
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/traslados', 'tr-9']);
  });
});
