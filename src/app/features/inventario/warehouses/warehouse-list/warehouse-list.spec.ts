import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WarehouseListComponent } from './warehouse-list';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { WAREHOUSE_TYPE_LABELS } from '../../../../core/models/warehouse.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';

function warehouse(overrides: Partial<Warehouse> = {}): Warehouse {
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

describe('WarehouseListComponent', () => {
  let fixture: ComponentFixture<WarehouseListComponent>;
  let component: WarehouseListComponent;

  const warehousesValue = signal<Warehouse[]>([warehouse()]);
  const service = {
    warehouses: {
      value: warehousesValue,
      isLoading: signal(false),
      error: signal<string | null>(null),
    },
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    warehousesValue.set([warehouse()]);

    await TestBed.configureTestingModule({
      imports: [WarehouseListComponent, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: WarehouseService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('expone las etiquetas de tipo de bodega', () => {
    expect(component.typeLabels).toBe(WAREHOUSE_TYPE_LABELS);
  });

  it('mapea los iconos por tipo de bodega', () => {
    expect(component.warehouseIcons['GENERAL']).toBe('warehouse');
    expect(component.warehouseIcons['CANAL']).toBe('inventory');
    expect(component.warehouseIcons['DECOMISOS']).toBe('delete_sweep');
  });

  it('renderiza las bodegas del servicio', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bodega Central');
    expect(text).toContain('General');
  });

  it('renderiza el chip de inactiva cuando la bodega no está activa', () => {
    warehousesValue.set([warehouse({ active: false })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inactiva');
  });
});
