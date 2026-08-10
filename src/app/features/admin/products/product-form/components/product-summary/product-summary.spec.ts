import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ProductSummaryComponent } from './product-summary';

describe('ProductSummaryComponent', () => {
  let fixture: ComponentFixture<ProductSummaryComponent>;
  let component: ProductSummaryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSummaryComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductSummaryComponent);
    component = fixture.componentInstance;
  });

  const detect = (): void => {
    fixture.detectChanges();
  };

  const setInputs = (values: {
    code?: string | null;
    name?: string | null;
    category?: string | null;
    uom?: string | null;
    cost?: number | null;
    margin?: number | null;
    salePrice?: number | null;
    tax?: string | null;
    stock?: number | null;
  }): void => {
    if (values.code !== undefined) component.code = values.code;
    if (values.name !== undefined) component.name = values.name;
    if (values.category !== undefined) component.category = values.category;
    if (values.uom !== undefined) component.uom = values.uom;
    if (values.cost !== undefined) component.cost = values.cost;
    if (values.margin !== undefined) component.margin = values.margin;
    if (values.salePrice !== undefined) component.salePrice = values.salePrice;
    if (values.tax !== undefined) component.tax = values.tax;
    if (values.stock !== undefined) component.stock = values.stock;
  };

  // ── RED 1: renders all fields when provided ──────────────────────────
  it('should render all 9 summary fields with Material icons when data is provided', () => {
    setInputs({
      code: 'PROD-001',
      name: 'Camiseta Deportiva',
      category: 'Ropa',
      uom: 'UN — Unidad',
      cost: 25000,
      margin: 30,
      salePrice: 32500,
      tax: 'Exento',
      stock: 150,
    });
    detect();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PROD-001');
    expect(text).toContain('Camiseta Deportiva');
    expect(text).toContain('Ropa');
    expect(text).toContain('UN — Unidad');
    expect(text).toContain('$25.000');
    expect(text).toContain('30%');
    expect(text).toContain('$32.500');
    expect(text).toContain('Exento');
    expect(text).toContain('150');

    // Material icons should be present (at least one per row)
    const icons = fixture.debugElement.queryAll(By.css('mat-icon'));
    expect(icons.length).toBeGreaterThanOrEqual(9);
  });

  // ── RED 2: shows "—" for null/empty fields ──────────────────────────
  it('should show "—" for null or empty fields', () => {
    setInputs({
      code: null,
      name: '',
      category: null,
      uom: null,
      cost: null,
      margin: null,
      salePrice: null,
      tax: null,
      stock: null,
    });
    detect();

    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    // Count dashes — each null field should show "—"
    const dashCount = (html.match(/—/g) ?? []).length;
    expect(dashCount).toBeGreaterThanOrEqual(9);
  });

  // ── RED 3: computes incompleteFields correctly ──────────────────────
  it('should compute incompleteFields when required fields are missing', () => {
    setInputs({
      code: null,
      name: null,
      category: null,
      uom: null,
      cost: 25000,
      margin: 30,
      salePrice: 32500,
      tax: 'Exento',
      stock: 150,
    });
    detect();

    // incompleteFields should list the required fields that are null
    // code, name, category, uom are the required ones per REQ-PSS-02
    const incomplete = component.incompleteFields;
    expect(incomplete).toBeDefined();
    expect(incomplete).toContain('Código');
    expect(incomplete).toContain('Nombre');
    expect(incomplete).toContain('Categoría');
    expect(incomplete).toContain('U. Medida');
    expect(incomplete.length).toBe(4);
  });

  // ── RED 4: shows badge when fields are incomplete ───────────────────
  it('should show the "Datos incompletos" badge when fields are missing', () => {
    setInputs({
      code: null,
      name: 'Test',
      category: null,
      uom: null,
      cost: 1000,
      margin: 10,
      salePrice: 1100,
      tax: 'IVA_19',
      stock: 5,
    });
    detect();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Datos incompletos');
    expect(text).toContain('3'); // code, category, uom missing
  });

  // ── RED 5: hides badge when all required fields are present (REQ-PSS-04) ──
  it('should NOT show badge when all required fields are present', () => {
    setInputs({
      code: 'A001',
      name: 'Producto Completo',
      category: 'General',
      uom: 'UN',
      cost: 5000,
      margin: 25,
      salePrice: 6250,
      tax: 'IVA_5',
      stock: 20,
    });
    detect();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Datos incompletos');

    // incompleteFields should be empty
    expect(component.incompleteFields).toEqual([]);
  });

  // ── TRIANGULATE: all fields complete but one edge case ──────────────
  it('should handle edge case: single missing field shows count 1', () => {
    setInputs({
      code: 'B002',
      name: null,
      category: 'Cat',
      uom: 'KG',
      cost: 100,
      margin: 5,
      salePrice: 105,
      tax: 'Exento',
      stock: 0,
    });
    detect();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Datos incompletos');
    expect(text).toContain('1');
    expect(component.incompleteFields).toEqual(['Nombre']);
  });

  // ── TRIANGULATE: help text is always visible ────────────────────────
  it('should show help text at the bottom', () => {
    setInputs({
      code: 'X',
      name: 'Y',
      category: 'Z',
      uom: 'W',
      cost: 1,
      margin: 1,
      salePrice: 1,
      tax: 'Exento',
      stock: 1,
    });
    detect();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Complete todos los campos obligatorios');
  });
});
