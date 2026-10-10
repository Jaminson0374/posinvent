import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProductionListComponent } from './production-list';
import type { ProductionBatch } from '../../../core/models/product-formula.model';

registerLocaleData(localeEsCo);

const batch: ProductionBatch = {
  id: 'batch-1',
  formulaId: 'f-1',
  quantityProduced: 5,
  expectedQuantity: 5,
  directMaterialCost: 1000,
  directLaborCost: 200,
  overheadCost: 0,
  totalCost: 1200,
  unitCost: 240,
  shrinkageQuantity: 0,
  shrinkageCost: 0,
  notes: null,
  createdBy: null,
  createdAt: '2026-05-14T10:00:00Z',
};

describe('ProductionListComponent', () => {
  let fixture: ComponentFixture<ProductionListComponent>;
  let component: ProductionListComponent;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionListComponent, NoopAnimationsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('define las columnas de la tabla', () => {
    expect(component.displayedColumns).toEqual([
      'createdAt',
      'formulaId',
      'quantityProduced',
      'totalCost',
      'unitCost',
      'actions',
    ]);
  });

  it('inicializa sin lotes y sin cargar', () => {
    expect(component.batches()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay órdenes de producción registradas.',
    );
  });

  it('renderiza los lotes cargados', () => {
    component.batches.set([batch]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('f-1');
    expect(fixture.nativeElement.textContent).toContain('5');
  });
});
