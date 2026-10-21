import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WarehouseAccessService } from './warehouse-access.service';
import type { ReceiptResponse } from '../models/logistics.model';
import type { TransferResponse } from '../models/transfer.model';

const ENDPOINT = '/api/v1/me/warehouses';

function makeTransfer(overrides: Partial<TransferResponse> = {}): TransferResponse {
  return {
    id: 'tr-1',
    sourceWarehouseId: 'wh-1',
    targetWarehouseId: 'wh-2',
    status: 'DRAFT',
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    confirmedBy: null,
    confirmedAt: null,
    items: [],
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<ReceiptResponse> = {}): ReceiptResponse {
  return {
    id: 'rc-1',
    receiptNumber: 'REC-0001',
    receiptDate: '2026-01-01',
    warehouseId: 'wh-2',
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  };
}

describe('WarehouseAccessService', () => {
  let service: WarehouseAccessService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WarehouseAccessService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WarehouseAccessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('allows every operation for unrestricted access with no warehouse ids', () => {
    const results: boolean[] = [];

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    service
      .canOperateTransfer({ operation: 'confirm', transfer: makeTransfer() })
      .subscribe((v) => results.push(v));
    service
      .canOperateTransfer({ operation: 'cancel', transfer: makeTransfer() })
      .subscribe((v) => results.push(v));
    service.canOperateReceipt(null).subscribe((v) => results.push(v));
    service.canOperateReceipt(makeReceipt()).subscribe((v) => results.push(v));

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: true, warehouseIds: [] });

    expect(results).toEqual([true, true, true, true, true]);
  });

  it('requires target warehouse membership to confirm a transfer', () => {
    const results: boolean[] = [];

    service
      .canOperateTransfer({
        operation: 'confirm',
        transfer: makeTransfer({ targetWarehouseId: 'wh-2' }),
      })
      .subscribe((v) => results.push(v));
    service
      .canOperateTransfer({
        operation: 'confirm',
        transfer: makeTransfer({ targetWarehouseId: 'wh-9' }),
      })
      .subscribe((v) => results.push(v));

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: ['wh-2'] });

    expect(results).toEqual([true, false]);
  });

  it('requires source warehouse membership to cancel a transfer', () => {
    const results: boolean[] = [];

    service
      .canOperateTransfer({
        operation: 'cancel',
        transfer: makeTransfer({ sourceWarehouseId: 'wh-1' }),
      })
      .subscribe((v) => results.push(v));
    service
      .canOperateTransfer({
        operation: 'cancel',
        transfer: makeTransfer({ sourceWarehouseId: 'wh-9' }),
      })
      .subscribe((v) => results.push(v));

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: ['wh-1'] });

    expect(results).toEqual([true, false]);
  });

  it('requires at least one warehouse to create a transfer or a receipt', () => {
    const results: boolean[] = [];

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    service.canOperateReceipt(null).subscribe((v) => results.push(v));

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: ['wh-1'] });

    expect(results).toEqual([true, true]);
  });

  it('denies creation without membership and denies unknown transfers', () => {
    const results: boolean[] = [];

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    service.canOperateReceipt(null).subscribe((v) => results.push(v));
    service.canOperateTransfer({ operation: 'confirm' }).subscribe((v) => results.push(v));
    service.canOperateTransfer({ operation: 'cancel', transfer: null }).subscribe((v) =>
      results.push(v),
    );

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: [] });

    expect(results).toEqual([false, false, false, false]);
  });

  it('requires receipt warehouse membership for existing receipts', () => {
    const results: boolean[] = [];

    service.canOperateReceipt(makeReceipt({ warehouseId: 'wh-2' })).subscribe((v) =>
      results.push(v),
    );
    service.canOperateReceipt(makeReceipt({ warehouseId: 'wh-9' })).subscribe((v) =>
      results.push(v),
    );

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: ['wh-2'] });

    expect(results).toEqual([true, false]);
  });

  it('fails closed when the warehouse access request fails', () => {
    const results: boolean[] = [];

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    service.canOperateReceipt(null).subscribe((v) => results.push(v));

    httpMock
      .expectOne(ENDPOINT)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(results).toEqual([false, false]);

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    httpMock.expectNone(ENDPOINT);
    expect(results).toEqual([false, false, false]);
  });

  it('fetches warehouse access once for repeated calls', () => {
    const results: boolean[] = [];

    service.getAccess().subscribe();
    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    service
      .canOperateTransfer({ operation: 'confirm', transfer: makeTransfer() })
      .subscribe((v) => results.push(v));
    service.canOperateReceipt(makeReceipt()).subscribe((v) => results.push(v));

    httpMock.expectOne(ENDPOINT).flush({ unrestricted: false, warehouseIds: ['wh-2'] });

    service.canOperateTransfer({ operation: 'create' }).subscribe((v) => results.push(v));
    httpMock.expectNone(ENDPOINT);

    expect(results).toEqual([true, true, true, true]);
  });
});
