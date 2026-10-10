import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { BatchDetailComponent } from './batch-detail';
import { BatchService } from '../../../../core/services/batch.service';
import type { Batch } from '../../../../core/models/batch.model';

function createBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'batch-1',
    productId: 'prod-1',
    supplierId: 'sup-1',
    warehouseId: 'wh-1',
    entryDate: '2026-05-14',
    initialWeight: 10,
    purchaseCost: 5000,
    status: 'OPEN',
    notes: null,
    expirationDate: null,
    sourceReceiptId: undefined,
    ocId: undefined,
    productName: 'Paleta',
    supplierName: 'Proveedor SA',
    warehouseName: 'Bodega Central',
    parentBatchId: null,
    batchType: 'STANDARD',
    unitOfMeasureId: null,
    unitOfMeasureName: 'Kilogramo',
    createdBy: 'user-1',
    createdAt: '2026-05-14T10:00:00Z',
    updatedBy: null,
    updatedAt: '2026-05-14T10:00:00Z',
    ...overrides,
  };
}

describe('BatchDetailComponent', () => {
  let fixture: ComponentFixture<BatchDetailComponent>;
  let component: BatchDetailComponent;

  const route = { snapshot: { paramMap: convertToParamMap({ id: 'batch-1' }) } };
  const batchService = {
    getById: vi.fn(),
    listChildren: vi.fn(),
    updateStatus: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    route.snapshot.paramMap = convertToParamMap({ id: 'batch-1' });
    batchService.getById.mockReset();
    batchService.listChildren.mockReset();
    batchService.updateStatus.mockReset();
    batchService.getById.mockReturnValue(of(createBatch()));
    batchService.listChildren.mockReturnValue(of([]));
    batchService.updateStatus.mockReturnValue(of(createBatch({ status: 'CLOSED' })));

    await TestBed.configureTestingModule({
      imports: [BatchDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: BatchService, useValue: batchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchDetailComponent);
    component = fixture.componentInstance;
  });

  it('crea el componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('carga el lote usando el id de la ruta', () => {
    fixture.detectChanges();

    expect(batchService.getById).toHaveBeenCalledWith('batch-1');
    expect(component.batch()).toEqual(createBatch());
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('informa error cuando la ruta no trae id', () => {
    route.snapshot.paramMap = convertToParamMap({});

    fixture.detectChanges();

    expect(batchService.getById).not.toHaveBeenCalled();
    expect(component.error()).toBe('ID de lote no proporcionado.');
    expect(component.batch()).toBeNull();
  });

  it('expone el error cuando falla la carga', () => {
    batchService.getById.mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar el lote.');
    expect(fixture.nativeElement.textContent).toContain('Error al cargar el lote.');
  });

  it('renderiza los campos principales del lote', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Paleta');
    expect(text).toContain('Proveedor SA');
    expect(text).toContain('Bodega Central');
    expect(text).toContain('Kilogramo');
  });

  it('muestra "—" en los campos nulos', () => {
    fixture.detectChanges();

    const dashCount = (fixture.nativeElement.textContent.match(/—/g) ?? []).length;
    expect(dashCount).toBeGreaterThanOrEqual(5);
  });

  it('calcula el costo total como peso * costo de compra', () => {
    fixture.detectChanges();

    expect(component.totalCost()).toBe(50000);
  });

  it('muestra la etiqueta legible del estado en un chip', () => {
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('mat-chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('Abierto');
    expect(chip.className).toContain('chip-status-open');
  });

  it('traduce los estados a etiquetas legibles', () => {
    expect(component.getStatusLabel('OPEN')).toBe('Abierto');
    expect(component.getStatusLabel('PROCESSING')).toBe('En proceso');
    expect(component.getStatusLabel('CLOSED')).toBe('Cerrado');
    expect(component.getStatusLabel('OTRO')).toBe('OTRO');
  });

  it('traduce los tipos de lote a etiquetas legibles', () => {
    expect(component.getBatchTypeLabel('PARENT')).toBe('Padre');
    expect(component.getBatchTypeLabel('CHILD')).toBe('Hijo');
    expect(component.getBatchTypeLabel('STANDARD')).toBe('Estándar');
    expect(component.getBatchTypeLabel(undefined)).toBe('—');
  });

  it('no pide hijos cuando el lote no es PARENT', () => {
    fixture.detectChanges();

    expect(batchService.listChildren).not.toHaveBeenCalled();
    expect(component.children()).toEqual([]);
  });

  it('carga los lotes hijos cuando el lote es PARENT', () => {
    batchService.getById.mockReturnValue(of(createBatch({ batchType: 'PARENT' })));
    batchService.listChildren.mockReturnValue(
      of([createBatch({ id: 'child-1', batchType: 'CHILD' })]),
    );

    fixture.detectChanges();

    expect(batchService.listChildren).toHaveBeenCalledWith('batch-1');
    expect(component.children()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Lotes hijos');
  });

  it('no rompe la pantalla si fallan los lotes hijos', () => {
    batchService.getById.mockReturnValue(of(createBatch({ batchType: 'PARENT' })));
    batchService.listChildren.mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.children()).toEqual([]);
    expect(component.batch()?.id).toBe('batch-1');
  });

  it('muestra el botón "Cerrar lote" cuando el lote no está cerrado', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cerrar lote');
  });

  it('cierra el lote y recarga el detalle', () => {
    fixture.detectChanges();

    component.closeBatch();

    expect(batchService.updateStatus).toHaveBeenCalledWith('batch-1', 'CLOSED');
    expect(batchService.getById).toHaveBeenCalledTimes(2);
  });

  it('oculta el botón "Cerrar lote" cuando el lote está cerrado', () => {
    batchService.getById.mockReturnValue(of(createBatch({ status: 'CLOSED' })));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cerrar lote');
  });
});
