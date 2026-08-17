import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PucAccount } from '../models/product-catalog.model';

export interface PucAccountRequest {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  accountClass: number;
  accountNature: string;
  allowsTransactions: boolean;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class PucAccountService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  readonly accountClass = signal<number | null>(null);

  readonly accounts = httpResource<PucAccount[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const cls = this.accountClass();
    return cls != null ? `/api/v1/puc-accounts?accountClass=${cls}` : '/api/v1/puc-accounts';
  });

  readonly incomeAccounts = httpResource<PucAccount[]>(() =>
    isPlatformBrowser(this.platformId) ? '/api/v1/puc-accounts?accountClass=4' : undefined,
  );

  readonly inventoryAccounts = httpResource<PucAccount[]>(() =>
    isPlatformBrowser(this.platformId) ? '/api/v1/puc-accounts?accountClass=1' : undefined,
  );

  readonly costAccounts = httpResource<PucAccount[]>(() =>
    isPlatformBrowser(this.platformId) ? '/api/v1/puc-accounts?accountClass=6' : undefined,
  );

  getById(id: string): Observable<PucAccount> {
    return this.http.get<PucAccount>(`/api/v1/puc-accounts/${id}`);
  }

  create(body: PucAccountRequest): Observable<PucAccount> {
    return this.http.post<PucAccount>('/api/v1/puc-accounts', body);
  }

  update(id: string, body: PucAccountRequest): Observable<PucAccount> {
    return this.http.put<PucAccount>(`/api/v1/puc-accounts/${id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/puc-accounts/${id}`);
  }

  checkCode(code: string): Observable<{ code: string; available: boolean }> {
    return this.http.get<{ code: string; available: boolean }>(
      `/api/v1/puc-accounts/check-code?code=${encodeURIComponent(code)}`,
    );
  }

  tree(search?: string): Observable<PucAccount[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<PucAccount[]>(`/api/v1/puc-accounts/tree${params}`);
  }
}
