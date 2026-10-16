import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { JournalEntryFormComponent } from './journal-entry-form';
import { JournalEntryService } from '../../core/services/journal-entry.service';
import { PucAccountService } from '../../core/services/puc-account.service';
import type { PucAccount } from '../../core/models/product-catalog.model';
import type { JournalEntry } from '../../core/models/journal-entry.model';

registerLocaleData(localeEsCo);

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const accounts: PucAccount[] = [
  {
    id: 'acc-cash',
    code: '110505',
    name: 'Caja general',
    level: 4,
    parentCode: '1105',
    accountClass: 1,
    accountNature: 'DEBITO',
    allowsTransactions: true,
    active: true,
  },
  {
    id: 'acc-income',
    code: '413501',
    name: 'Ingresos por ventas',
    level: 4,
    parentCode: '4135',
    accountClass: 4,
    accountNature: 'CREDITO',
    allowsTransactions: true,
    active: true,
  },
  {
    id: 'acc-group',
    code: '1105',
    name: 'Disponible (agrupadora)',
    level: 3,
    parentCode: '11',
    accountClass: 1,
    accountNature: 'DEBITO',
    allowsTransactions: false,
    active: true,
  },
];

const savedEntry = { id: 'je-1' } as JournalEntry;

describe('JournalEntryFormComponent', () => {
  let fixture: ComponentFixture<JournalEntryFormComponent>;
  let component: JournalEntryFormComponent;

  const service = { create: vi.fn() };
  const pucService = { accounts: { value: () => accounts } };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    service.create.mockReturnValue(of(savedEntry));

    await TestBed.configureTestingModule({
      imports: [JournalEntryFormComponent, NoopAnimationsModule],
      providers: [
        { provide: JournalEntryService, useValue: service },
        { provide: PucAccountService, useValue: pucService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalEntryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillBalancedEntry(): void {
    component.form.patchValue({
      entryDate: new Date('2026-06-13'),
      description: 'Ajuste de caja',
      justification: 'Cuadre de caja del turno',
    });
    component.lines.at(0).patchValue({ accountId: 'acc-cash', debit: 100, credit: 0 });
    component.lines.at(1).patchValue({ accountId: 'acc-income', debit: 0, credit: 100 });
  }

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('solo lista las cuentas PUC postables (allowsTransactions)', () => {
    const ids = component.postableAccounts().map((a) => a.id);

    expect(ids).toEqual(['acc-cash', 'acc-income']);
    expect(ids).not.toContain('acc-group');
  });

  it('envía la justificación y las líneas en el payload', () => {
    fillBalancedEntry();

    component.submit();

    expect(service.create).toHaveBeenCalledWith({
      entryDate: '2026-06-13',
      description: 'Ajuste de caja',
      justification: 'Cuadre de caja del turno',
      lines: [
        { accountId: 'acc-cash', debit: 100, credit: 0 },
        { accountId: 'acc-income', debit: 0, credit: 100 },
      ],
    });
  });

  it('bloquea el envío cuando los débitos no igualan los créditos', () => {
    component.form.patchValue({
      entryDate: new Date('2026-06-13'),
      justification: 'Ajuste',
    });
    component.lines.at(0).patchValue({ accountId: 'acc-cash', debit: 100, credit: 0 });
    component.lines.at(1).patchValue({ accountId: 'acc-income', debit: 0, credit: 50 });
    const fire = vi.mocked(Swal.fire);
    fire.mockClear();

    component.submit();

    expect(service.create).not.toHaveBeenCalled();
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', title: 'Asiento descuadrado' }),
    );
  });

  it('bloquea el envío cuando el asiento está en cero', () => {
    component.form.patchValue({
      entryDate: new Date('2026-06-13'),
      justification: 'Ajuste',
    });
    component.lines.at(0).patchValue({ accountId: 'acc-cash', debit: 0, credit: 0 });
    component.lines.at(1).patchValue({ accountId: 'acc-income', debit: 0, credit: 0 });

    component.submit();

    expect(service.create).not.toHaveBeenCalled();
  });

  it('no envía cuando falta la justificación obligatoria', () => {
    component.form.patchValue({ entryDate: new Date('2026-06-13'), justification: '' });
    component.lines.at(0).patchValue({ accountId: 'acc-cash', debit: 100, credit: 0 });
    component.lines.at(1).patchValue({ accountId: 'acc-income', debit: 0, credit: 100 });

    component.submit();

    expect(component.form.controls.justification.touched).toBe(true);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('refleja el estado de balance con los totales', () => {
    fillBalancedEntry();

    expect(component.totalDebit()).toBe(100);
    expect(component.totalCredit()).toBe(100);
    expect(component.isBalanced()).toBe(true);
  });
});
