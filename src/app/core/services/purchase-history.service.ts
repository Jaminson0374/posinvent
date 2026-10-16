import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';

/**
 * Timeline entry as returned by PurchaseHistoryController.PurchaseHistoryEntry.
 * The backend merges purchase orders, goods receipts, supplier invoices and payments
 * into a single chronological feed.
 */
export interface PurchaseHistoryEntry {
  eventType: string;
  documentId: string;
  supplierId: string | null;
  supplierName: string;
  description: string;
  status: string;
  amount: number | null;
  eventTimestamp: string;
}

export interface PurchaseHistoryFilters {
  from?: string | null;
  to?: string | null;
  supplierId?: string | null;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PurchaseHistoryService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/purchase-history';

  list(filters: PurchaseHistoryFilters = {}): Observable<PageResponse<PurchaseHistoryEntry>> {
    const params = new URLSearchParams({
      page: `${filters.page ?? 0}`,
      size: `${filters.size ?? 20}`,
    });

    if (filters.from) {
      params.set('from', filters.from);
    }
    if (filters.to) {
      params.set('to', filters.to);
    }
    if (filters.supplierId) {
      params.set('supplierId', filters.supplierId);
    }

    return this.http.get<PageResponse<PurchaseHistoryEntry>>(
      `${this.base}?${params.toString()}`,
    );
  }
}
