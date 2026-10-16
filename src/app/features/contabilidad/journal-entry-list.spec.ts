import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { JournalEntryListComponent } from './journal-entry-list';
import { JournalEntryDetailDialogComponent } from './journal-entry-detail-dialog';
import type { JournalEntry } from '../../core/models/journal-entry.model';

registerLocaleData(localeEsCo);

const entry: JournalEntry = {
  id: 'je-1',
  entryNumber: 'AC-0001',
  entryDate: '2026-06-13',
  description: 'Ajuste de caja',
  sourceType: 'MANUAL',
  sourceId: null,
  justification: 'Cuadre de caja del turno',
  createdAt: '2026-06-13T10:00:00Z',
  lines: [
    { id: 'l1', accountId: 'acc-cash', debit: 100, credit: 0, description: null },
    { id: 'l2', accountId: 'acc-income', debit: 0, credit: 100, description: null },
  ],
};

describe('JournalEntryListComponent', () => {
  let fixture: ComponentFixture<JournalEntryListComponent>;
  let component: JournalEntryListComponent;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalEntryListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalEntryListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entries', [entry]);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('abre el diálogo de detalle pasando el asiento como data', () => {
    const openSpy = vi.spyOn(MatDialog.prototype, 'open').mockReturnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<unknown>);

    component.openDetail(entry);

    expect(openSpy).toHaveBeenCalledWith(
      JournalEntryDetailDialogComponent,
      expect.objectContaining({ data: entry, width: '640px' }),
    );
    openSpy.mockRestore();
  });

  it('conecta el botón "Ver detalle" de la tabla con openDetail', () => {
    const openSpy = vi.spyOn(MatDialog.prototype, 'open').mockReturnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<unknown>);

    const button = fixture.nativeElement.querySelector(
      '.ac-table button[mat-icon-button]',
    ) as HTMLButtonElement;
    button.click();

    expect(openSpy).toHaveBeenCalledWith(JournalEntryDetailDialogComponent, expect.anything());
    openSpy.mockRestore();
  });

  it('traduce los orígenes a etiquetas legibles', () => {
    expect(component.sourceLabel('SALE')).toBe('Venta');
    expect(component.sourceLabel('PURCHASE')).toBe('Compra');
    expect(component.sourceLabel('INVENTORY')).toBe('Inventario');
    expect(component.sourceLabel('PAYMENT')).toBe('Pago');
    expect(component.sourceLabel('MANUAL')).toBe('Manual');
  });

  it('cuenta las líneas del asiento', () => {
    expect(component.lineCount(entry)).toBe('2 líneas');
  });
});
