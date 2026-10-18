import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { Product } from '../models/product.model';
import { SalesDocument } from '../models/sale.model';
import { DiscountType } from '../domain/discount';

export interface PaymentLine {
  method: string;
  amount: number;
}

export interface CheckoutRequest {
  orderId: string;
  cashRegisterId: string;
  shiftId: string;
  payments: PaymentLine[];
  documentDiscountType?: DiscountType;
  documentDiscountValue?: number;
  discountReason?: string | null;
  discountAuthorizationId?: string | null;
}

export interface CheckoutResponse {
  invoiceId: string;
  documentNumber: string;
  totalAmount: number;
  changeAmount: number;
}

/** Administrator credentials used to authorize a discount; never persisted. */
export interface DiscountAuthorizationRequest {
  username: string;
  password: string;
  cashRegisterId: string;
}

export interface DiscountAuthorizationResponse {
  authorizationId: string;
  expiresAt: string;
  authorizedBy: string;
}

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/pos';

  readonly searchQuery = signal('');

  readonly products = httpResource<PageResponse<Product>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    const q = this.searchQuery().trim();
    if (!q) return undefined;

    const params = new URLSearchParams({
      q,
      page: '0',
      size: '50',
    });

    return `${this.base}/products/search?${params.toString()}`;
  });

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.base}/checkout`, request);
  }

  /** Issues a single-use discount authorization token from admin credentials. */
  authorizeDiscount(
    request: DiscountAuthorizationRequest,
  ): Observable<DiscountAuthorizationResponse> {
    return this.http.post<DiscountAuthorizationResponse>(
      `${this.base}/discount-authorizations`,
      request,
    );
  }

  searchProducts(query: string): Observable<PageResponse<Product>> {
    const params = new URLSearchParams({
      q: query.trim(),
      page: '0',
      size: '50',
    });
    return this.http.get<PageResponse<Product>>(
      `${this.base}/products/search?${params.toString()}`,
    );
  }

  reloadProducts(): void {
    this.products.reload();
  }
}
