import '@angular/compiler';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { TransferResponse } from '../../core/models/transfer.model';
import {
  WarehouseAccessService,
  type TransferOperationInput,
} from '../../core/services/warehouse-access.service';
import { CanOperateTransferDirective } from './can-operate-transfer.directive';

function makeTransfer(overrides: Partial<TransferResponse> = {}): TransferResponse {
  return {
    id: 'tr-1',
    sourceWarehouseId: 'wh-1',
    targetWarehouseId: 'wh-2',
    status: 'DRAFT',
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    confirmedBy: null,
    confirmedAt: null,
    items: [],
    ...overrides,
  };
}

@Component({
  standalone: true,
  imports: [CanOperateTransferDirective],
  template: `
    <div class="operable" *canOperateTransfer="input">
      <button class="action">Operar</button>
    </div>
  `,
})
class HostComponent {
  input: TransferOperationInput | null = { operation: 'confirm', transfer: makeTransfer() };
}

describe('CanOperateTransferDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canOperateTransfer: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    canOperateTransfer = vi.fn((input: TransferOperationInput | null) =>
      of(input?.operation === 'confirm'),
    );

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: WarehouseAccessService, useValue: { canOperateTransfer } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('renders the embedded view when the operation is allowed', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
    expect(canOperateTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'confirm' }),
    );
  });

  it('does not render the embedded view when the operation is denied', () => {
    canOperateTransfer.mockReturnValue(of(false));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();
  });

  it('does not render or query access for a null input', () => {
    fixture.componentInstance.input = null;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();
    expect(canOperateTransfer).not.toHaveBeenCalled();
  });

  it('updates the view when the input changes', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();

    fixture.componentInstance.input = { operation: 'cancel', transfer: makeTransfer() };
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(canOperateTransfer).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();

    fixture.componentInstance.input = { operation: 'confirm', transfer: makeTransfer() };
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(canOperateTransfer).toHaveBeenCalledTimes(3);
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
  });
});
