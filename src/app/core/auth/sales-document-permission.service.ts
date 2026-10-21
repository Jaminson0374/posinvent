import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import type { SalesDocument } from '../models/sale.model';
import { ShiftService } from '../services/shift.service';
import { AuthService } from './auth.service';

/**
 * Object-level authorization for sales-document mutations.
 *
 * Mirrors the backend `SalesDocumentAccessGuard.requireOperate` rule:
 * - ADMIN may operate every document.
 * - CONTADOR is read-only, even for documents it created.
 * - Otherwise the current user must have created the document, or effectively own its shift
 *   (`assignedTo` when present, otherwise the shift opener `userId`).
 *
 * Shift lookups are cached per `user:shift` so rendering many action buttons triggers one request.
 */
@Injectable({ providedIn: 'root' })
export class SalesDocumentPermissionService {
  private readonly auth = inject(AuthService);
  private readonly shiftService = inject(ShiftService);
  private readonly shiftCache = new Map<string, Observable<boolean>>();

  canOperate(document: SalesDocument | null): Observable<boolean> {
    const user = this.auth.currentUser();
    if (!document || !user) return of(false);

    if (user.role === 'ADMIN') return of(true);
    if (user.role === 'CONTADOR') return of(false);

    if (document.createdBy === user.id) return of(true);
    if (document.shiftId == null) return of(false);

    return this.canOperateShift(document.shiftId, user.id);
  }

  private canOperateShift(shiftId: string, userId: string): Observable<boolean> {
    const key = `${userId}:${shiftId}`;
    const cached = this.shiftCache.get(key);
    if (cached) return cached;

    const result = this.shiftService.getById(shiftId).pipe(
      map((shift) => {
        // Backend `effectiveOwnerId`: assigned_to wins when set, user_id is the fallback.
        const effectiveOwner = shift.assignedTo ?? shift.userId;
        return effectiveOwner === userId;
      }),
      catchError(() => of(false)),
      shareReplay(1),
    );

    this.shiftCache.set(key, result);
    return result;
  }
}
