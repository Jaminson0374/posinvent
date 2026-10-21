import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';

import { WarehouseAccessService } from '../services/warehouse-access.service';
import { receiptCreateGuard, transferCreateGuard } from './warehouse-create.guard';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('warehouse create guards', () => {
  let router: Router;

  const warehouseAccess = {
    canOperateTransfer: vi.fn(),
    canOperateReceipt: vi.fn(),
  };

  beforeEach(() => {
    warehouseAccess.canOperateTransfer.mockReset();
    warehouseAccess.canOperateReceipt.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: WarehouseAccessService, useValue: warehouseAccess },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  function runTransferGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      transferCreateGuard(route, state),
    ) as Observable<boolean | UrlTree>;
  }

  function runReceiptGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      receiptCreateGuard(route, state),
    ) as Observable<boolean | UrlTree>;
  }

  describe('transferCreateGuard', () => {
    it('allows navigation when the user can create transfers', async () => {
      warehouseAccess.canOperateTransfer.mockReturnValue(of(true));

      await expect(firstValueFrom(runTransferGuard())).resolves.toBe(true);
      expect(warehouseAccess.canOperateTransfer).toHaveBeenCalledWith({ operation: 'create' });
    });

    it('redirects to the transfer list when the user has no warehouse membership', async () => {
      warehouseAccess.canOperateTransfer.mockReturnValue(of(false));

      const tree = await firstValueFrom(runTransferGuard());

      expect(tree).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(tree as UrlTree)).toBe('/inventario/traslados');
    });

    it('fails closed and redirects to the transfer list when the access check errors', async () => {
      warehouseAccess.canOperateTransfer.mockReturnValue(
        throwError(() => new Error('network')),
      );

      const tree = await firstValueFrom(runTransferGuard());

      expect(tree).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(tree as UrlTree)).toBe('/inventario/traslados');
    });
  });

  describe('receiptCreateGuard', () => {
    it('allows navigation when the user can create receipts', async () => {
      warehouseAccess.canOperateReceipt.mockReturnValue(of(true));

      await expect(firstValueFrom(runReceiptGuard())).resolves.toBe(true);
      expect(warehouseAccess.canOperateReceipt).toHaveBeenCalledWith(null);
    });

    it('redirects to the receipt list when the user has no warehouse membership', async () => {
      warehouseAccess.canOperateReceipt.mockReturnValue(of(false));

      const tree = await firstValueFrom(runReceiptGuard());

      expect(tree).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(tree as UrlTree)).toBe('/logistica/recepciones');
    });

    it('fails closed and redirects to the receipt list when the access check errors', async () => {
      warehouseAccess.canOperateReceipt.mockReturnValue(
        throwError(() => new Error('network')),
      );

      const tree = await firstValueFrom(runReceiptGuard());

      expect(tree).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(tree as UrlTree)).toBe('/logistica/recepciones');
    });
  });
});
