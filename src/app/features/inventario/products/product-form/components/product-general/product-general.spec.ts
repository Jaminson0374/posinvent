import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ProductGeneralComponent, ProductGeneralDisplayControls } from './product-general';

/** Minimal host that creates a FormGroup and passes it to the component. */
@Component({
  standalone: true,
  imports: [ProductGeneralComponent],
  template: `<app-product-general [form]="form" [displayControls]="displayControls">
    <div class="sidebar-mock">SIDEBAR</div>
  </app-product-general>`,
})
class TestHost {
  private readonly fb = new FormBuilder();
  form: FormGroup = this.fb.group({
    productCode: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    barcode: [''],
    reference: [''],
    description: [''],
    productTypeId: [null as string | null],
    productStateId: [null as string | null],
    brandId: [null as string | null],
    modelId: [null as string | null],
    categoryId: [null as string | null],
    groupId: [null as string | null],
    unitOfMeasureId: [null as string | null],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    profitMargin: [0, [Validators.min(0), Validators.max(100)]],
    taxType: ['EXENTO'],
    salePrice: [0],
    costingMethod: ['PROMEDIO_PONDERADO'],
    initialStock: [0, [Validators.min(0)]],
    minStock: [0, [Validators.min(0)]],
    maxStock: [0, [Validators.min(0)]],
    totalStock: [{ value: 0, disabled: true }],
    manufacturedInHouse: [false],
    costAffectingExp: [false],
    manageLots: [false],
    perishable: [false],
    belongsToProduct: [false],
    sellBelowMin: [false],
    inventoriable: [true],
  });

  displayControls: ProductGeneralDisplayControls = {
    typeDisplay: new FormControl(''),
    stateDisplay: new FormControl(''),
    brandDisplay: new FormControl(''),
    modelDisplay: new FormControl(''),
    categoryDisplay: new FormControl(''),
    groupDisplay: new FormControl(''),
    uomDisplay: new FormControl(''),
  };
}

describe('ProductGeneralComponent', () => {
  let hostFixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, NoopAnimationsModule],
    }).compileComponents();
    hostFixture = TestBed.createComponent(TestHost);
  });

  const detect = (): void => {
    hostFixture.detectChanges();
  };

  // ── renders all 4 cards ────────────────────────────────────────────
  it('should render 4 Material Cards with icon headers', () => {
    detect();
    const cards = hostFixture.debugElement.queryAll(By.css('.pg-card'));
    expect(cards).toHaveLength(4);

    const cardIcons = hostFixture.debugElement.queryAll(By.css('.pg-card__icon mat-icon'));
    expect(cardIcons).toHaveLength(4);
  });

  // ── cards have titles ─────────────────────────────────────────────
  it('should render card titles: Identificación, Clasificación, Costos y precios, Listas de precios', () => {
    detect();
    const rendered = (hostFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(rendered).toContain('Identificación');
    expect(rendered).toContain('Clasificación');
    expect(rendered).toContain('Costos y precios');
    expect(rendered).toContain('Listas de precios');
  });

  // ── TRIANGULATE: card descriptions exist ──────────────────────────
  it('should render card descriptions', () => {
    detect();
    const cardDescs = hostFixture.debugElement.queryAll(By.css('.pg-card__desc'));
    expect(cardDescs.length).toBe(4);
    cardDescs.forEach((desc) => {
      const text = (desc.nativeElement as HTMLElement).textContent?.trim() ?? '';
      expect(text.length).toBeGreaterThan(0);
    });
  });

  // ── form control binding — productCode ────────────────────────────
  it('should bind the productCode field via formControlName', () => {
    detect();
    const codeInput = hostFixture.debugElement.query(
      By.css('input[formControlName="productCode"]'),
    );
    expect(codeInput).toBeTruthy();

    const inputEl = codeInput.nativeElement as HTMLInputElement;
    inputEl.value = 'PROD-001';
    inputEl.dispatchEvent(new Event('input'));
    detect();
    expect(hostFixture.componentInstance.form.get('productCode')?.value).toBe('PROD-001');
  });

  // ── costPrice numeric input renders ───────────────────────────────
  it('should render the costPrice numeric input', () => {
    detect();
    const costInput = hostFixture.debugElement.query(By.css('input[formControlName="costPrice"]'));
    expect(costInput).toBeTruthy();
    expect((costInput.nativeElement as HTMLInputElement).type).toBe('number');
  });

  // ── salePrice readonly field ──────────────────────────────────────
  it('should render salePrice as a readonly field', () => {
    detect();
    const saleInput = hostFixture.debugElement.query(By.css('input[formControlName="salePrice"]'));
    expect(saleInput).toBeTruthy();
    const el = saleInput.nativeElement as HTMLInputElement;
    expect(el.readOnly).toBe(true);
  });

  // ── ng-content sidebar ────────────────────────────────────────────
  it('should render projected sidebar content via ng-content', () => {
    detect();
    const sidebar = hostFixture.debugElement.query(By.css('.sidebar-mock'));
    expect(sidebar).toBeTruthy();
    expect(sidebar.nativeElement.textContent).toContain('SIDEBAR');
  });

  // ── grid layout container ─────────────────────────────────────────
  it('should have a grid layout container element', () => {
    detect();
    const grid = hostFixture.debugElement.query(By.css('.pg-layout'));
    expect(grid).toBeTruthy();
  });

  // ── responsive: layout element exists (container for responsive classes) ──
  it('should render the responsive layout wrapper', () => {
    detect();
    const wrapper = hostFixture.debugElement.query(By.css('.pg-layout'));
    expect(wrapper).toBeTruthy();
    const el = wrapper.nativeElement as HTMLElement;
    // At default viewport (not mobile), the element is present
    // Tailwind classes are applied but we verify the element renders
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
