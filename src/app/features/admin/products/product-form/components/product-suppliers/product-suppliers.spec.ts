import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ProductSuppliersComponent } from './product-suppliers';

interface SupplierOption {
  id: string;
  name: string;
  lastName: string;
  numIdentification: string;
  active: boolean;
}

/** Minimal host that creates a FormArray and passes it to the component. */
@Component({
  standalone: true,
  imports: [ProductSuppliersComponent],
  template: `<app-product-suppliers
    [suppliersArray]="suppliersArray"
    [supplierList]="supplierList"
    [isEditing]="isEditing"
    (addSupplier)="onAdd()"
    (removeSupplier)="onRemove($event)"
  />`,
})
class TestHost {
  private readonly fb = new FormBuilder();
  suppliersArray: FormArray = this.fb.array<FormGroup>([]);
  supplierList: SupplierOption[] = [
    {
      id: 's1',
      name: 'Distribuidora',
      lastName: 'Andina S.A.',
      numIdentification: '900123456',
      active: true,
    },
    {
      id: 's2',
      name: 'Proveedor',
      lastName: 'Nacional Ltda.',
      numIdentification: '800654321',
      active: true,
    },
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

// Helper: push a supplier row into the array
function pushSupplierRow(host: TestHost): void {
  host.suppliersArray.push(
    host['fb'].group({
      id: [null as string | null],
      supplierId: ['s1'],
      supplierReference: ['REF-001'],
      unitCost: [5000],
      isMain: [false],
    }),
  );
}

describe('ProductSuppliersComponent', () => {
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

  // ── Renders supplier rows ─────────────────────────────────────
  it('should render supplier rows when suppliersArray has entries', () => {
    pushSupplierRow(host);
    detect();
    const rows = hostFixture.debugElement.queryAll(By.css('.ps-supplier-row'));
    expect(rows.length).toBe(1);
    // Row should have a supplier select
    const selects = rows[0].queryAll(By.css('mat-select'));
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  // ── TRIANGULATE: empty state ──────────────────────────────────
  it('should show empty message when suppliersArray is empty', () => {
    detect();
    const emptyMsg = hostFixture.debugElement.query(By.css('.ps-supplier-empty'));
    expect(emptyMsg).toBeTruthy();
    expect((emptyMsg.nativeElement as HTMLElement).textContent?.trim()).toContain(
      'Sin proveedores',
    );
  });

  // ── Add supplier button emits ─────────────────────────────────
  it('should emit addSupplier when "Agregar proveedor" is clicked', () => {
    detect();
    const addBtn = hostFixture.debugElement.query(By.css('.ps-add-supplier-btn'));
    expect(addBtn).toBeTruthy();
    addBtn.nativeElement.click();
    detect();
    expect(host.addCount).toBe(1);
  });

  // ── TRIANGULATE: remove supplier button emits ─────────────────
  it('should emit removeSupplier with correct index on delete click', () => {
    pushSupplierRow(host);
    detect();
    const deleteBtn = hostFixture.debugElement.query(
      By.css('.ps-supplier-row button[color="warn"]'),
    );
    expect(deleteBtn).toBeTruthy();
    (deleteBtn.nativeElement as HTMLButtonElement).click();
    detect();
    expect(host.removedIndex).toBe(0);
  });

  // ── isMain checkbox renders ───────────────────────────────────
  it('should render isMain checkbox in supplier row', () => {
    pushSupplierRow(host);
    detect();
    const cb = hostFixture.debugElement.query(By.css('mat-checkbox[formControlName="isMain"]'));
    expect(cb).toBeTruthy();
    // Label should be "Principal"
    expect((cb.nativeElement as HTMLElement).textContent?.trim()).toContain('Principal');
  });

  // ── TRIANGULATE: supplier preferences input ───────────────────
  it('should render supplierReference and unitCost fields in supplier row', () => {
    pushSupplierRow(host);
    detect();
    const refInput = hostFixture.debugElement.query(
      By.css('input[formControlName="supplierReference"]'),
    );
    const costInput = hostFixture.debugElement.query(By.css('input[formControlName="unitCost"]'));
    expect(refInput).toBeTruthy();
    expect(costInput).toBeTruthy();
  });

  // ── Card renders with title ───────────────────────────────────
  it('should render card with "Proveedores del artículo" title', () => {
    detect();
    const rendered = (hostFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(rendered).toContain('Proveedores del artículo');
  });
});
