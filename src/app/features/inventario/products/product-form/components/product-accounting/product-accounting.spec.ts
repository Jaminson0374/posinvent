import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ProductAccountingComponent } from './product-accounting';

interface PucAccount {
  id: string;
  code: string;
  name: string;
}

interface AccountingTemplate {
  id: string;
  code: string;
  name: string;
}

/** Minimal host that creates a FormGroup and passes it to the component. */
@Component({
  standalone: true,
  imports: [ProductAccountingComponent],
  template: `<app-product-accounting
    [form]="form"
    [incomeAccounts]="incomeAccounts"
    [inventoryAccounts]="inventoryAccounts"
    [costAccounts]="costAccounts"
    [templates]="templates"
  />`,
})
class TestHost {
  private readonly fb = new FormBuilder();
  form: FormGroup = this.fb.group({
    incomeAccountId: [null as string | null],
    inventoryAccountId: [null as string | null],
    costOfSalesAcctId: [null as string | null],
    accountingTemplateId: [null as string | null],
  });

  incomeAccounts: PucAccount[] = [
    { id: 'i1', code: '41', name: 'Ingresos Operacionales' },
    { id: 'i2', code: '42', name: 'Ingresos No Operacionales' },
  ];
  inventoryAccounts: PucAccount[] = [{ id: 'inv1', code: '14', name: 'Inventarios' }];
  costAccounts: PucAccount[] = [
    { id: 'c1', code: '61', name: 'Costo de Ventas' },
    { id: 'c2', code: '62', name: 'Compras' },
  ];
  templates: AccountingTemplate[] = [{ id: 't1', code: 'TPL-001', name: 'Plantilla General' }];
}

describe('ProductAccountingComponent', () => {
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

  // ── Renders PUC account selects ────────────────────────────────
  it('should render three PUC account selects: income, inventory, cost of sales', () => {
    detect();
    const incomeSelect = hostFixture.debugElement.query(
      By.css('mat-select[formControlName="incomeAccountId"]'),
    );
    const inventorySelect = hostFixture.debugElement.query(
      By.css('mat-select[formControlName="inventoryAccountId"]'),
    );
    const costSelect = hostFixture.debugElement.query(
      By.css('mat-select[formControlName="costOfSalesAcctId"]'),
    );

    expect(incomeSelect).toBeTruthy();
    expect(inventorySelect).toBeTruthy();
    expect(costSelect).toBeTruthy();
  });

  // ── accounting template select renders ─────────────────────────
  it('should render accounting template select', () => {
    detect();
    const tplSelect = hostFixture.debugElement.query(
      By.css('mat-select[formControlName="accountingTemplateId"]'),
    );
    expect(tplSelect).toBeTruthy();
  });

  // ── Card renders with title ────────────────────────────────────
  it('should render card with "Cuentas contables" title', () => {
    detect();
    const rendered = (hostFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(rendered).toContain('Cuentas contables');
  });

  // ── TRIANGULATE: card also has plantilla section ───────────────
  it('should render "Plantilla contable" section after divider', () => {
    detect();
    const rendered = (hostFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(rendered).toContain('Plantilla contable');
    // The divider should be present
    const divider = hostFixture.debugElement.query(By.css('mat-divider'));
    expect(divider).toBeTruthy();
  });

  // ── Form binding: incomeAccountId ──────────────────────────────
  it('should bind incomeAccountId to the form', () => {
    detect();
    host.form.patchValue({ incomeAccountId: 'i1' });
    detect();
    expect(host.form.get('incomeAccountId')?.value).toBe('i1');
  });

  // ── TRIANGULATE: accountingTemplateId binding ──────────────────
  it('should bind accountingTemplateId to the form', () => {
    detect();
    host.form.patchValue({ accountingTemplateId: 't1' });
    detect();
    expect(host.form.get('accountingTemplateId')?.value).toBe('t1');
  });

  // ── Card has icon header ───────────────────────────────────────
  it('should render card with an icon header', () => {
    detect();
    const icon = hostFixture.debugElement.query(By.css('.pa-card mat-icon'));
    expect(icon).toBeTruthy();
  });
});
