import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ProductInventoryComponent } from './product-inventory';

/** Minimal host that creates a FormGroup + FormArray and passes them to the component. */
@Component({
  standalone: true,
  imports: [ProductInventoryComponent],
  template: `<app-product-inventory
    [form]="form"
    [warehousesArray]="warehousesArray"
    [warehouseList]="warehouseList"
    [isEditing]="isEditing"
    (addWarehouse)="onAdd()"
    (removeWarehouse)="onRemove($event)"
  />`,
})
class TestHost {
  private readonly fb = new FormBuilder();
  form: FormGroup = this.fb.group({
    costingMethod: ['PROMEDIO_PONDERADO'],
    initialStock: [0, [Validators.min(0)]],
    minStock: [0, [Validators.min(0)]],
    maxStock: [0, [Validators.min(0)]],
    totalStock: [{ value: 0, disabled: true }],
    inventoriable: [true],
    manufacturedInHouse: [false],
    costAffectingExp: [false],
    manageLots: [false],
    perishable: [false],
    belongsToProduct: [false],
    sellBelowMin: [false],
  });
  warehousesArray: FormArray = this.fb.array<FormGroup>([]);
  warehouseList: { id: string; name: string }[] = [
    { id: 'w1', name: 'Bodega Principal' },
    { id: 'w2', name: 'Bodega Secundaria' },
  ];
  isEditing = true;
  addCount = 0;
  removedIndex = -1;

  onAdd(): void {
    this.addCount++;
  }
  onRemove(index: number): void {
    this.removedIndex = index;
  }
}

// Helper: push a warehouse row into the array
function pushWarehouseRow(host: TestHost): void {
  host.warehousesArray.push(
    host['fb'].group({
      id: [null as string | null],
      warehouseId: ['w1'],
      locationId: [null as string | null],
      unitOfMeasureId: [null as string | null],
      isDefault: [false],
    }),
  );
}

describe('ProductInventoryComponent', () => {
  let hostFixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, NoopAnimationsModule],
    }).compileComponents();
    hostFixture = TestBed.createComponent(TestHost);
    host = hostFixture.componentInstance;
  });

  const detect = (): void => {
    hostFixture.detectChanges();
  };

  // ── Renders inventory checkboxes with helper text ──────────────
  it('should render all 7 inventory checkboxes with helper text', () => {
    detect();
    const checkboxes = hostFixture.debugElement.queryAll(By.css('mat-checkbox'));
    expect(checkboxes.length).toBe(7);

    const rendered = (hostFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(rendered).toContain('Inventariable');
    expect(rendered).toContain('Elaborado en casa');
    expect(rendered).toContain('Gasto afecta costo');
    expect(rendered).toContain('Maneja lotes');
    expect(rendered).toContain('Perecedero');
    expect(rendered).toContain('Pertenece a un producto');
    expect(rendered).toContain('Vender bajo mínimo');

    // Helper text should be present for at least some checkboxes
    const helperTexts = hostFixture.debugElement.queryAll(By.css('.pi-checkbox-helper'));
    expect(helperTexts.length).toBe(7);
  });

  // ── costingMethod select renders ───────────────────────────────
  it('should render costingMethod select with options', () => {
    detect();
    const select = hostFixture.debugElement.query(
      By.css('mat-select[formControlName="costingMethod"]'),
    );
    expect(select).toBeTruthy();
  });

  // ── Stock fields render and bind ───────────────────────────────
  it('should render stock fields: initialStock, minStock, maxStock, totalStock', () => {
    detect();
    const initialEl = hostFixture.debugElement.query(
      By.css('input[formControlName="initialStock"]'),
    );
    const minEl = hostFixture.debugElement.query(By.css('input[formControlName="minStock"]'));
    const maxEl = hostFixture.debugElement.query(By.css('input[formControlName="maxStock"]'));
    const totalEl = hostFixture.debugElement.query(By.css('input[formControlName="totalStock"]'));

    expect(initialEl).toBeTruthy();
    expect(minEl).toBeTruthy();
    expect(maxEl).toBeTruthy();
    expect(totalEl).toBeTruthy();

    // Bind: type a value into initialStock
    const input = initialEl.nativeElement as HTMLInputElement;
    input.value = '50';
    input.dispatchEvent(new Event('input'));
    detect();
    expect(host.form.get('initialStock')?.value).toBe(50);
  });

  // ── TRIANGULATE: totalStock is disabled (readonly) ─────────────
  it('should render totalStock as a disabled field', () => {
    detect();
    const totalEl = hostFixture.debugElement.query(By.css('input[formControlName="totalStock"]'));
    const el = totalEl.nativeElement as HTMLInputElement;
    expect(el.disabled).toBe(true);
  });

  // ── Warehouse rows display ─────────────────────────────────────
  it('should render warehouse rows when warehousesArray has entries', () => {
    pushWarehouseRow(host);
    detect();
    const rows = hostFixture.debugElement.queryAll(By.css('.pi-warehouse-row'));
    expect(rows.length).toBe(1);
    // Verify a warehouse select is rendered inside the row
    const selects = rows[0].queryAll(By.css('mat-select'));
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  // ── TRIANGULATE: empty warehouse state ─────────────────────────
  it('should show empty message when warehousesArray is empty', () => {
    detect();
    const emptyMsg = hostFixture.debugElement.query(By.css('.pi-warehouse-empty'));
    expect(emptyMsg).toBeTruthy();
    expect((emptyMsg.nativeElement as HTMLElement).textContent?.trim()).toContain('Sin bodegas');
  });

  // ── Add warehouse button emits ─────────────────────────────────
  it('should emit addWarehouse when "Agregar bodega" is clicked', () => {
    detect();
    const addBtn = hostFixture.debugElement.query(By.css('.pi-add-warehouse-btn'));
    expect(addBtn).toBeTruthy();
    addBtn.nativeElement.click();
    detect();
    expect(host.addCount).toBe(1);
  });

  // ── TRIANGULATE: remove warehouse button emits ─────────────────
  it('should emit removeWarehouse with correct index on delete click', () => {
    pushWarehouseRow(host);
    detect();
    const deleteBtn = hostFixture.debugElement.query(
      By.css('.pi-warehouse-row button[color="warn"]'),
    );
    expect(deleteBtn).toBeTruthy();
    deleteBtn.nativeElement.click();
    detect();
    expect(host.removedIndex).toBe(0);
  });

  // ── Checkbox binds ─────────────────────────────────────────────
  it('should bind inventoriable checkbox to form control', () => {
    detect();
    // Find by label text within mat-checkbox
    const allCheckboxes = hostFixture.debugElement.queryAll(By.css('mat-checkbox'));
    const inventoriableCb = allCheckboxes.find((cb) =>
      (cb.nativeElement as HTMLElement).textContent?.includes('Inventariable'),
    );
    expect(inventoriableCb).toBeTruthy();
    // inventoriable starts as true
    expect(host.form.get('inventoriable')?.value).toBe(true);
  });
});
