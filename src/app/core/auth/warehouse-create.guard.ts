import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of, take } from 'rxjs';

import { WarehouseAccessService } from '../services/warehouse-access.service';

function warehouseCreateGuard(
  canCreate: (access: WarehouseAccessService) => Observable<boolean>,
  redirectTo: string,
): CanActivateFn {
  return () => {
    const warehouseAccess = inject(WarehouseAccessService);
    const router = inject(Router);
    const denied = () => router.createUrlTree([redirectTo]);

    return canCreate(warehouseAccess).pipe(
      map((allowed) => (allowed ? true : denied())),
      catchError(() => of(denied())),
      take(1),
    );
  };
}

/**
 * Prevents mounting the transfer form for users without any warehouse membership.
 * Backend authorization remains the security boundary; this guard only keeps the UX consistent.
 */
export const transferCreateGuard = warehouseCreateGuard(
  (access) => access.canOperateTransfer({ operation: 'create' }),
  '/inventario/traslados',
);

/**
 * Prevents mounting the receipt form for users without any warehouse membership.
 * Existing receipts stay readable through their detail route.
 */
export const receiptCreateGuard = warehouseCreateGuard(
  (access) => access.canOperateReceipt(null),
  '/logistica/recepciones',
);
