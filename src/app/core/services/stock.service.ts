import { Injectable, inject, signal, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { InventoryStock } from '../models/stock.model';

export interface AvailableBatch {
  batchId: string;
  expirationDate: string | null;
  availableQuantity: number;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly base       = '/api/v1/stock';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector   = inject(Injector);

  readonly selectedWarehouseId = signal<string | null>(null);

  readonly stockByWarehouse = httpResource<InventoryStock[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const wid = this.selectedWarehouseId();
    return wid ? `${this.base}/warehouse/${wid}` : undefined;
  });

  readonly stockByBatch = (batchId: string) =>
    httpResource<InventoryStock[]>(() =>
      isPlatformBrowser(this.platformId) ? `${this.base}/batch/${batchId}` : undefined
    );

  // Available batches for a product/warehouse pair, returned by the API in FEFO order.
  // The injector is passed explicitly so this factory can be called outside an injection context.
  readonly availableBatches = (productId: string, warehouseId: string) =>
    httpResource<AvailableBatch[]>(
      () => {
        if (!isPlatformBrowser(this.platformId)) return undefined;
        if (!productId || !warehouseId) return undefined;
        const params = new URLSearchParams({ productId, warehouseId });
        return `${this.base}/available?${params.toString()}`;
      },
      { injector: this.injector },
    );
}
