import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StockSummaryComponent } from './stock-summary';
import { StockService } from '../../../../core/services/stock.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import type { InventoryStock } from '../../../../core/models/stock.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';

function createWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh-1',
    name: 'Bodega Central',
    location: 'Zona A',
    warehouseType: 'GENERAL',
    active: true,
    createdBy: 'test',
    createdAt: '2026-05-14T10:00:00Z',
    updatedBy: null,
    updatedAt: '2026-05-14T10:00:00Z',
    ...overrides,
  };
}

function createStock(overrides: Partial<InventoryStock> = {}): InventoryStock {
  return {
    id: 'stock-1',
    productId: 'prod-1',
    batchId: '12345678-1234-1234-1234-123456789abc',
    warehouseId: 'wh-1',
    currentQuantity: 120,
    committedQuantity: 0,
    availableQuantity: 120,
    unitCost: 4915.25,
    updatedAt: '2026-05-14T10:00:00Z',
    productName: 'Paleta',
    productCode: 'CUT-001',
    batchType: 'PARENT',
    ...overrides,
  };
}

describe('StockSummaryComponent', () => {
  let fixture: ComponentFixture<StockSummaryComponent>;
  let component: StockSummaryComponent;

  const selectedWarehouseId = signal<string | null>(null);
  const stockValue = signal<InventoryStock[]>([]);
  const stockError = signal<string | null>(null);
  const stockLoading = signal(false);
  const warehousesValue = signal<Warehouse[]>([createWarehouse()]);

  const stockService = {
    selectedWarehouseId,
    stockByWarehouse: {
      value: stockValue,
      isLoading: stockLoading,
      error: stockError,
    },
    stockByBatch: vi.fn(),
  };
  const warehouseService = {
    warehouses: { value: warehousesValue },
    listAll: vi.fn(),
    search: vi.fn(),
    reload: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    selectedWarehouseId.set(null);
    stockValue.set([]);
    stockError.set(null);
    stockLoading.set(false);
    warehousesValue.set([createWarehouse()]);

    await TestBed.configureTestingModule({
      imports: [StockSummaryComponent, NoopAnimationsModule],
      providers: [
        { provide: StockService, useValue: stockService },
        { provide: WarehouseService, useValue: warehouseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('define las columnas de la tabla de stock', () => {
    expect(component.displayedColumns).toEqual([
      'productName',
      'batchId',
      'currentQuantity',
      'availableQuantity',
      'unitCost',
    ]);
  });

  it('filtra solo bodegas activas', () => {
    warehousesValue.set([
      createWarehouse({ id: 'wh-1', active: true }),
      createWarehouse({ id: 'wh-2', active: false }),
      createWarehouse({ id: 'wh-3', active: true }),
    ]);
    fixture.detectChanges();

    expect(component.activeWarehouses().map((w) => w.id)).toEqual(['wh-1', 'wh-3']);
  });

  it('traduce los tipos de lote a etiquetas', () => {
    expect(component.getBatchTypeLabel('PARENT')).toBe('Padre');
    expect(component.getBatchTypeLabel('CHILD')).toBe('Hijo');
    expect(component.getBatchTypeLabel('STANDARD')).toBe('Estándar');
    expect(component.getBatchTypeLabel('OTRO')).toBe('OTRO');
    expect(component.getBatchTypeLabel(undefined)).toBe('');
  });

  it('actualiza la bodega seleccionada en el servicio', () => {
    component.onWarehouseChange('wh-9');
    expect(stockService.selectedWarehouseId()).toBe('wh-9');
  });

  it('muestra el estado vacío cuando no hay bodega seleccionada', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Seleccioná una bodega');
  });

  it('renderiza las filas de stock cuando hay bodega y datos', () => {
    selectedWarehouseId.set('wh-1');
    stockValue.set([createStock()]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Paleta');
    expect(text).toContain('CUT-001');
    expect(text).toContain('Padre');
  });
});
