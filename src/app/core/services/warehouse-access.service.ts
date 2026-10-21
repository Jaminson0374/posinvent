import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import type { ReceiptResponse } from '../models/logistics.model';
import type { TransferResponse } from '../models/transfer.model';

export interface WarehouseAccess {
  unrestricted: boolean;
  warehouseIds: string[];
}

export interface TransferOperationInput {
  operation: 'create' | 'confirm' | 'cancel';
  transfer?: TransferResponse | null;
}

/**
 * Warehouse membership rules for logistics operations.
 *
 * Mirrors the backend guard: ADMIN (`unrestricted`) may operate everywhere, while other users
 * are limited to the warehouses the backend reports for them. The access set is fetched once and
 * shared so rendering many action buttons triggers a single request. Failures fail closed.
 */
@Injectable({ providedIn: 'root' })
export class WarehouseAccessService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/v1/me/warehouses';
  private access$?: Observable<WarehouseAccess>;

  getAccess(): Observable<WarehouseAccess> {
    if (!this.access$) {
      this.access$ = this.http.get<WarehouseAccess>(this.endpoint).pipe(
        catchError(() => of<WarehouseAccess>({ unrestricted: false, warehouseIds: [] })),
        shareReplay(1),
      );
    }
    return this.access$;
  }

  canOperateTransfer(input: TransferOperationInput): Observable<boolean> {
    return this.getAccess().pipe(
      map((access) => {
        switch (input.operation) {
          case 'create':
            return access.unrestricted || access.warehouseIds.length > 0;
          case 'confirm':
            if (!input.transfer) return false;
            return (
              access.unrestricted || access.warehouseIds.includes(input.transfer.targetWarehouseId)
            );
          case 'cancel':
            if (!input.transfer) return false;
            return (
              access.unrestricted || access.warehouseIds.includes(input.transfer.sourceWarehouseId)
            );
          default:
            return false;
        }
      }),
    );
  }

  canOperateReceipt(receipt: ReceiptResponse | null): Observable<boolean> {
    return this.getAccess().pipe(
      map((access) => {
        if (access.unrestricted) return true;
        if (!receipt) return access.warehouseIds.length > 0;
        return access.warehouseIds.includes(receipt.warehouseId);
      }),
    );
  }
}
