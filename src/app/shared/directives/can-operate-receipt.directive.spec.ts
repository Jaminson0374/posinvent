import '@angular/compiler';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { ReceiptResponse } from '../../core/models/logistics.model';
import { WarehouseAccessService } from '../../core/services/warehouse-access.service';
import { CanOperateReceiptDirective } from './can-operate-receipt.directive';

function makeReceipt(overrides: Partial<ReceiptResponse> = {}): ReceiptResponse {
  return {
    id: 'rc-1',
    receiptNumber: 'REC-0001',
    receiptDate: '2026-01-01',
    warehouseId: 'wh-2',
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  };
}

@Component({
  standalone: true,
  imports: [CanOperateReceiptDirective],
  template: `
    <div class="operable" *canOperateReceipt="receipt">
      <button class="action">Operar</button>
    </div>
  `,
})
class HostComponent {
  receipt: ReceiptResponse | null = null;
}

describe('CanOperateReceiptDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canOperateReceipt: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    canOperateReceipt = vi.fn((receipt: ReceiptResponse | null) =>
      of(receipt === null || receipt.id === 'rc-1'),
    );

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: WarehouseAccessService, useValue: { canOperateReceipt } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('treats a null receipt as creation and renders when allowed', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
    expect(canOperateReceipt).toHaveBeenCalledWith(null);
  });

  it('does not render the embedded view when the operation is denied', () => {
    canOperateReceipt.mockReturnValue(of(false));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();
  });

  it('passes an existing receipt to the access check', () => {
    fixture.componentInstance.receipt = makeReceipt();
    fixture.detectChanges();

    expect(canOperateReceipt).toHaveBeenCalledWith(expect.objectContaining({ id: 'rc-1' }));
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
  });

  it('updates the view when the receipt input changes', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();

    fixture.componentInstance.receipt = makeReceipt({ id: 'rc-2' });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(canOperateReceipt).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();

    fixture.componentInstance.receipt = null;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(canOperateReceipt).toHaveBeenCalledTimes(3);
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
  });
});
