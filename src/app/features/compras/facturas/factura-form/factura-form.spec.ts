import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { FacturaFormComponent } from './factura-form';
import { AuthService } from '../../../../core/auth/auth.service';
import { SupplierInvoiceService } from '../../../../core/services/supplier-invoice.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import type { UserRole } from '../../../../core/models/user.model';
import type { SupplierInvoiceRequest } from '../../../../core/models/supplier-invoice.model';

describe('FacturaFormComponent — retención data-driven (WU-42a)', () => {
  let fixture: ComponentFixture<FacturaFormComponent>;
  let component: FacturaFormComponent;

  const role = signal<UserRole | null>('ADMIN');
  const authService = { userRole: role };
  const supplierInvoiceService = {
    create: vi.fn((_request: SupplierInvoiceRequest) => of({})),
  };
  const thirdPartyService = {
    supplierOptions: { value: () => [], isLoading: () => false },
    reload: vi.fn(),
  };
  const purchaseOrderService = {
    searchByNumber: vi.fn(() => of([])),
    getById: vi.fn(() => of(null)),
  };

  beforeEach(async () => {
    role.set('ADMIN');
    await TestBed.configureTestingModule({
      imports: [FacturaFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: SupplierInvoiceService, useValue: supplierInvoiceService },
        { provide: ThirdPartyService, useValue: thirdPartyService },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  function create(): void {
    fixture = TestBed.createComponent(FacturaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillValidForm(overrides: Record<string, unknown> = {}): void {
    component.form.patchValue({
      supplierId: 'supplier-1',
      invoiceNumber: 'FV-001',
      subtotal: 1000,
      ivaTotal: 190,
      ...overrides,
    });
  }

  function lastRequest(): SupplierInvoiceRequest {
    expect(supplierInvoiceService.create).toHaveBeenCalledTimes(1);
    return supplierInvoiceService.create.mock.calls[0][0];
  }

  it('sends retentionTotal null and total without retention when there is no override', () => {
    create();
    fillValidForm();
    component.save();

    const request = lastRequest();
    expect(request.retentionTotal).toBeNull();
    expect(request.total).toBe(1190);
  });

  it('exposes the manual retention override for ADMIN', () => {
    role.set('ADMIN');
    create();

    expect(component.canOverrideRetention()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Retención total');
  });

  it('exposes the manual retention override for CONTADOR', () => {
    role.set('CONTADOR');
    create();

    expect(component.canOverrideRetention()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Retención total');
  });

  it('hides the manual retention override for AUXILIAR', () => {
    role.set('AUXILIAR');
    create();

    expect(component.canOverrideRetention()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Retención total');
  });

  it('sends the explicit override and subtracts it from the total for ADMIN', () => {
    role.set('ADMIN');
    create();
    fillValidForm({ retentionTotal: 100 });
    component.save();

    const request = lastRequest();
    expect(request.retentionTotal).toBe(100);
    expect(request.total).toBe(1090);
  });

  it('never sends a retention for a non-privileged role even if the control holds a value', () => {
    role.set('CAJERO');
    create();
    fillValidForm({ retentionTotal: 100 });
    component.save();

    const request = lastRequest();
    expect(request.retentionTotal).toBeNull();
    expect(request.total).toBe(1190);
  });
});
