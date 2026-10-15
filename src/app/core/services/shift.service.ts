import { Injectable, inject, signal, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  Shift,
  ShiftRequest,
  CashCountRequest,
  CashCountResponse,
  RegisterCashCountRequest,
} from '../models/shift.model';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly base = '/api/v1/shifts';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly query = signal('');

  private buildSearchParams(query: string, page: number, size: number): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set('search', trimmedQuery);
    }

    return params.toString();
  }

  readonly shifts = httpResource<PageResponse<Shift>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    const params = this.buildSearchParams(this.query(), this.page(), this.pageSize());

    return `${this.base}?${params}`;
  });

  search(query: string, page = 0, size = 20): Observable<PageResponse<Shift>> {
    const params = this.buildSearchParams(query, page, size);
    return this.http.get<PageResponse<Shift>>(`${this.base}?${params}`);
  }

  getById(id: string): Observable<Shift> {
    return this.http.get<Shift>(`${this.base}/${id}`);
  }

  getActive(cashRegisterId: string): Observable<Shift> {
    return this.http.get<Shift>(`${this.base}/active`, {
      params: { cashRegisterId },
    });
  }

  open(request: ShiftRequest): Observable<Shift> {
    return this.http.post<Shift>(`${this.base}/open`, request);
  }

  close(id: string, cashCount: CashCountRequest): Observable<Shift> {
    return this.http.post<Shift>(`${this.base}/${id}/close`, cashCount);
  }

  getZReport(id: string): Observable<string> {
    return this.http.get(`${this.base}/${id}/z-report`, { responseType: 'text' });
  }

  saveCashCount(
    shiftId: string,
    request: RegisterCashCountRequest,
  ): Observable<CashCountResponse> {
    return this.http.post<CashCountResponse>(`${this.base}/${shiftId}/cash-counts`, request);
  }

  // Cash-count history for a shift, newest first. The injector is passed explicitly so this
  // factory can be called outside an injection context (e.g. after an async shift load).
  readonly cashCounts = (shiftId: string) =>
    httpResource<CashCountResponse[]>(
      () =>
        isPlatformBrowser(this.platformId) && shiftId
          ? `${this.base}/${shiftId}/cash-counts`
          : undefined,
      { injector: this.injector },
    );

  reload(): void {
    this.shifts.reload();
  }
}
