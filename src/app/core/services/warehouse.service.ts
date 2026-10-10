import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Warehouse, WarehouseType } from '../models/warehouse.model';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly base = '/api/v1/warehouses';
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly warehouses = httpResource<Warehouse[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined,
  );

  listAll(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.base);
  }

  search(query: string): Observable<Warehouse[]> {
    const params = new URLSearchParams({ query });
    return this.http.get<Warehouse[]>(`${this.base}/search?${params.toString()}`);
  }

  getById(id: string): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.base}/${id}`);
  }

  create(name: string, warehouseType: WarehouseType, location?: string): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.base, {
      name,
      warehouseType,
      location: location?.trim() ? location.trim() : null,
    });
  }

  update(
    id: string,
    name: string,
    warehouseType: WarehouseType,
    location?: string,
  ): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.base}/${id}`, {
      name,
      warehouseType,
      location: location?.trim() ? location.trim() : null,
    });
  }

  reload(): void {
    this.warehouses.reload();
  }
}
