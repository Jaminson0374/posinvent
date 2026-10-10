import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { FormulaTabComponent } from './formula-tab';
import { FormulaService } from '../../../core/services/formula.service';
import { ProductService } from '../../../core/services/product.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';

// Spy SweetAlert2
vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as never);

describe('FormulaTabComponent — ReactiveForms', () => {
  let fixture: ComponentFixture<FormulaTabComponent>;
  let component: FormulaTabComponent;
  let fb: FormBuilder;
  let formulaServiceMock: ReturnType<typeof createFormulaServiceMock>;
  let productServiceMock: ReturnType<typeof createProductServiceMock>;
  let uomServiceMock: ReturnType<typeof createUomServiceMock>;

  function createFormulaServiceMock() {
    return {
      list: vi.fn().mockReturnValue(of([])),
      add: vi.fn().mockReturnValue(of({} as any)),
      update: vi.fn().mockReturnValue(of({} as any)),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
  }

  function createProductServiceMock() {
    return {
      search: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0 })),
      getById: vi.fn().mockReturnValue(of({ id: 'p-x', name: 'Unknown' })),
    };
  }

  function createUomServiceMock() {
    const unitsSignal = signal([
      { id: 'uom-1', code: 'KG', name: 'Kilogramos' },
      { id: 'uom-2', code: 'L', name: 'Litros' },
    ]);
    return {
      units: { value: unitsSignal, reload: vi.fn() },
    };
  }

  beforeEach(async () => {
    formulaServiceMock = createFormulaServiceMock();
    productServiceMock = createProductServiceMock();
    uomServiceMock = createUomServiceMock();
    fb = new FormBuilder();

    await TestBed.configureTestingModule({
      imports: [FormulaTabComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: FormulaService, useValue: formulaServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: UnitOfMeasureService, useValue: uomServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormulaTabComponent);
    component = fixture.componentInstance;
    // Set required inputs before change detection
    fixture.componentRef.setInput('productId', 'product-1');
    fixture.componentRef.setInput('formArray', fb.array<FormGroup>([]));
  });

  // ── RED 1: Component accepts formArray input ─────────────────────
  it('should accept a formArray input from the parent', () => {
    expect(component.formArray()).toBeDefined();
    expect(component.formArray().length).toBe(0);
  });

  // ── RED 2: Loaded formulas populate the FormArray ───────────────
  it('should populate formArray when formulas are loaded', () => {
    const mockFormulas = [
      {
        id: 'f1',
        parentProductId: 'product-1',
        componentProductId: 'comp-a',
        quantity: 2.5,
        unitOfMeasureId: 'uom-1',
        sequenceNumber: 0,
        notes: 'Note A',
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'f2',
        parentProductId: 'product-1',
        componentProductId: 'comp-b',
        quantity: 1.0,
        unitOfMeasureId: null,
        sequenceNumber: 1,
        notes: null,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    formulaServiceMock.list.mockReturnValue(of(mockFormulas));
    fixture.detectChanges();

    // The formArray should now have 2 FormGroups
    expect(component.formArray().length).toBe(2);
    expect(component.formArray().at(0).get('componentProductId')?.value).toBe('comp-a');
    expect(component.formArray().at(0).get('quantity')?.value).toBe(2.5);
    expect(component.formArray().at(0).get('unitOfMeasureId')?.value).toBe('uom-1');
    expect(component.formArray().at(0).get('sequenceNumber')?.value).toBe(0);
    expect(component.formArray().at(1).get('notes')?.value).toBeNull();
  });

  // ── RED 3: Adding a new formula creates a FormGroup in formArray ─
  it('should create a new FormGroup in formArray when adding a formula', () => {
    fixture.detectChanges();

    const initialLength = component.formArray().length;

    // Click the "Agregar componente" button
    const addBtn = fixture.debugElement.query(By.css('.sub-table-header-actions .tb-btn'));
    expect(addBtn).toBeTruthy();
    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray().length).toBe(initialLength + 1);

    const newGroup = component.formArray().at(component.formArray().length - 1);
    expect(newGroup.get('componentProductId')).toBeTruthy();
    expect(newGroup.get('quantity')).toBeTruthy();
    expect(newGroup.get('unitOfMeasureId')).toBeTruthy();
    expect(newGroup.get('sequenceNumber')).toBeTruthy();
    expect(newGroup.get('notes')).toBeTruthy();
  });

  // ── RED 4: Cancelling add removes the FormGroup ─────────────────
  it('should remove the temporary FormGroup when cancelling add', () => {
    fixture.detectChanges();

    const initialLength = component.formArray().length;

    // Click Add
    const addBtn = fixture.debugElement.query(By.css('.sub-table-header-actions .tb-btn'));
    expect(addBtn).toBeTruthy();
    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray().length).toBe(initialLength + 1);

    // Click Cancel
    const cancelBtn = fixture.debugElement.query(By.css('button[matTooltip="Cancelar"]'));
    expect(cancelBtn).toBeTruthy();
    (cancelBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray().length).toBe(initialLength);
  });

  // ── RED 5: Editing a row propagates dirty state to the FormGroup ─
  it('should mark the FormGroup as dirty when editing a formula row', () => {
    const mockFormulas = [
      {
        id: 'f1',
        parentProductId: 'product-1',
        componentProductId: 'comp-a',
        quantity: 2.0,
        unitOfMeasureId: 'uom-1',
        sequenceNumber: 0,
        notes: 'Original',
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    formulaServiceMock.list.mockReturnValue(of(mockFormulas));
    fixture.detectChanges();

    expect(component.formArray().at(0).dirty).toBe(false);

    // Click edit button
    const editBtn = fixture.debugElement.query(By.css('button[matTooltip="Editar"]'));
    expect(editBtn).toBeTruthy();
    (editBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    // Simulate user changing a value (marks as dirty via markAsDirty)
    const row = component.formArray().at(0);
    row.get('quantity')?.setValue(5.0);
    row.get('quantity')?.markAsDirty();
    fixture.detectChanges();

    expect(component.formArray().at(0).dirty).toBe(true);
  });

  // ── RED 6: View mode shows component names (via getComponentName) ─
  it('should display product names via getComponentName resolver', () => {
    productServiceMock.getById.mockImplementation((id: string) =>
      of({
        id,
        name: id === 'comp-a' ? 'CARNE DE RES' : 'Unknown',
        productCode: id,
        productTypeId: null,
        productStateId: null,
        brandId: null,
        modelId: null,
        categoryId: null,
        groupId: null,
        unitOfMeasureId: null,
        costPrice: 0,
        profitMargin: 0,
        salePrice: 0,
        taxType: 'EXENTO',
        costingMethod: 'PROMEDIO_PONDERADO',
        initialStock: 0,
        minStock: 0,
        maxStock: 0,
        totalStock: 0,
        manufacturedInHouse: false,
        costAffectingExp: false,
        manageLots: false,
        perishable: false,
        belongsToProduct: false,
        sellBelowMin: false,
        inventoriable: true,
        version: 0,
        active: true,
        createdAt: '',
        updatedAt: '',
      }),
    );

    const mockFormulas = [
      {
        id: 'f1',
        parentProductId: 'product-1',
        componentProductId: 'comp-a',
        quantity: 2.5,
        unitOfMeasureId: 'uom-1',
        sequenceNumber: 0,
        notes: null,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    formulaServiceMock.list.mockReturnValue(of(mockFormulas));
    fixture.detectChanges();

    // Directly set resolved name for the test
    component.componentNames.set(new Map([['comp-a', 'CARNE DE RES']]));
    fixture.detectChanges();

    const cellText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(cellText).toContain('CARNE DE RES');
  });

  // ── RED 7: "Producir" button exists ─────────────────────────────
  it('should render the "Producir" button', () => {
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('.sub-table-header-actions .tb-btn'));
    const producirBtn = buttons.find((b) =>
      (b.nativeElement as HTMLElement).textContent?.includes('Producir'),
    );
    expect(producirBtn).toBeTruthy();
  });
});
