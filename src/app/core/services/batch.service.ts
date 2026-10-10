import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { Batch, BatchRequest, BatchStatus } from '../models/batch.model';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/batches';

  readonly page = signal(0);
  readonly status = signal<BatchStatus | null>(null);

  private buildParams(page: number, size: number, status?: BatchStatus | null): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });

    if (status) {
      params.set('status', status);
    }

    return params.toString();
  }

  private requestPage(
    page: number,
    size: number,
    status?: BatchStatus | null,
  ): Observable<PageResponse<Batch>> {
    return this.http.get<PageResponse<Batch>>(
      `${this.base}?${this.buildParams(page, size, status)}`,
    );
  }

  private emptyPage(page: number, size: number): PageResponse<Batch> {
    return {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  readonly batches = httpResource<PageResponse<Batch>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), 20, this.status())}`;
  });

  list(page = 0, size = 20, status?: BatchStatus | null): Observable<PageResponse<Batch>> {
    return this.requestPage(page, size, status);
  }

  listProcessable(size = 100): Observable<Batch[]> {
    return forkJoin([
      this.requestPage(0, size, 'OPEN').pipe(catchError(() => of(this.emptyPage(0, size)))),
      this.requestPage(0, size, 'PROCESSING').pipe(catchError(() => of(this.emptyPage(0, size)))),
    ]).pipe(
      map((pages) => {
        const dedupedBatches = new Map<string, Batch>();

        pages.forEach((page) => {
          page.content
            .filter((b) => b.batchType !== 'CHILD')
            .forEach((batch) => {
              if (!dedupedBatches.has(batch.id)) {
                dedupedBatches.set(batch.id, batch);
              }
            });
        });

        return Array.from(dedupedBatches.values()).sort((a, b) => {
          const expA = a.expirationDate ?? '9999-12-31';
          const expB = b.expirationDate ?? '9999-12-31';
          if (expA !== expB) return expA.localeCompare(expB);
          return a.entryDate.localeCompare(b.entryDate);
        });
      }),
    );
  }

  create(request: BatchRequest): Observable<Batch> {
    return this.http.post<Batch>(this.base, request);
  }

  getById(id: string): Observable<Batch> {
    return this.http.get<Batch>(`${this.base}/${id}`);
  }

  listChildren(parentId: string): Observable<Batch[]> {
    return this.http.get<Batch[]>(`${this.base}/${parentId}/children`);
  }

  updateStatus(id: string, status: BatchStatus): Observable<Batch> {
    return this.http.patch<Batch>(`${this.base}/${id}/status?status=${status}`, null);
  }

  reload(): void {
    this.batches.reload();
  }
}
