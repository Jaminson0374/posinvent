import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import type { CashRegister } from '../../../core/models/cash-register.model';
import type { CashCountResponse, Shift } from '../../../core/models/shift.model';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { ShiftService } from '../../../core/services/shift.service';
import { ArqueoComponent } from './arqueo';

registerLocaleData(localeEsCo);

// Spy sweetalert2 — jsdom doesn't support window.matchMedia
vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const mockRegister: CashRegister = {
  id: 'reg-1',
  name: 'Caja 1',
} as CashRegister;

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

const mockResponse: CashCountResponse = {
  id: 'cc-1',
  shiftId: 'shift-1',
  expectedTotal: 300000,
  countedTotal: 205000,
  difference: -95000,
  createdAt: '2026-06-13T12:00:00Z',
};

describe('ArqueoComponent', () => {
  let fixture: ComponentFixture<ArqueoComponent>;
  let component: ArqueoComponent;

  const cashRegisterService = {
    listActive: vi.fn(),
  };
  let historyValue: CashCountResponse[];
  const historyRef = {
    value: () => historyValue,
    reload: vi.fn(),
    isLoading: () => false,
    hasValue: () => true,
    destroy: vi.fn(),
  };
  const shiftService = {
    getActive: vi.fn(),
    saveCashCount: vi.fn(),
    cashCounts: vi.fn(),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    historyValue = [];
    historyRef.reload = vi.fn(() => {
      historyValue = [mockResponse];
      return true;
    });

    cashRegisterService.listActive.mockReturnValue(of([mockRegister]));
    shiftService.getActive.mockReturnValue(of(mockShift));
    shiftService.saveCashCount.mockReturnValue(of(mockResponse));
    shiftService.cashCounts.mockReturnValue(historyRef);

    await TestBed.configureTestingModule({
      imports: [ArqueoComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CashRegisterService, useValue: cashRegisterService },
        { provide: ShiftService, useValue: shiftService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArqueoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads the active shift and its cash-count history on init', () => {
    expect(cashRegisterService.listActive).toHaveBeenCalled();
    expect(shiftService.getActive).toHaveBeenCalledWith('reg-1');
    expect(shiftService.cashCounts).toHaveBeenCalledWith('shift-1');
    expect(component.activeShift()?.id).toBe('shift-1');
  });

  it('posts the counted lines with denomination value, type and quantity', async () => {
    component.countControls[0].setValue(2); // $100,000 bill
    component.countControls[7].setValue(5); // $1,000 coin

    await component.saveCount();

    expect(shiftService.saveCashCount).toHaveBeenCalledWith('shift-1', {
      lines: [
        { denominationValue: 100000, denominationType: 'BILL', quantity: 2 },
        { denominationValue: 1000, denominationType: 'COIN', quantity: 5 },
      ],
      notes: null,
    });
  });

  it('sends the notes when provided', async () => {
    component.countControls[0].setValue(1);
    component.notesControl.setValue('Faltante en revisión');

    await component.saveCount();

    expect(shiftService.saveCashCount).toHaveBeenCalledWith(
      'shift-1',
      expect.objectContaining({ notes: 'Faltante en revisión' }),
    );
  });

  it('excludes denominations with a zero quantity from the request', async () => {
    component.countControls[0].setValue(1);
    component.countControls[1].setValue(0);

    await component.saveCount();

    const [, request] = shiftService.saveCashCount.mock.calls[0] as [
      string,
      { lines: unknown[] },
    ];
    expect(request.lines).toHaveLength(1);
    expect(request.lines[0]).toEqual({
      denominationValue: 100000,
      denominationType: 'BILL',
      quantity: 1,
    });
  });

  it('does not send a request when there is no active shift', async () => {
    shiftService.saveCashCount.mockClear();
    component.activeShift.set(null);

    await component.saveCount();

    expect(shiftService.saveCashCount).not.toHaveBeenCalled();
  });

  it('does not send a request when the shift is not open', async () => {
    shiftService.saveCashCount.mockClear();
    component.activeShift.set({ ...mockShift, status: 'CLOSED' });

    await component.saveCount();

    expect(shiftService.saveCashCount).not.toHaveBeenCalled();
  });

  it('updates the result and reloads history from the service response', async () => {
    component.countControls[0].setValue(2);

    await component.saveCount();

    expect(component.countResult()).toEqual(mockResponse);
    expect(historyRef.reload).toHaveBeenCalled();
    expect(component.history()).toEqual([mockResponse]);
  });

  it('reconciles the displayed totals with the backend response', async () => {
    component.countControls[0].setValue(2); // local counted = 200,000; local expected = 100,000
    component.countResult.set(mockResponse);

    expect(component.totalCounted()).toBe(200000);
    expect(component.expectedTotal()).toBe(mockResponse.expectedTotal);
    expect(component.difference()).toBe(mockResponse.difference);
  });

  it('keeps saving=false and reports an error when the save fails', async () => {
    shiftService.saveCashCount.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    await component.saveCount();

    expect(component.saving()).toBe(false);
    expect(component.countResult()).toBeNull();
  });
});
