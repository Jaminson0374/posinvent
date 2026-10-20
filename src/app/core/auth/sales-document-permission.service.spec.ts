import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';

import type { SalesDocument } from '../models/sale.model';
import type { Shift } from '../models/shift.model';
import type { User, UserRole } from '../models/user.model';
import { AuthService } from './auth.service';
import { ShiftService } from '../services/shift.service';
import { SalesDocumentPermissionService } from './sales-document-permission.service';

function makeUser(id: string, role: UserRole): User {
  return { id, username: id, fullName: id, role };
}

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
    createdBy: 'user-creator',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    items: [],
    dueDate: null,
    isCreditSale: false,
    ...overrides,
  };
}

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    cashRegisterId: 'cash-1',
    userId: 'user-opener',
    assignedTo: null,
    openingTime: '2026-01-01T08:00:00Z',
    closingTime: null,
    openingAmount: 0,
    closingAmount: null,
    status: 'OPEN',
    zReportUrl: null,
    createdAt: '2026-01-01T08:00:00Z',
    ...overrides,
  };
}

describe('SalesDocumentPermissionService', () => {
  let service: SalesDocumentPermissionService;
  let currentUser: User | null;
  const shiftService = { getById: vi.fn() };

  beforeEach(() => {
    currentUser = makeUser('user-cashier', 'CAJERO');
    shiftService.getById.mockReset();

    TestBed.configureTestingModule({
      providers: [
        SalesDocumentPermissionService,
        { provide: AuthService, useValue: { currentUser: () => currentUser } },
        { provide: ShiftService, useValue: shiftService },
      ],
    });

    service = TestBed.inject(SalesDocumentPermissionService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('denies when there is no document', async () => {
    await expect(firstValueFrom(service.canOperate(null))).resolves.toBe(false);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('denies when there is no current user', async () => {
    currentUser = null;

    await expect(firstValueFrom(service.canOperate(makeDocument()))).resolves.toBe(false);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('allows ADMIN for any document without looking up the shift', async () => {
    currentUser = makeUser('admin-1', 'ADMIN');

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(true);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('denies CONTADOR even when they created the document', async () => {
    currentUser = makeUser('contador-1', 'CONTADOR');

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'contador-1' }))),
    ).resolves.toBe(false);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('allows the creator without looking up the shift', async () => {
    currentUser = makeUser('user-cashier', 'CAJERO');

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'user-cashier' }))),
    ).resolves.toBe(true);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('allows the cashier who opened the shift when no assignee is set', async () => {
    currentUser = makeUser('user-opener', 'CAJERO');
    shiftService.getById.mockReturnValue(of(makeShift({ userId: 'user-opener' })));

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(true);
    expect(shiftService.getById).toHaveBeenCalledWith('shift-1');
  });

  it('allows the cashier the shift is assigned to', async () => {
    currentUser = makeUser('user-assignee', 'CAJERO');
    shiftService.getById.mockReturnValue(
      of(makeShift({ userId: 'user-opener', assignedTo: 'user-assignee' })),
    );

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(true);
  });

  it('denies the opener when the shift is assigned to another cashier', async () => {
    currentUser = makeUser('user-opener', 'CAJERO');
    shiftService.getById.mockReturnValue(
      of(makeShift({ userId: 'user-opener', assignedTo: 'user-assignee' })),
    );

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(false);
  });

  it('denies a foreign cashier', async () => {
    currentUser = makeUser('user-foreign', 'CAJERO');
    shiftService.getById.mockReturnValue(
      of(makeShift({ userId: 'user-opener', assignedTo: null })),
    );

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(false);
  });

  it('denies a document without a shift', async () => {
    currentUser = makeUser('user-foreign', 'CAJERO');

    await expect(
      firstValueFrom(
        service.canOperate(makeDocument({ createdBy: 'someone-else', shiftId: null })),
      ),
    ).resolves.toBe(false);
    expect(shiftService.getById).not.toHaveBeenCalled();
  });

  it('fails closed when the shift lookup errors', async () => {
    currentUser = makeUser('user-foreign', 'CAJERO');
    shiftService.getById.mockReturnValue(throwError(() => new Error('boom')));

    await expect(
      firstValueFrom(service.canOperate(makeDocument({ createdBy: 'someone-else' }))),
    ).resolves.toBe(false);
  });

  it('caches the shift lookup for repeated checks of the same user and shift', async () => {
    currentUser = makeUser('user-assignee', 'CAJERO');
    shiftService.getById.mockReturnValue(
      of(makeShift({ userId: 'user-opener', assignedTo: 'user-assignee' })),
    );

    const doc = makeDocument({ createdBy: 'someone-else' });

    await expect(firstValueFrom(service.canOperate(doc))).resolves.toBe(true);
    await expect(firstValueFrom(service.canOperate(doc))).resolves.toBe(true);
    await expect(firstValueFrom(service.canOperate({ ...doc, id: 'doc-2' }))).resolves.toBe(true);

    expect(shiftService.getById).toHaveBeenCalledTimes(1);
  });

  it('looks up each distinct shift separately', async () => {
    currentUser = makeUser('user-assignee', 'CAJERO');
    shiftService.getById.mockReturnValue(of(makeShift({ assignedTo: 'user-assignee' })));

    await firstValueFrom(service.canOperate(makeDocument({ id: 'doc-1', shiftId: 'shift-1' })));
    await firstValueFrom(service.canOperate(makeDocument({ id: 'doc-2', shiftId: 'shift-2' })));

    expect(shiftService.getById).toHaveBeenCalledTimes(2);
  });
});
