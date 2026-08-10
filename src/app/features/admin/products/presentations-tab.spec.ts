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

import { PresentationsTabComponent } from './presentations-tab';
import { PresentationService } from '../../../core/services/presentation.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';

// Mock SweetAlert2
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: false }),
  },
}));

describe('PresentationsTabComponent — ReactiveForms', () => {
  let fixture: ComponentFixture<PresentationsTabComponent>;
  let component: PresentationsTabComponent;
  let fb: FormBuilder;
  let presentationServiceMock: ReturnType<typeof createPresentationServiceMock>;
  let uomServiceMock: ReturnType<typeof createUomServiceMock>;

  function createPresentationServiceMock() {
    return {
      list: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of({} as any)),
      update: vi.fn().mockReturnValue(of({} as any)),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };
  }

  function createUomServiceMock() {
    const unitsSignal = signal([
      { id: 'uom-1', code: 'UN', name: 'Unidad' },
      { id: 'uom-2', code: 'KG', name: 'Kilogramos' },
    ]);
    return {
      units: { value: unitsSignal, reload: vi.fn() },
    };
  }

  beforeEach(async () => {
    presentationServiceMock = createPresentationServiceMock();
    uomServiceMock = createUomServiceMock();
    fb = new FormBuilder();

    await TestBed.configureTestingModule({
      imports: [PresentationsTabComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PresentationService, useValue: presentationServiceMock },
        { provide: UnitOfMeasureService, useValue: uomServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationsTabComponent);
    component = fixture.componentInstance;
    // Set required inputs before change detection
    component.productId = 'product-1';
    component.formArray = fb.array<FormGroup>([]);
  });

  // ── RED 1: Component accepts formArray input ─────────────────────
  it('should accept a formArray input from the parent', () => {
    expect(component.formArray).toBeDefined();
    expect(component.formArray.length).toBe(0);
  });

  // ── RED 2: Loaded presentations populate the FormArray ──────────
  it('should populate formArray when presentations are loaded', () => {
    const mockPresentations = [
      {
        id: 'p1',
        productId: 'product-1',
        code: 'PRES-001',
        name: 'Caja x6',
        unitOfMeasureId: 'uom-1',
        unitOfMeasureName: 'Unidad',
        conversionFactor: 6,
        salePrice: 15000,
        isDefault: true,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'p2',
        productId: 'product-1',
        code: 'PRES-002',
        name: 'Sobre x1',
        unitOfMeasureId: 'uom-1',
        unitOfMeasureName: 'Unidad',
        conversionFactor: 1,
        salePrice: null,
        isDefault: false,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    presentationServiceMock.list.mockReturnValue(of(mockPresentations));
    fixture.detectChanges();

    expect(component.formArray.length).toBe(2);

    const g1 = component.formArray.at(0);
    expect(g1.get('code')?.value).toBe('PRES-001');
    expect(g1.get('name')?.value).toBe('Caja x6');
    expect(g1.get('unitOfMeasureId')?.value).toBe('uom-1');
    expect(g1.get('conversionFactor')?.value).toBe(6);
    expect(g1.get('salePrice')?.value).toBe(15000);
    expect(g1.get('isDefault')?.value).toBe(true);
  });

  // ── RED 3: Adding creates a FormGroup in formArray ──────────────
  it('should create a new FormGroup in formArray when adding a presentation', () => {
    fixture.detectChanges();

    const initialLength = component.formArray.length;

    const addBtn = fixture.debugElement.query(By.css('.sub-table-header .tb-btn'));
    expect(addBtn).toBeTruthy();
    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray.length).toBe(initialLength + 1);

    const newGroup = component.formArray.at(component.formArray.length - 1);
    expect(newGroup.get('code')).toBeTruthy();
    expect(newGroup.get('name')).toBeTruthy();
    expect(newGroup.get('unitOfMeasureId')).toBeTruthy();
    expect(newGroup.get('conversionFactor')).toBeTruthy();
    expect(newGroup.get('salePrice')).toBeTruthy();
    expect(newGroup.get('isDefault')).toBeTruthy();
  });

  // ── RED 4: Cancelling add removes the FormGroup ─────────────────
  it('should remove the temporary FormGroup when cancelling add', () => {
    fixture.detectChanges();

    const initialLength = component.formArray.length;

    const addBtn = fixture.debugElement.query(By.css('.sub-table-header .tb-btn'));
    expect(addBtn).toBeTruthy();
    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray.length).toBe(initialLength + 1);

    const cancelBtn = fixture.debugElement.query(By.css('button[matTooltip="Cancelar"]'));
    expect(cancelBtn).toBeTruthy();
    (cancelBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.formArray.length).toBe(initialLength);
  });

  // ── RED 5: Editing a row propagates dirty state ─────────────────
  it('should mark the FormGroup as dirty when editing a presentation row', () => {
    const mockPresentations = [
      {
        id: 'p1',
        productId: 'product-1',
        code: 'PRES-001',
        name: 'Caja x6',
        unitOfMeasureId: 'uom-1',
        unitOfMeasureName: 'Unidad',
        conversionFactor: 6,
        salePrice: 15000,
        isDefault: true,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    presentationServiceMock.list.mockReturnValue(of(mockPresentations));
    fixture.detectChanges();

    expect(component.formArray.at(0).dirty).toBe(false);

    const editBtn = fixture.debugElement.query(By.css('button[matTooltip="Editar"]'));
    expect(editBtn).toBeTruthy();
    (editBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();

    const row = component.formArray.at(0);
    row.get('code')?.setValue('NEW-CODE');
    row.get('code')?.markAsDirty();
    fixture.detectChanges();

    expect(component.formArray.at(0).dirty).toBe(true);
  });

  // ── RED 6: Single-default "Predet." toggle rendered ─────────────
  it('should show default star icon for the default presentation', () => {
    const mockPresentations = [
      {
        id: 'p1',
        productId: 'product-1',
        code: 'PRES-001',
        name: 'Caja x6',
        unitOfMeasureId: 'uom-1',
        unitOfMeasureName: 'Unidad',
        conversionFactor: 6,
        salePrice: 15000,
        isDefault: true,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'p2',
        productId: 'product-1',
        code: 'PRES-002',
        name: 'Sobre x1',
        unitOfMeasureId: 'uom-1',
        unitOfMeasureName: 'Unidad',
        conversionFactor: 1,
        salePrice: null,
        isDefault: false,
        active: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];

    presentationServiceMock.list.mockReturnValue(of(mockPresentations));
    fixture.detectChanges();

    const starIcons = fixture.debugElement.queryAll(By.css('.pres-default-icon'));
    expect(starIcons.length).toBe(1);

    const setDefaultBtns = fixture.debugElement.queryAll(By.css('.pres-set-default-btn'));
    expect(setDefaultBtns.length).toBe(1);
  });
});
