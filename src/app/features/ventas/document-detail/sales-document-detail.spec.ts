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
