import '@angular/compiler';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { HistorialListComponent } from './historial-list';
import { PurchaseHistoryService } from '../../../../core/services/purchase-history.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import type {
  PurchaseHistoryEntry,
  PurchaseHistoryFilters,
} from '../../../../core/services/purchase-history.service';

const entry: PurchaseHistoryEntry = {
  eventType: 'FACTURA',
  documentId: '11111111-1111-1111-1111-111111111111',
  supplierId: '22222222-2222-2222-2222-222222222222',
  supplierName: 'Proveedor Uno',
  description: 'Factura FV-001',
  status: 'PENDING',
  amount: 150000,
  eventTimestamp: '2026-05-14T10:00:00Z',
};

describe('HistorialListComponent — backend shape (WU-42a)', () => {
  let fixture: ComponentFixture<HistorialListComponent>;
  let component: HistorialListComponent;

  const thirdPartyService = {
    supplierOptions: { value: () => [], isLoading: () => false },
  };
  const purchaseHistoryService = {
    list: vi.fn((_filters: PurchaseHistoryFilters) =>
      of({
        content: [entry],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialListComponent, NoopAnimationsModule],
      providers: [
        { provide: ThirdPartyService, useValue: thirdPartyService },
        { provide: PurchaseHistoryService, useValue: purchaseHistoryService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  function create(): void {
    fixture = TestBed.createComponent(HistorialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('exposes the columns of the real backend shape', () => {
    create();

    expect(component.displayedColumns).toEqual([
      'eventType',
      'documentId',
      'supplierName',
      'description',
      'status',
      'amount',
      'eventTimestamp',
    ]);
    expect(component.displayedColumns).not.toContain('ocId');
    expect(component.displayedColumns).not.toContain('entryType');
  });

  it('renders type, supplier, description and status from the backend entry', () => {
    create();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('FACTURA');
    expect(text).toContain('Proveedor Uno');
    expect(text).toContain('Factura FV-001');
    expect(text).toContain('PENDING');
  });

  it('requests the history endpoint with paging params', () => {
    create();

    expect(purchaseHistoryService.list).toHaveBeenCalledTimes(1);
    const params = purchaseHistoryService.list.mock.calls[0][0];
    expect(params.page).toBe(0);
    expect(params.size).toBe(20);
  });
});
