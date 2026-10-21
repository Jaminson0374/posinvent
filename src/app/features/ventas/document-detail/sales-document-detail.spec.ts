import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { ElectronicInvoiceService } from '../../../core/services/electronic-invoice.service';
import { SaleService } from '../../../core/services/sale.service';
import { SalesDocumentDetailComponent } from './sales-document-detail';
import { SalesDocumentPermissionService } from '../../../core/auth/sales-document-permission.service';

describe('SalesDocumentDetailComponent', () => {
  const saleService = { getDocument: vi.fn(), reload: vi.fn() };
  const router = { navigate: vi.fn() };
  const electronicInvoiceService = {
    getBySalesDocument: vi.fn(),
    retry: vi.fn(),
  };

  beforeEach(() => {
    saleService.getDocument.mockReset();
    router.navigate.mockReset();
    electronicInvoiceService.getBySalesDocument.mockReset();
    electronicInvoiceService.getBySalesDocument.mockReturnValue(of(null));

    TestBed.configureTestingModule({
      imports: [SalesDocumentDetailComponent],
      providers: [
        { provide: SaleService, useValue: saleService },
        { provide: ElectronicInvoiceService, useValue: electronicInvoiceService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'doc-1' })) },
        },
        { provide: Router, useValue: router },
        { provide: HttpClient, useValue: {} },
        { provide: SalesDocumentPermissionService, useValue: { canOperate: () => of(true) } },
      ],
    });
  });

  it('renders the Siigo validation errors and correction action', () => {
    saleService.getDocument.mockReturnValue(
      of({
        id: 'doc-1',
        type: 'INVOICE',
        status: 'ISSUED',
        documentNumber: 'FV-1',
        clientId: 'client-1',
        clientName: 'Cliente',
        warehouseId: 'wh-1',
        shiftId: null,
        cashRegisterId: null,
        sourceDocumentId: null,
        totalNet: 0,
        totalTax0: 0,
        totalTax5: 0,
        totalTax19: 0,
        totalAmount: 0,
        createdBy: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        items: [],
        dueDate: null,
        isCreditSale: false,
      }),
    );
    electronicInvoiceService.getBySalesDocument.mockReturnValue(
      of({
        id: 'ei-1',
        salesDocumentId: 'doc-1',
        sourceDocumentId: null,
        cufe: null,
        qrCode: null,
        status: 'REJECTED_BY_DIAN',
        sentAt: null,
        responseAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        errors: [
          {
            code: 'validation_error',
            message: "El código postal '080001' no corresponde al municipio '08001'.",
            params: ['080001', '08001'],
            detail: 'Dian validation failed for customer address.',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(SalesDocumentDetailComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('código postal del cliente');
    expect(text).toContain('Corregir datos del cliente');
    expect(text).toContain('Reintentar emisión');
  });

  it('renders a friendly message for a provider postal-code rejection', () => {
    const component = TestBed.createComponent(SalesDocumentDetailComponent).componentInstance;

    expect(
      component.friendlyError({
        code: 'invalid_postal_code',
        message: 'raw provider message',
        params: ['customer.address.postal_code'],
        detail: null,
      }),
    ).toContain('código postal');
  });

  it('navigates to the client form to correct fiscal data', () => {
    const component = TestBed.createComponent(SalesDocumentDetailComponent).componentInstance;
    component.document.set({
      id: 'doc-1',
      clientId: 'client-1',
    } as never);

    component.correctClientData();

    expect(router.navigate).toHaveBeenCalledWith(['/ventas/clientes', 'client-1']);
  });

  it('redirects a 403 document load to the sales list instead of showing a broken detail', () => {
    saleService.getDocument.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const component = TestBed.createComponent(SalesDocumentDetailComponent).componentInstance;
    component.loadDocument('doc-1');

    expect(saleService.getDocument).toHaveBeenCalledWith('doc-1');
    expect(router.navigate).toHaveBeenCalledWith(['/ventas/documentos']);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });
});
