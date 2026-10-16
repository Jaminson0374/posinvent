import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import type { Shift } from '../../../core/models/shift.model';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { ShiftService } from '../../../core/services/shift.service';
import { ShiftFormComponent } from './shift-form';

registerLocaleData(localeEsCo);

// Spy sweetalert2 — jsdom doesn't support window.matchMedia
vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const mockShift: Shift = {
  id: 'shift-1',
  cashRegisterId: 'reg-1',
  cashRegisterName: 'Caja 1',
  userId: 'user-1',
  userName: 'Cajero',
  openingTime: '2026-06-13T10:00:00Z',
  closingTime: null,
  openingAmount: 100000,
  closingAmount: null,
  status: 'OPEN',
  zReportUrl: null,
  createdAt: '2026-06-13T10:00:00Z',
};

describe('ShiftFormComponent', () => {
  let fixture: ComponentFixture<ShiftFormComponent>;
  let component: ShiftFormComponent;

  const router = { navigate: vi.fn() };
  const cashRegisterService = { listActive: vi.fn() };
  const shiftService = {
    getById: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    cashRegisterService.listActive.mockReturnValue(of([]));
    shiftService.getById.mockReturnValue(of(mockShift));
    shiftService.close.mockReturnValue(of({ ...mockShift, status: 'CLOSED' }));

    await TestBed.configureTestingModule({
      imports: [ShiftFormComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'shift-1' })) },
        },
        { provide: CashRegisterService, useValue: cashRegisterService },
        { provide: ShiftService, useValue: shiftService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('sends the captured values for all four payment methods when closing', async () => {
    component.form.controls.totalCash.setValue(120000);
    component.form.controls.totalCard.setValue(45000);
    component.form.controls.totalTransfer.setValue(30000);
    component.form.controls.totalCredit.setValue(15000);

    await component.cerrarTurno();

    expect(shiftService.close).toHaveBeenCalledWith('shift-1', {
      totalCash: 120000,
      totalCard: 45000,
      totalTransfer: 30000,
      totalCredit: 15000,
      notes: undefined,
    });
  });

  it('blocks the close when a payment total is negative', async () => {
    shiftService.close.mockClear();
    component.form.controls.totalCash.setValue(100000);
    component.form.controls.totalCard.setValue(-1);

    await component.cerrarTurno();

    expect(shiftService.close).not.toHaveBeenCalled();
  });

  it('blocks the close when the cash total is missing', async () => {
    shiftService.close.mockClear();
    component.form.controls.totalCard.setValue(50000);

    await component.cerrarTurno();

    expect(shiftService.close).not.toHaveBeenCalled();
  });

  it('shows the summed total in the close confirmation', async () => {
    const fire = vi.mocked(Swal.fire);
    fire.mockClear();
    component.form.controls.totalCash.setValue(100000);
    component.form.controls.totalCard.setValue(50000);
    component.form.controls.totalTransfer.setValue(30000);
    component.form.controls.totalCredit.setValue(20000);

    await component.cerrarTurno();

    const firstCall = fire.mock.calls[0][0] as unknown as { text?: string };
    expect(firstCall.text).toContain('200.000');
  });
});
