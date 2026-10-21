import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { ElectronicInvoiceService } from '../../../core/services/electronic-invoice.service';
import { SaleService } from '../../../core/services/sale.service';
import { SalesDocumentDetailComponent } from './sales-document-detail';

describe('SalesDocumentDetailComponent', () => {
  const saleService = { getDocument: vi.fn(), reload: vi.fn() };
  const router = { navigate: vi.fn() };
  const electronicInvoiceService = {
    getBySalesDocument: vi.fn(() => of(null)),
    retry: vi.fn(),
  };

  beforeEach(() => {
    saleService.getDocument.mockReset();
    router.navigate.mockReset();

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
      ],
    });
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
