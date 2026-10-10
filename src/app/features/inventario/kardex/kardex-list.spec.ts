import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { PageEvent } from '@angular/material/paginator';

import { KardexListComponent } from './kardex-list';
import { KardexDetailDialogComponent } from './kardex-detail-dialog';
import { KardexService } from '../../../core/services/kardex.service';
import { ProductService } from '../../../core/services/product.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import type { InventoryMovement } from '../../../core/models/kardex.model';
import type { PageResponse } from '../../../core/models/page.model';

registerLocaleData(localeEsCo);

describe('KardexListComponent', () => {
  let fixture: ComponentFixture<KardexListComponent>;
  let component: KardexListComponent;
  let router: Router;

  const movement: InventoryMovement = {
    id: 'mov-1',
    productId: 'prod-1',
    batchId: null,
    warehouseId: 'wh-1',
    movementType: 'ENTRY',
    quantity: 10,
    unitCost: 1200,
    previousQty: 0,
    newQty: 10,
    referenceType: 'TRANSFER',
    referenceId: 'tr-1',
    notes: null,
    createdBy: null,
    createdAt: '2026-05-14T10:00:00Z',
  };

  const page: PageResponse<InventoryMovement> = {
    content: [movement],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
  };

  const kardexService = { search: vi.fn() };
  const productService = { search: vi.fn() };
  const warehouseService = { search: vi.fn() };

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    kardexService.search.mockReturnValue(of(page));

    await TestBed.configureTestingModule({
      imports: [KardexListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: KardexService, useValue: kardexService },
        { provide: ProductService, useValue: productService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(KardexListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('busca la primera página al inicializar', () => {
    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20 }),
    );
    expect(component.data()).toEqual(page);
    expect(component.loading()).toBe(false);
  });

  it('define las columnas y opciones de tipo de movimiento', () => {
    expect(component.displayedColumns).toContain('movementType');
    expect(component.movementTypeOptions[0]).toEqual({ value: '', label: 'Todos' });
    expect(component.movementTypeOptions).toHaveLength(11);
  });

  it('actualiza filtros al seleccionar producto y reinicia la página', () => {
    component.page.set(3);
    kardexService.search.mockClear();

    component.onProductSelected({ id: 'prod-9', name: 'Lomo', code: 'CUT-9' });

    expect(component.filterProductId()).toBe('prod-9');
    expect(component.filterProductName()).toBe('Lomo');
    expect(component.page()).toBe(0);
    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod-9', page: 0 }),
    );
  });

  it('limpia el filtro de producto', () => {
    component.filterProductId.set('prod-9');
    component.filterProductName.set('Lomo');

    component.onProductCleared();

    expect(component.filterProductId()).toBe('');
    expect(component.filterProductName()).toBe('');
  });

  it('actualiza el filtro de bodega y recarga', () => {
    kardexService.search.mockClear();

    component.onWarehouseSelected('wh-7');

    expect(component.filterWarehouseId()).toBe('wh-7');
    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'wh-7' }),
    );
  });

  it('envía el tipo de movimiento seleccionado a la búsqueda', () => {
    component.filterType.setValue('EXIT');
    kardexService.search.mockClear();

    component.onTypeChange();

    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ movementType: 'EXIT', page: 0 }),
    );
  });

  it('convierte las fechas a ISO en la búsqueda', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');

    component.onDateFromChange(from);
    kardexService.search.mockClear();
    component.onDateToChange(to);

    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ from: from.toISOString(), to: to.toISOString() }),
    );
  });

  it('recarga al cambiar de página', () => {
    kardexService.search.mockClear();

    component.onPageChange({ pageIndex: 2, pageSize: 10 } as PageEvent);

    expect(component.page()).toBe(2);
    expect(component.size()).toBe(10);
    expect(kardexService.search).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, size: 10 }),
    );
  });

  it('expone el error cuando falla la búsqueda', () => {
    kardexService.search.mockReturnValue(throwError(() => new Error('boom')));

    component.loadData();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar el kardex.');
  });

  it('traduce los tipos de movimiento', () => {
    expect(component.typeLabel('ENTRY')).toBe('Entrada');
    expect(component.typeLabel('TRANSFER_IN')).toBe('Traslado +');
    expect(component.typeLabel('PRODUCTION_SHRINKAGE')).toBe('Merma Prod.');
    expect(component.typeLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('asigna clases de chip por tipo de movimiento', () => {
    expect(component.typeClass('ENTRY')).toBe('chip-entry');
    expect(component.typeClass('TRANSFER_OUT')).toBe('chip-transfer');
    expect(component.typeClass('DISPOSAL')).toBe('chip-disposal');
    expect(component.typeClass('UNKNOWN')).toBe('');
  });

  it('abre el diálogo de detalle pasando la fila como data', () => {
    const openSpy = vi.spyOn(MatDialog.prototype, 'open').mockReturnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<unknown>);

    component.openDetail(movement);

    expect(openSpy).toHaveBeenCalledWith(
      KardexDetailDialogComponent,
      expect.objectContaining({ data: movement, width: '560px' }),
    );
  });

  it('navega al documento de origen según el tipo de referencia', () => {
    component.viewSourceDocument(movement);
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/traslados', 'tr-1']);

    component.viewSourceDocument({ ...movement, referenceType: 'ADJUSTMENT' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/ajustes']);

    component.viewSourceDocument({ ...movement, referenceType: 'DISPOSAL' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/decomisos']);
  });

  it('no navega cuando el movimiento no tiene referencia', () => {
    (router.navigate as ReturnType<typeof vi.fn>).mockClear();

    component.viewSourceDocument({ ...movement, referenceId: null });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
