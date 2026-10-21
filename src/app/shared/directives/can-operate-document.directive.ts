import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';

import type { SalesDocument } from '../../core/models/sale.model';
import { SalesDocumentPermissionService } from '../../core/auth/sales-document-permission.service';

/**
 * Renders the host template only when the current user may operate the given document.
 * Purely a rendering decision: authorization itself lives in `SalesDocumentPermissionService`.
 */
@Directive({
  selector: '[canOperateDocument]',
  standalone: true,
})
export class CanOperateDocumentDirective implements OnChanges, OnDestroy {
  @Input('canOperateDocument') document: SalesDocument | null = null;

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissions = inject(SalesDocumentPermissionService);

  private subscription?: Subscription;

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    this.viewContainer.clear();

    if (!this.document) return;

    this.subscription = this.permissions.canOperate(this.document).subscribe((canOperate) => {
      this.viewContainer.clear();
      if (canOperate) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.viewContainer.clear();
  }
}
