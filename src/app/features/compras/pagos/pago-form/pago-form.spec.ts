import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PagoFormComponent } from './pago-form';
import { PaymentService } from '../../../../core/services/payment.service';
import type { Payment } from '../../../../core/models/payment.model';
import type { SupplierInvoice } from '../../../../core/models/supplier-invoice.model';

function buildInvoice(id: string, total: number): SupplierInvoice {
  return {
    id,
    supplierId: 'sup-1',
    supplierName: 'Proveedor Uno',
    invoiceNumber: `FV-${id}`,
    issueDate: '2025-01-01',
    dueDate: '2025-02-01',
    subtotal: total,
    ivaTotal: 0,
    retentionTotal: 0,
    total,
    status: 'RECONCILED',
    ocIds: [],
    notes: null,
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
  };
}

describe('PagoFormComponent', () => {
  let component: PagoFormComponent;
  let fixture: ComponentFixture<PagoFormComponent>;
  let paymentService: PaymentService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PagoFormComponent);
    component = fixture.componentInstance;
    paymentService = TestBed.inject(PaymentService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function prime(
    invoices: SupplierInvoice[],
    selectedIds: string[],
    applied: Record<string, number>,
    amount: number,
  ): void {
    component.outstandingInvoices.set(invoices);
    component.selectedInvoiceIds.set(new Set(selectedIds));
    component.appliedAmounts.set(applied);
    component.form.controls.supplierId.setValue('sup-1');
    component.form.controls.amount.setValue(amount);
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('sends invoicePayments with the applied amount per invoice (not invoiceIds/appliedAmounts)', () => {
    const createSpy = vi
      .spyOn(paymentService, 'create')
      .mockReturnValue(of({} as Payment));

    prime(
      [buildInvoice('inv-1', 1000), buildInvoice('inv-2', 1000)],
      ['inv-1', 'inv-2'],
      { 'inv-1': 300, 'inv-2': 200 },
      500,
    );

    component.save();

    expect(createSpy).toHaveBeenCalledTimes(1);
    const request = createSpy.mock.calls[0][0];
    expect(request.invoicePayments).toEqual([
      { invoiceId: 'inv-1', appliedAmount: 300 },
      { invoiceId: 'inv-2', appliedAmount: 200 },
    ]);
    expect(request.amount).toBe(500);
    expect(request.supplierId).toBe('sup-1');
    expect(request).not.toHaveProperty('invoiceIds');
    expect(request).not.toHaveProperty('appliedAmounts');
  });

  it('uses the applied amount per invoice, which may differ from the invoice total', () => {
    const createSpy = vi
      .spyOn(paymentService, 'create')
      .mockReturnValue(of({} as Payment));

    prime([buildInvoice('inv-1', 1000)], ['inv-1'], { 'inv-1': 250 }, 250);

    component.save();

    const request = createSpy.mock.calls[0][0];
    expect(request.invoicePayments).toEqual([{ invoiceId: 'inv-1', appliedAmount: 250 }]);
  });

  it('defaults the applied amount to the invoice total when an invoice is toggled on', () => {
    component.outstandingInvoices.set([buildInvoice('inv-1', 750)]);
    component.toggleInvoice('inv-1');

    expect(component.selectedInvoiceIds().has('inv-1')).toBe(true);
    expect(component.getAppliedAmount('inv-1')).toBe(750);

    component.toggleInvoice('inv-1');
    expect(component.selectedInvoiceIds().has('inv-1')).toBe(false);
    expect(component.getAppliedAmount('inv-1')).toBe(0);
  });

  it('blocks the save when the amount does not match the sum of applied amounts', () => {
    const createSpy = vi
      .spyOn(paymentService, 'create')
      .mockReturnValue(of({} as Payment));

    prime([buildInvoice('inv-1', 1000)], ['inv-1'], { 'inv-1': 300 }, 400);

    component.save();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.error()).toContain('coincidir');
  });
});
