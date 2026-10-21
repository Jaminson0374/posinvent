import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';

import type { SalesDocument } from '../models/sale.model';
import { SaleService } from '../services/sale.service';
import { SalesDocumentPermissionService } from './sales-document-permission.service';
import { salesDocumentOperateGuard } from './sales-document-operate.guard';

function makeDocument(overrides: Partial<SalesDocument> = {}): SalesDocument {
  return {
    id: 'doc-1',
    type: 'QUOTE',
    status: 'DRAFT',
    documentNumber: 'COT-0001',
    clientId: 'client-1',
    clientName: 'Cliente',
    warehouseId: 'wh-1',
    shiftId: 'shift-1',
    cashRegisterId: null,
    sourceDocumentId: null,
    totalNet: 0,
    totalTax0: 0,
    totalTax5: 0,
    totalTax19: 0,
    totalAmount: 0,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    items: [],
    dueDate: null,
    isCreditSale: false,
    ...overrides,
  };
}

function routeWithId(id: string | null): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(id ? { id } : {}),
  } as ActivatedRouteSnapshot;
}

const state = {} as RouterStateSnapshot;

describe('salesDocumentOperateGuard', () => {
  let router: Router;
  const saleService = { getDocument: vi.fn() };
  const permissionService = { canOperate: vi.fn() };

  beforeEach(() => {
    saleService.getDocument.mockReset();
    permissionService.canOperate.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SaleService, useValue: saleService },
        { provide: SalesDocumentPermissionService, useValue: permissionService },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('allows navigation when the route has no id', () => {
    const result = TestBed.runInInjectionContext(() =>
      salesDocumentOperateGuard(routeWithId(null), state),
    );

    expect(result).toBe(true);
    expect(saleService.getDocument).not.toHaveBeenCalled();
  });

  it('allows navigation when the user may operate the document', async () => {
    saleService.getDocument.mockReturnValue(of(makeDocument()));
    permissionService.canOperate.mockReturnValue(of(true));

    const result = TestBed.runInInjectionContext(() =>
      salesDocumentOperateGuard(routeWithId('doc-1'), state),
    );

    await expect(firstValueFrom(result as never)).resolves.toBe(true);
    expect(saleService.getDocument).toHaveBeenCalledWith('doc-1');
  });

  it('redirects to the read-only detail when the user may not operate', async () => {
    saleService.getDocument.mockReturnValue(of(makeDocument()));
    permissionService.canOperate.mockReturnValue(of(false));

    const result = TestBed.runInInjectionContext(() =>
      salesDocumentOperateGuard(routeWithId('doc-1'), state),
    );

    const tree = await firstValueFrom(result as never);

    expect(tree).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(tree as UrlTree)).toBe('/ventas/documentos/doc-1');
  });

  it('redirects to the sales list when loading the document fails with 403', async () => {
    saleService.getDocument.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const result = TestBed.runInInjectionContext(() =>
      salesDocumentOperateGuard(routeWithId('doc-1'), state),
    );

    const tree = await firstValueFrom(result as never);

    expect(tree).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(tree as UrlTree)).toBe('/ventas/documentos');
  });
});
