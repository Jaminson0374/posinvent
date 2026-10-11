import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import type { DianResolution, DianResolutionRequest } from '../models/dian.model';
import type { ElectronicInvoice } from '../models/dian.model';
import type { DigitalCertificate } from '../models/dian.model';
import type { DianDashboardSummary } from '../models/dian.model';

@Injectable({ providedIn: 'root' })
export class DianService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Resoluciones DIAN ──
  readonly resolutions = httpResource<DianResolution[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/admin/dian-resolutions';
  });

  getResolution(id: string): Observable<DianResolution> {
    return this.http.get<DianResolution>(`/api/v1/admin/dian-resolutions/${id}`);
  }

  createResolution(request: DianResolutionRequest): Observable<DianResolution> {
    return this.http.post<DianResolution>('/api/v1/admin/dian-resolutions', request);
  }

  updateResolution(id: string, request: DianResolutionRequest): Observable<DianResolution> {
    return this.http.put<DianResolution>(`/api/v1/admin/dian-resolutions/${id}`, request);
  }

  activateResolution(id: string): Observable<DianResolution> {
    return this.http.post<DianResolution>(`/api/v1/admin/dian-resolutions/${id}/activate`, {});
  }

  deactivateResolution(id: string): Observable<DianResolution> {
    return this.http.post<DianResolution>(`/api/v1/admin/dian-resolutions/${id}/deactivate`, {});
  }

  deleteResolution(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/dian-resolutions/${id}`);
  }

  // ── Certificados ──
  readonly certificates = httpResource<DigitalCertificate[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/admin/certificates';
  });

  uploadCertificate(file: File, password: string, name: string): Observable<DigitalCertificate> {
    const formData = new FormData();
    formData.append('file', file);
    if (password) formData.append('password', password);
    if (name) formData.append('name', name);
    return this.http.post<DigitalCertificate>('/api/v1/admin/certificates', formData);
  }

  deleteCertificate(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/certificates/${id}`);
  }

  // ── Facturas electrónicas ──
  readonly electronicInvoices = httpResource<ElectronicInvoice[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/admin/electronic-invoices?page=0&size=50';
  });

  getElectronicInvoice(id: string): Observable<ElectronicInvoice> {
    return this.http.get<ElectronicInvoice>(`/api/v1/admin/electronic-invoices/${id}`);
  }

  getElectronicInvoiceByDocument(salesDocumentId: string): Observable<ElectronicInvoice> {
    return this.http.get<ElectronicInvoice>(
      `/api/v1/admin/electronic-invoices/by-document/${salesDocumentId}`,
    );
  }

  retryInvoice(id: string): Observable<string> {
    return this.http.post<string>(`/api/v1/admin/electronic-invoices/${id}/retry`, {});
  }

  // ── Dashboard DIAN ──
  readonly dianDashboard = httpResource<DianDashboardSummary>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/dashboard/dian-summary';
  });
}
