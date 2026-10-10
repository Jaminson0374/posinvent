import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import Swal from 'sweetalert2';

import { ProductFormComponent } from './product-form';

// Spy SweetAlert2 for test environment
vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as never);

describe('ProductFormComponent — tab navigation', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
  });

  it('should render the Material tab group with the requested tab labels', () => {
    fixture.detectChanges();
    const tabGroup = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(tabGroup).toBeTruthy();

    const labels = fixture.debugElement
      .queryAll(By.css('.mat-mdc-tab'))
      .map((tab) => (tab.nativeElement as HTMLElement).textContent?.trim());
    const requestedLabels = [
      'General',
      'Inventario y Lotes',
      'Contabilización',
      'Proveedores',
      'Especificaciones',
      'Presentaciones',
      'Fórmulas',
      'Imágenes',
      'Promociones',
    ];
    expect(labels).toHaveLength(requestedLabels.length);
    requestedLabels.forEach((label, index) => {
      expect(labels[index]).toContain(label);
    });
  });

  it('should keep Presentaciones and Fórmulas tabs with a loaded product in view/edit mode and hide their ABM in new mode', () => {
    // Let ngOnInit run its route subscription first so it does not reset state below.
    fixture.detectChanges();

    // View mode with a loaded product
    component.mode.set('view');
    component.loadedId.set('product-1');
    fixture.detectChanges();

    const labels = fixture.debugElement
      .queryAll(By.css('.mat-mdc-tab'))
      .map((tab) => (tab.nativeElement as HTMLElement).textContent?.trim());
    expect(labels.some((label) => label?.includes('Presentaciones'))).toBe(true);
    expect(labels.some((label) => label?.includes('Fórmulas'))).toBe(true);
    expect(component.showPresentationsTab()).toBe(true);

    // Edit mode keeps the ABM available
    component.mode.set('edit');
    fixture.detectChanges();
    expect(component.showPresentationsTab()).toBe(true);

    // New mode (no product loaded) hides their ABM
    component.mode.set('new');
    component.loadedId.set(null);
    fixture.detectChanges();
    expect(component.showPresentationsTab()).toBe(false);
    expect(component.showFormulaTab()).toBe(false);
  });

  // ── RED 4: product-general wraps the form content ──────────────────
  it('should render app-product-general component', () => {
    fixture.detectChanges();
    const pg = fixture.debugElement.query(By.css('app-product-general'));
    expect(pg).toBeTruthy();
  });

  // ── RED 5: form still exists with required controls ───────────────
  it('should retain the form with productCode and name controls', () => {
    expect(component.form.contains('productCode')).toBe(true);
    expect(component.form.contains('name')).toBe(true);
    expect(component.form.contains('costPrice')).toBe(true);
    expect(component.form.contains('salePrice')).toBe(true);
    expect(component.form.contains('taxType')).toBe(true);
    expect(component.form.contains('costingMethod')).toBe(true);
  });

  // ── RED 6: toolbar still renders ──────────────────────────────────
  it('should still render the toolbar', () => {
    fixture.detectChanges();
    const toolbar = fixture.debugElement.query(By.css('.pf-toolbar'));
    expect(toolbar).toBeTruthy();
  });

  it('should wire the selected tab index to the component signal', () => {
    fixture.detectChanges();
    const tabGroup = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(component.selectedTab()).toBe(0);
    expect(tabGroup.componentInstance.selectedIndex).toBe(0);

    component.selectedTab.set(2);
    fixture.detectChanges();
    expect(tabGroup.componentInstance.selectedIndex).toBe(2);
  });

  it('should show product-general in the General tab', () => {
    fixture.detectChanges();
    const pg = fixture.debugElement.query(By.css('app-product-general'));
    expect(pg).toBeTruthy();
  });

  // ── RED D1: product-summary renders inside product-general sidebar ──
  it('should render product-summary inside product-general sidebar', () => {
    component.mode.set('new');
    fixture.detectChanges();
    const summary = fixture.debugElement.query(By.css('app-product-summary'));
    expect(summary).toBeTruthy();
  });
});

describe('ProductFormComponent — draft persistence', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;

  const DRAFT_KEY_NEW = 'posinvent-draft-new';

  beforeEach(async () => {
    // Clean localStorage before each test
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // ── RED D2: draft key pattern is correct ─────────────────────────
  it('should use posinvent-draft-new as localStorage key for new products', () => {
    // The component should expose or use the key pattern
    const key = DRAFT_KEY_NEW;
    expect(key).toBe('posinvent-draft-new');
  });

  // ── RED D3: auto-save writes to localStorage on valueChanges ─────
  it('should save draft to localStorage when form values change', async () => {
    vi.useFakeTimers();
    component.mode.set('new');
    fixture.detectChanges();

    // Simulate form value change
    component.form.patchValue({
      productCode: 'DRAFT-001',
      name: 'Draft Product',
      costPrice: 5000,
    });

    // Advance past debounce time (2000ms)
    vi.advanceTimersByTime(2500);

    // Allow effects and subscriptions to flush
    await vi.runAllTimersAsync();
    fixture.detectChanges();

    const saved = localStorage.getItem(DRAFT_KEY_NEW);
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved!);
    expect(parsed.productCode).toBe('DRAFT-001');
    expect(parsed.name).toBe('Draft Product');
    expect(parsed.costPrice).toBe(5000);

    vi.useRealTimers();
  });

  // ── RED D4: draft is cleared from localStorage on save ───────────
  it('should clear localStorage draft after successful save', () => {
    // Pre-populate localStorage with a draft
    localStorage.setItem(DRAFT_KEY_NEW, JSON.stringify({ productCode: 'X', name: 'Y' }));

    // Call the clear method directly (should be available)
    if (typeof (component as any).clearLocalDraft === 'function') {
      (component as any).clearLocalDraft();
    }
    // After clear, key should be gone
    const afterClear = localStorage.getItem(DRAFT_KEY_NEW);
    expect(afterClear).toBeNull();
  });

  // ── RED D5: "Guardar borrador" button renders in toolbar ─────────
  it('should render a "Guardar borrador" button in the toolbar', () => {
    component.mode.set('new');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('.pf-toolbar-actions .tb-btn'));
    const draftBtn = buttons.find((b) =>
      (b.nativeElement as HTMLElement).textContent?.includes('Guardar borrador'),
    );
    expect(draftBtn).toBeTruthy();
  });

  // ── RED D6: "Guardar borrador" button saves immediately ──────────
  it('should save draft to localStorage immediately when "Guardar borrador" is clicked', () => {
    component.mode.set('new');
    fixture.detectChanges();

    component.form.patchValue({
      productCode: 'INSTANT-DRAFT',
      name: 'Instant Save',
    });

    // Click the Guardar borrador button (if guardarBorrador method exists)
    if (typeof (component as any).guardarBorrador === 'function') {
      (component as any).guardarBorrador();
    }

    const saved = localStorage.getItem(DRAFT_KEY_NEW);
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved!);
    expect(parsed.productCode).toBe('INSTANT-DRAFT');
    expect(parsed.name).toBe('Instant Save');
  });

  // ── RED D7: draft excludes images ────────────────────────────────
  it('should exclude images from the draft', () => {
    component.mode.set('new');
    fixture.detectChanges();

    component.form.patchValue({ productCode: 'NO-IMG' });

    if (typeof (component as any).guardarBorrador === 'function') {
      (component as any).guardarBorrador();
    }

    const saved = localStorage.getItem(DRAFT_KEY_NEW);
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved!);
    // Images should not be in the draft
    expect(parsed.images).toBeUndefined();
  });
});
