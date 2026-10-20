import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { SaleService } from '../services/sale.service';
import { SalesDocumentPermissionService } from './sales-document-permission.service';

/**
 * Guards editable sales-document routes (currently the quote edit form).
 *
 * Users who cannot operate the document are redirected to the read-only sales detail instead of
 * mounting a form whose mutations the backend would reject. Read failures fail closed the same way.
 */
export const salesDocumentOperateGuard: CanActivateFn = (route) => {
  const id = route.paramMap.get('id');
  if (!id) return true;

  const saleService = inject(SaleService);
  const permissions = inject(SalesDocumentPermissionService);
  const router = inject(Router);

  const readOnlyDetail = () => router.createUrlTree(['/ventas/documentos', id]);

  return saleService.getDocument(id).pipe(
    switchMap((document): Observable<boolean> => permissions.canOperate(document)),
    map((canOperate) => (canOperate ? true : readOnlyDetail())),
    catchError(() => of(readOnlyDetail())),
  );
};
