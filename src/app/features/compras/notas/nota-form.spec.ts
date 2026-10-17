import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { NotaFormComponent } from './nota-form';
import { SupplierNoteService } from '../../../core/services/supplier-note.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { DebitCreditNote } from '../../../core/models/debit-credit-note.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const savedNote: DebitCreditNote = {
  id: 'note-1',
  type: 'CREDIT_NOTE',
  supplierId: 'sup-1',
  supplierName: 'Proveedor Uno',
  supplierInvoiceId: 'inv-1',
  documentNumber: 'NC-001',
  amount: 50000,
  reason: 'Ajuste de saldo',
  reference: 'REF-1',
  createdBy: 'user-1',
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

const supplier: ThirdPartySupplierOption = {
  id: 'sup-1',
  name: 'Proveedor Uno',
  lastName: null,
  numIdentification: '900123456',
  type: 'SUPPLIER',
  active: true,
};

describe('NotaFormComponent', () => {
  let fixture: ComponentFixture<NotaFormComponent>;
  let component: NotaFormComponent;
  let routeId: string | null;
  let navigate: ReturnType<typeof vi.spyOn>;

  const supplierOptions = signal<ThirdPartySupplierOption[]>([]);
  const thirdPartyService = {
    supplierOptions: { value: supplierOptions, isLoading: signal(false) },
  };
  const noteService = {
    create: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
  };
  const route = {
    snapshot: { paramMap: { get: () => routeId } },
  };

  beforeEach(async () => {
    routeId = null;
    supplierOptions.set([]);
    noteService.create.mockReset().mockReturnValue(of(savedNote));
    noteService.update.mockReset().mockReturnValue(of(savedNote));
    noteService.getById.mockReset().mockReturnValue(of(savedNote));
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);

    await TestBed.configureTestingModule({
      imports: [NotaFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: SupplierNoteService, useValue: noteService },
        { provide: ThirdPartyService, useValue: thirdPartyService },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NotaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('starts as a new debit note with an invalid form', () => {
    expect(component.isEdit()).toBe(false);
    expect(component.form.controls.type.getRawValue()).toBe('DEBIT_NOTE');
    expect(component.form.valid).toBe(false);
    expect(component.form.controls.supplierId.hasError('required')).toBe(true);
    expect(component.form.controls.amount.hasError('min')).toBe(true);
  });

  it('accepts the form when a supplier and a positive amount are provided', () => {
    component.form.controls.supplierId.setValue('sup-1');
    component.form.controls.amount.setValue(0.01);

    expect(component.form.valid).toBe(true);
  });

  it('does not submit an invalid form and marks the controls as touched', () => {
    component.save();

    expect(noteService.create).not.toHaveBeenCalled();
    expect(component.form.controls.supplierId.touched).toBe(true);
    expect(component.form.controls.amount.touched).toBe(true);
  });

  it('sends a debit note payload and normalizes empty optional fields to null', () => {
    component.form.patchValue({ supplierId: 'sup-1', amount: 150000 });

    component.save();

    expect(noteService.create).toHaveBeenCalledTimes(1);
    expect(noteService.create).toHaveBeenCalledWith({
      type: 'DEBIT_NOTE',
      supplierId: 'sup-1',
      supplierInvoiceId: null,
      documentNumber: null,
      amount: 150000,
      reason: null,
      reference: null,
    });
    expect(noteService.update).not.toHaveBeenCalled();
  });

  it('sends a credit note payload with the optional fields when they are filled', () => {
    component.form.patchValue({
      type: 'CREDIT_NOTE',
      supplierId: 'sup-1',
      supplierInvoiceId: 'inv-1',
      documentNumber: 'NC-001',
      amount: 50.5,
      reason: 'Ajuste de saldo',
      reference: 'REF-1',
    });

    component.save();

    expect(noteService.create).toHaveBeenCalledWith({
      type: 'CREDIT_NOTE',
      supplierId: 'sup-1',
      supplierInvoiceId: 'inv-1',
      documentNumber: 'NC-001',
      amount: 50.5,
      reason: 'Ajuste de saldo',
      reference: 'REF-1',
    });
  });

  it('navigates back to the notes list after a successful creation', async () => {
    component.form.patchValue({ supplierId: 'sup-1', amount: 1000 });

    component.save();
    await flushPromises();

    expect(navigate).toHaveBeenCalledWith(['/compras/notas']);
    expect(component.saving()).toBe(false);
  });

  it('shows the backend error message and stays on the form when the creation fails', async () => {
    noteService.create.mockReturnValue(
      throwError(() => ({ error: { message: 'Saldo insuficiente' } })),
    );
    component.form.patchValue({ supplierId: 'sup-1', amount: 1000 });

    component.save();
    await flushPromises();

    expect(component.error()).toBe('Saldo insuficiente');
    expect(component.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', text: 'Saldo insuficiente' }),
    );
  });

  it('loads an existing note in edit mode and updates it on save', () => {
    routeId = 'note-1';
    supplierOptions.set([supplier]);

    fixture = TestBed.createComponent(NotaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(noteService.getById).toHaveBeenCalledWith('note-1');
    expect(component.isEdit()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.form.controls.type.getRawValue()).toBe('CREDIT_NOTE');
    expect(component.form.controls.amount.getRawValue()).toBe(50000);
    expect(component.supplierDisplay.getRawValue()).toBe('Proveedor Uno (900123456)');

    component.save();

    expect(noteService.update).toHaveBeenCalledTimes(1);
    expect(noteService.update).toHaveBeenCalledWith('note-1', {
      type: 'CREDIT_NOTE',
      supplierId: 'sup-1',
      supplierInvoiceId: 'inv-1',
      documentNumber: 'NC-001',
      amount: 50000,
      reason: 'Ajuste de saldo',
      reference: 'REF-1',
    });
    expect(noteService.create).not.toHaveBeenCalled();
  });

  it('reports an error when the note to edit cannot be loaded', () => {
    routeId = 'note-1';
    noteService.getById.mockReturnValue(
      throwError(() => ({ error: { message: 'Nota no encontrada' } })),
    );

    fixture = TestBed.createComponent(NotaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Nota no encontrada');
  });

  it('maps the selected supplier to the supplierId control and the display value', () => {
    component.onSupplierSelected({
      option: { value: 'sup-1', viewValue: 'Proveedor Uno (900123456)' },
    } as unknown as MatAutocompleteSelectedEvent);

    expect(component.form.controls.supplierId.getRawValue()).toBe('sup-1');
    expect(component.supplierDisplay.getRawValue()).toBe('Proveedor Uno (900123456)');
  });

  it('navigates back to the notes list on cancel', () => {
    component.cancel();

    expect(navigate).toHaveBeenCalledWith(['/compras/notas']);
  });

  it('labels suppliers with their full name, identification and inactive state', () => {
    expect(component.supplierLabel(supplier)).toBe('Proveedor Uno (900123456)');
    expect(component.supplierLabel({ ...supplier, lastName: 'Pérez' })).toBe(
      'Proveedor Uno Pérez (900123456)',
    );
    expect(component.supplierLabel({ ...supplier, active: false })).toBe(
      'Proveedor Uno (900123456) — inactivo',
    );
  });
});
