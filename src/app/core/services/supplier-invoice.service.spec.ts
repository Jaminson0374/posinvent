import '@angular/compiler';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { SupplierInvoiceService } from './supplier-invoice.service';
import type { SupplierBalance } from '../models/supplier-invoice.model';

describe('SupplierInvoiceService.getBalance()', () => {
  let service: SupplierInvoiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupplierInvoiceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupplierInvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs the net supplier position and maps payable, advance and net amounts', () => {
    const body: SupplierBalance = {
      supplierId: 'sup-1',
      payableOutstanding: 600,
      advanceBalance: 1000,
      netPosition: -400,
    };

    service.getBalance('sup-1').subscribe((balance) => {
      expect(balance).toEqual(body);
      expect(balance.netPosition).toBe(-400);
    });

    const req = httpMock.expectOne('/api/v1/suppliers/sup-1/balance');
    expect(req.request.method).toBe('GET');
    req.flush(body);
  });
});
