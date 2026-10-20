import '@angular/compiler';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { of } from 'rxjs';

import type { SalesDocument } from '../../core/models/sale.model';
import { SalesDocumentPermissionService } from '../../core/auth/sales-document-permission.service';
import { CanOperateDocumentDirective } from './can-operate-document.directive';

function makeDocument(overrides: Partial<SalesDocument> = {}): SalesDocument {
  return {
    id: 'doc-1',
    type: 'QUOTE',
    status: 'DRAFT',
    documentNumber: 'COT-0001',
    clientId: 'client-1',
    clientName: 'Cliente',
    warehouseId: 'wh-1',
    shiftId: 'shift-1',
    cashRegisterId: null,
    sourceDocumentId: null,
    totalNet: 0,
    totalTax0: 0,
    totalTax5: 0,
    totalTax19: 0,
    totalAmount: 0,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    items: [],
    dueDate: null,
    isCreditSale: false,
    ...overrides,
  };
}

@Component({
  standalone: true,
  imports: [CanOperateDocumentDirective],
  template: `
    <div class="operable" *canOperateDocument="doc">
      <button class="action">Operar</button>
    </div>
  `,
})
class HostComponent {
  doc: SalesDocument | null = makeDocument();
}

describe('CanOperateDocumentDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canOperate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    canOperate = vi.fn((doc: SalesDocument | null) => of(doc?.id === 'doc-1'));

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: SalesDocumentPermissionService, useValue: { canOperate } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('renders the embedded view when the user may operate', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
    expect(canOperate).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc-1' }));
  });

  it('does not render the embedded view when the user may not operate', () => {
    canOperate.mockReturnValue(of(false));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();
  });

  it('does not render the embedded view for a null document', () => {
    fixture.componentInstance.doc = null;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();
  });

  it('updates the view when the document input changes', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();

    fixture.componentInstance.doc = makeDocument({ id: 'doc-2' });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(canOperate).toHaveBeenCalledTimes(2);
    expect(canOperate).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'doc-2' }));
    expect(fixture.debugElement.query(By.css('.operable'))).toBeNull();

    fixture.componentInstance.doc = makeDocument({ id: 'doc-1' });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.operable'))).not.toBeNull();
  });
});
