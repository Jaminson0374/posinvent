import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';

import { NotaListComponent } from './nota-list';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { DebitCreditNote } from '../../../core/models/debit-credit-note.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';
import type { PageResponse } from '../../../core/models/page.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const longReason =
  'Ajuste por diferencia de precio en la factura de compra del proveedor con documento largo';

const debitNote: DebitCreditNote = {
  id: 'note-1',
  type: 'DEBIT_NOTE',
  supplierId: 'sup-1',
  supplierName: 'Proveedor Uno',
  supplierInvoiceId: null,
  documentNumber: 'ND-001',
  amount: 150000,
  reason: longReason,
  reference: null,
  createdBy: 'user-1',
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

const creditNote: DebitCreditNote = {
  id: 'note-2',
  type: 'CREDIT_NOTE',
  supplierId: 'sup-2',
  supplierName: 'Proveedor Dos',
  supplierInvoiceId: null,
  documentNumber: 'NC-001',
  amount: 50000,
  reason: null,
  reference: 'REF-1',
  createdBy: 'user-1',
  createdAt: '2026-05-02T10:00:00Z',
  updatedAt: '2026-05-02T10:00:00Z',
};

const supplier: ThirdPartySupplierOption = {
  id: 'sup-1',
  name: 'Proveedor Uno',
  lastName: null,
  numIdentification: '900123456',
  type: 'SUPPLIER',
  active: true,
};

function page<T>(content: T[], pageIndex = 0, size = 20): PageResponse<T> {
  return {
    content,
    page: pageIndex,
    size,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  };
}

function pageEvent(pageIndex: number, pageSize: number): PageEvent {
  return { pageIndex, pageSize, length: 100, previousPageIndex: 0 };
}

describe('NotaListComponent', () => {
  let fixture: ComponentFixture<NotaListComponent>;
  let component: NotaListComponent;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const suppliers = signal<ThirdPartySupplierOption[]>([supplier]);
  const thirdPartyService = { supplierOptions: { value: suppliers } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotaListComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ThirdPartyService, useValue: thirdPartyService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    fixture = TestBed.createComponent(NotaListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  async function loadNotes(
    content: DebitCreditNote[],
    url = '/api/v1/debit-credit-notes?page=0&size=20',
  ): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne(url).flush(page(content));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads the notes from the backend and renders type, document, supplier and amount', async () => {
    await loadNotes([debitNote, creditNote]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.noteData()?.content).toHaveLength(2);
    expect(text).toContain('Débito');
    expect(text).toContain('Crédito');
    expect(text).toContain('ND-001');
    expect(text).toContain('NC-001');
    expect(text).toContain('Proveedor Uno');
    expect(text).toContain('Proveedor Dos');
    expect(text).not.toContain('No hay notas registradas.');
  });

  it('truncates long reasons and uses a dash for missing reason and reference', async () => {
    await loadNotes([debitNote, creditNote]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(`${longReason.slice(0, 60)}…`);
    expect(text).not.toContain(longReason);
    expect(text).toContain('—');
  });

  it('renders the empty state when there are no notes', async () => {
    await loadNotes([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.noteData()?.content).toHaveLength(0);
    expect(text).toContain('No hay notas registradas.');
  });

  it('applies the selected note type and reloads the list', async () => {
    await loadNotes([debitNote]);
    const reloadSpy = vi.spyOn(component.service, 'reload').mockImplementation(() => {});

    component.onTypeChange('CREDIT_NOTE');

    expect(component.service.type()).toBe('CREDIT_NOTE');
    expect(component.service.page()).toBe(0);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the type filter when the ALL option is selected', async () => {
    await loadNotes([debitNote]);
    component.service.type.set('DEBIT_NOTE');
    const reloadSpy = vi.spyOn(component.service, 'reload').mockImplementation(() => {});

    component.onTypeChange('ALL');

    expect(component.service.type()).toBeNull();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('applies the selected supplier and reloads the list', async () => {
    await loadNotes([debitNote]);
    const reloadSpy = vi.spyOn(component.service, 'reload').mockImplementation(() => {});

    component.onSupplierChange('sup-1');

    expect(component.service.supplierId()).toBe('sup-1');
    expect(component.service.page()).toBe(0);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('updates the pagination signals from the paginator', async () => {
    await loadNotes([debitNote]);

    component.onPageChange(pageEvent(2, 10));

    expect(component.service.page()).toBe(2);
    expect(component.service.size()).toBe(10);
  });

  it('navigates to the create and edit routes', async () => {
    await loadNotes([debitNote]);

    component.openNewNote();
    expect(navigate).toHaveBeenCalledWith(['/compras/notas/nuevo']);

    component.editNote(debitNote);
    expect(navigate).toHaveBeenCalledWith(['/compras/notas', 'note-1']);
  });

  it('deletes the note after confirmation and reloads the list', async () => {
    await loadNotes([debitNote, creditNote]);
    const reloadSpy = vi.spyOn(component.service, 'reload').mockImplementation(() => {});

    component.deleteNote(debitNote);
    await flushPromises();

    const deleteRequest = httpMock.expectOne('/api/v1/debit-credit-notes/note-1');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);

    await flushPromises();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nota eliminada' }));
  });

  it('does not delete the note when the confirmation is cancelled', async () => {
    await loadNotes([debitNote]);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false } as never);

    component.deleteNote(debitNote);
    await flushPromises();

    httpMock.expectNone('/api/v1/debit-credit-notes/note-1');
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  it('maps note types to labels and chip classes', async () => {
    await loadNotes([]);

    expect(component.typeLabel('DEBIT_NOTE')).toBe('Débito');
    expect(component.typeLabel('CREDIT_NOTE')).toBe('Crédito');
    expect(component.typeChipClass('DEBIT_NOTE')).toBe('chip-debit');
    expect(component.typeChipClass('CREDIT_NOTE')).toBe('chip-credit');
  });
});
