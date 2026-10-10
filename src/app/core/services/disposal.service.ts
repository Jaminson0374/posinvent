import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { DisposalRequest, DisposalResponse, ExpiringBatch } from '../models/disposal.model';
import type { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class DisposalService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/disposals';

  list(page = 0, size = 20): Observable<PageResponse<DisposalResponse>> {
    return this.http.get<PageResponse<DisposalResponse>>(`${this.base}?page=${page}&size=${size}`);
  }

  create(request: DisposalRequest): Observable<DisposalResponse> {
    return this.http.post<DisposalResponse>(this.base, request);
  }

  expiringSoon(days = 30): Observable<ExpiringBatch[]> {
    return this.http.get<ExpiringBatch[]>(`${this.base}/expiring-soon?days=${days}`);
  }
}
