import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PageEvent } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RetencionListComponent, RetencionEntry } from './retencion-list';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import type { ThirdPartySupplierOption } from '../../../../core/models/third-party.model';
import type { PageResponse } from '../../../../core/models/page.model';

const supplier: ThirdPartySupplierOption = {
  id: 'sup-1',
  name: 'Proveedor Uno',
  lastName: null,
  numIdentification: '900123456',
  type: 'SUPPLIER',
  active: true,
};

const entry: RetencionEntry = {
  supplierId: 'sup-1',
  supplierName: 'Proveedor Uno',
  invoiceCount: 3,
  retentionTotal: 150000,
};

function page<T>(content: T[]): PageResponse<T> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  };
}

function pageEvent(pageIndex: number, pageSize: number): PageEvent {
  return { pageIndex, pageSize, length: 100, previousPageIndex: 0 };
}

describe('RetencionListComponent', () => {
  let fixture: ComponentFixture<RetencionListComponent>;
  let component: RetencionListComponent;
  let httpMock: HttpTestingController;

  const suppliers = signal<ThirdPartySupplierOption[]>([supplier]);
  const thirdPartyService = {
    supplierOptions: { value: suppliers, isLoading: signal(false) },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetencionListComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ThirdPartyService, useValue: thirdPartyService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RetencionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  function flushRetenciones(
    content: RetencionEntry[],
    url = '/api/v1/retenciones?page=0&size=20',
  ): void {
    httpMock.expectOne(url).flush(page(content));
    fixture.detectChanges();
  }

  it('loads the retenciones on init and renders the aggregated rows', () => {
    flushRetenciones([entry]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.data()?.content).toEqual([entry]);
    expect(text).toContain('Proveedor Uno');
    expect(text).toContain('3');
    expect(text).not.toContain('No hay retenciones que coincidan con el filtro.');
  });

  it('renders the empty filtered state when there are no matching retenciones', () => {
    flushRetenciones([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.data()?.content).toEqual([]);
    expect(text).toContain('No hay retenciones que coincidan con el filtro.');
  });

  it('sends supplierId and period as query params when the filters are set', () => {
    flushRetenciones([entry]);

    component.filterForm.controls.supplierId.setValue('sup-1');
    component.filterForm.controls.period.setValue('2026-05');
    component.loadData();

    httpMock
      .expectOne('/api/v1/retenciones?page=0&size=20&supplierId=sup-1&period=2026-05')
      .flush(page([entry]));
    expect(component.loading()).toBe(false);
  });

  it('selects a supplier from the autocomplete and reloads with its id', () => {
    flushRetenciones([entry]);

    component.onSupplierSelected({
      option: { value: 'sup-1', viewValue: 'Proveedor Uno (900123456)' },
    } as unknown as MatAutocompleteSelectedEvent);

    expect(component.filterForm.controls.supplierId.getRawValue()).toBe('sup-1');
    expect(component.supplierDisplay.getRawValue()).toBe('Proveedor Uno (900123456)');

    component.loadData();
    httpMock.expectOne('/api/v1/retenciones?page=0&size=20&supplierId=sup-1').flush(page([entry]));
  });

  it('clears the supplier filter and reloads without the supplierId param', () => {
    flushRetenciones([entry]);

    component.filterForm.controls.supplierId.setValue('sup-1');
    component.supplierDisplay.setValue('Proveedor Uno (900123456)');

    component.clearSupplier();

    expect(component.filterForm.controls.supplierId.getRawValue()).toBe('');
    expect(component.supplierDisplay.getRawValue()).toBe('');
    httpMock.expectOne('/api/v1/retenciones?page=0&size=20').flush(page([entry]));
  });

  it('resets to the first page when the page size changes', () => {
    flushRetenciones([entry]);

    component.onPageChange(pageEvent(2, 10));

    expect(component.page()).toBe(0);
    expect(component.pageSize()).toBe(10);
    httpMock.expectOne('/api/v1/retenciones?page=0&size=10').flush(page([entry]));
  });

  it('requests the selected page while keeping the page size', () => {
    flushRetenciones([entry]);

    component.onPageChange(pageEvent(2, 20));

    expect(component.page()).toBe(2);
    expect(component.pageSize()).toBe(20);
    httpMock.expectOne('/api/v1/retenciones?page=2&size=20').flush(page([entry]));
  });

  it('renders the error state when the retenciones request fails', () => {
    httpMock
      .expectOne('/api/v1/retenciones?page=0&size=20')
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar las retenciones.');
    expect(text).toContain('Error al cargar las retenciones.');
  });

  it('builds the supplier autocomplete label with the full name and identification', () => {
    flushRetenciones([]);

    expect(component.supplierLabel(supplier)).toBe('Proveedor Uno (900123456)');
    expect(component.supplierLabel({ ...supplier, lastName: 'Pérez' })).toBe(
      'Proveedor Uno Pérez (900123456)',
    );
  });
});
