import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { Desposte, ManualDesposteRequest, ManualDesposteResult } from '../models/desposte.model';
import type { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class DesposteService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/despostes';

  processManual(request: ManualDesposteRequest): Observable<ManualDesposteResult> {
    return this.http.post<ManualDesposteResult>(`${this.base}/manual`, request);
  }

  /** Lists persisted despostes; `from`/`to` are only sent when provided. */
  list(
    from?: string,
    to?: string,
    page = 0,
    size = 20,
  ): Observable<PageResponse<Desposte>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<PageResponse<Desposte>>(this.base, { params });
  }

  getById(id: string): Observable<Desposte> {
    return this.http.get<Desposte>(`${this.base}/${id}`);
  }
}
