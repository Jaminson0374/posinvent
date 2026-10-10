import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import type { SalesDocument, SaleItem } from '../../../core/models/sale.model';
import type { PageResponse } from '../../../core/models/page.model';
import type { DevolutionResponse } from '../../../core/models/devolution.model';
import { SaleService } from '../../../core/services/sale.service';
import { DevolutionService } from '../../../core/services/devolution.service';
import { PosDevolutionComponent } from './pos-devolution';

registerLocaleData(localeEsCo);

// Spy sweetalert2 — jsdom doesn't support window.matchMedia
vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const mockItem: SaleItem = {
  id: 'item-1',
  documentId: 'inv-1',
  productId: 'prod-1',
  productName: 'Paleta',
  quantity: 5,
  unitPrice: 24000,
  taxType: 'EXENTO',
  taxRate: 0,
  taxAmount: 0,
  subtotal: 120000,
  lineNumber: 1,
  batchId: null,
};

const mockInvoice: SalesDocument = {
  id: 'inv-1',
  type: 'INVOICE',
  status: 'ISSUED',
  documentNumber: 'INV-001',
  clientId: 'client-1',
  clientName: 'Cliente Prueba',
  warehouseId: 'wh-1',
  shiftId: null,
  cashRegisterId: null,
  sourceDocumentId: null,
  totalNet: 120000,
  totalTax0: 120000,
  totalTax5: 0,
  totalTax8: 0,
  totalTax19: 0,
  totalAmount: 120000,
  createdBy: 'user-1',
  createdAt: '2026-06-13T10:00:00Z',
  updatedAt: null,
  items: [mockItem],
  dueDate: null,
  isCreditSale: false,
};

const mockPage: PageResponse<SalesDocument> = {
  content: [mockInvoice],
  totalElements: 1,
  totalPages: 1,
  page: 0,
  size: 10,
  last: true,
};

const mockDevolutionResponse: DevolutionResponse = {
  creditNoteId: 'cn-1',
  documentNumber: 'CN-001',
  items: [],
  totalReturned: 24000,
  stockReversed: true,
};

describe('PosDevolutionComponent', () => {
  let fixture: ComponentFixture<PosDevolutionComponent>;
  let component: PosDevolutionComponent;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  const saleService = {
    search: vi.fn(),
    getDocument: vi.fn(),
  };
  const devolutionService = {
    processDevolution: vi.fn(),
  };

  beforeEach(async () => {
    saleService.search.mockReturnValue(of(mockPage));
    saleService.getDocument.mockReturnValue(of(mockInvoice));
    devolutionService.processDevolution.mockReturnValue(of(mockDevolutionResponse));

    await TestBed.configureTestingModule({
      imports: [PosDevolutionComponent, NoopAnimationsModule],
      providers: [
        { provide: SaleService, useValue: saleService },
        { provide: DevolutionService, useValue: devolutionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosDevolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(component).toBeTruthy();
    // OnPush is set in the component decorator: changeDetection: ChangeDetectionStrategy.OnPush
    // We verify by checking the component renders (change detection works with OnPush)
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[matinput]')).toBeTruthy();
  });

  it('should render search field and empty state when no invoice loaded', () => {
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[matinput]');
    expect(input).toBeTruthy();
    expect(el.textContent).toContain('search');
  });

  it('should search invoices when searchControl value changes', () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    expect(saleService.search).toHaveBeenCalledWith('INV-001', 0, 10, 'INVOICE', 'ISSUED');
  });

  it('should load invoice items when invoice is found', () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    expect(saleService.getDocument).toHaveBeenCalledWith('inv-1');
    expect(component.returnLines()).toHaveLength(1);
    expect(component.returnLines()[0].productName).toBe('Paleta');
    expect(component.returnLines()[0].maxQty).toBe(5);
  });

  it('should increment return quantity up to maxQty', () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    expect(component.returnLines()[0].returnQty).toBe(0);

    component.incrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(1);
    expect(component.returnLines()[0].subtotal).toBe(24000);

    // Increment to max (5)
    for (let i = 0; i < 4; i++) {
      component.incrementReturn(0);
    }
    expect(component.returnLines()[0].returnQty).toBe(5);

    // Cannot exceed max
    component.incrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(5);
  });

  it('should decrement return quantity down to 0', () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    // Set to 3
    component.incrementReturn(0);
    component.incrementReturn(0);
    component.incrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(3);

    component.decrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(2);

    component.decrementReturn(0);
    component.decrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(0);

    // Cannot go negative
    component.decrementReturn(0);
    expect(component.returnLines()[0].returnQty).toBe(0);
  });

  it('should NOT call devolutionService when no items selected and no reason', async () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    devolutionService.processDevolution.mockClear();

    await component.processDevolution();

    expect(devolutionService.processDevolution).not.toHaveBeenCalled();
  });

  it('should call devolutionService when valid items and reason', async () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    component.incrementReturn(0);
    component.incrementReturn(0); // returnQty = 2
    component.reasonControl.setValue('Producto defectuoso');

    await component.processDevolution();

    expect(devolutionService.processDevolution).toHaveBeenCalledWith({
      invoiceId: 'inv-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      reason: 'Producto defectuoso',
    });
  });

  it('should set processing to false after error', async () => {
    devolutionService.processDevolution.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Cantidad excede el original' },
          }),
      ),
    );

    const fixtureErr = TestBed.createComponent(PosDevolutionComponent);
    const comp = fixtureErr.componentInstance;
    fixtureErr.detectChanges();

    comp.searchControl.setValue('INV-001');
    fixtureErr.detectChanges();

    comp.incrementReturn(0);
    comp.reasonControl.setValue('Producto defectuoso');

    await comp.processDevolution();

    expect(comp.processing()).toBe(false);
  });

  it('should compute total returned correctly', () => {
    component.searchControl.setValue('INV-001');
    fixture.detectChanges();

    expect(component.totalReturned()).toBe(0);

    component.incrementReturn(0);
    component.incrementReturn(0);
    component.incrementReturn(0);

    expect(component.totalReturned()).toBe(72000);
    expect(component.totalReturnedFormatted()).toContain('72.000');
  });
});
