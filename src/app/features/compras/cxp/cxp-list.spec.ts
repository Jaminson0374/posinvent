import '@angular/compiler';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';

import { CxpListComponent } from './cxp-list';
import type { AccountsPayable, ApAgingResponse } from '../../../core/models/accounts-payable.model';
import type { PageResponse } from '../../../core/models/page.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const payableOpen: AccountsPayable = {
  id: 'ap-1',
  supplierId: 'sup-1',
  supplierName: 'Proveedor Uno',
  documentId: 'inv-1',
  debitCreditNoteId: null,
  totalAmount: 1000000,
  paidAmount: 250000,
  outstanding: 750000,
  dueDate: '2026-12-31',
  status: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const payablePaid: AccountsPayable = {
  id: 'ap-2',
  supplierId: 'sup-2',
  supplierName: 'Proveedor Dos',
  documentId: 'inv-2',
  debitCreditNoteId: null,
  totalAmount: 500000,
  paidAmount: 500000,
  outstanding: 0,
  dueDate: '2026-02-01',
  status: 'PAID',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
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

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('CxpListComponent', () => {
  let fixture: ComponentFixture<CxpListComponent>;
  let component: CxpListComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CxpListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    fixture = TestBed.createComponent(CxpListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  async function flushPayables(payables: AccountsPayable[]): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/accounts-payable').flush(page(payables));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads the accounts payable and renders supplier, outstanding and status', async () => {
    await flushPayables([payableOpen, payablePaid]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.payables()).toHaveLength(2);
    expect(text).toContain('Proveedor Uno');
    expect(text).toContain('Proveedor Dos');
    expect(text).toContain('Abierto');
    expect(text).toContain('Pagado');
    expect(text).not.toContain('No se encontraron cuentas por pagar.');
  });

  it('renders the empty state when the backend returns no accounts', async () => {
    await flushPayables([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.payables()).toHaveLength(0);
    expect(text).toContain('No se encontraron cuentas por pagar.');
  });

  it('renders the error state when the accounts request fails', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne('/api/v1/accounts-payable')
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.err()).toBeTruthy();
    expect(text).toContain('Error al cargar cuentas por pagar.');
  });

  it('loads and renders the aging summary with buckets and the overall total', async () => {
    await flushPayables([payableOpen]);

    const aging: ApAgingResponse = {
      buckets: [
        { label: 'Corriente', count: 1, totalOutstanding: 750000 },
        { label: '1-30 días', count: 2, totalOutstanding: 500000 },
      ],
      overallTotal: 1250000,
    };

    component.loadAging();
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/accounts-payable/aging').flush(aging);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.aging()).toEqual(aging);
    expect(component.agingLoading()).toBe(false);
    expect(text).toContain('Corriente');
    expect(text).toContain('1-30 días');
    expect(text).toContain('1 CxP');
    expect(text).toContain('2 CxP');
  });

  it('keeps aging hidden and stops loading when the aging request fails', async () => {
    await flushPayables([payableOpen]);

    component.loadAging();
    httpMock
      .expectOne('/api/v1/accounts-payable/aging')
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(component.aging()).toBeNull();
    expect(component.agingLoading()).toBe(false);
  });

  it('marks overdue accounts after confirmation and reloads the list', async () => {
    await flushPayables([payableOpen]);

    component.triggerMarkOverdue();
    await flushPromises();

    const markRequest = httpMock.expectOne('/api/v1/accounts-payable/mark-overdue');
    expect(markRequest.request.method).toBe('POST');
    expect(markRequest.request.body).toEqual({});
    markRequest.flush(3);
    await flushPromises();
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/accounts-payable').flush(page([payableOpen]));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
  });

  it('does not mark overdue accounts when the confirmation is cancelled', async () => {
    await flushPayables([payableOpen]);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false } as never);

    component.triggerMarkOverdue();
    await flushPromises();

    httpMock.expectNone('/api/v1/accounts-payable/mark-overdue');
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  it('maps status labels and classes', async () => {
    await flushPayables([]);

    expect(component.statusLabel('OPEN')).toBe('Abierto');
    expect(component.statusLabel('PARTIAL')).toBe('Parcial');
    expect(component.statusLabel('OVERDUE')).toBe('Vencido');
    expect(component.statusLabel('PAID')).toBe('Pagado');

    expect(component.statusClass('OPEN')).toBe('status-open');
    expect(component.statusClass('PARTIAL')).toBe('status-partial');
    expect(component.statusClass('OVERDUE')).toBe('status-overdue');
    expect(component.statusClass('PAID')).toBe('status-paid');
  });

  it('treats unpaid accounts with a past due date as overdue', async () => {
    await flushPayables([]);

    const past = '2020-01-01';
    const future = '2999-01-01';

    expect(component.isOverdue({ ...payableOpen, dueDate: past })).toBe(true);
    expect(component.isOverdue({ ...payableOpen, dueDate: future })).toBe(false);
    expect(component.isOverdue({ ...payablePaid, dueDate: past })).toBe(false);
  });
});
