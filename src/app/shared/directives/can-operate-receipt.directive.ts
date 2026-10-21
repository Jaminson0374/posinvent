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

import type { ReceiptResponse } from '../../core/models/logistics.model';
import { WarehouseAccessService } from '../../core/services/warehouse-access.service';

/**
 * Renders the host template only when the current user may operate the given receipt.
 * A null receipt represents creating a new one. Purely a rendering decision: authorization
 * itself lives in `WarehouseAccessService`.
 */
@Directive({
  selector: '[canOperateReceipt]',
  standalone: true,
})
export class CanOperateReceiptDirective implements OnChanges, OnDestroy {
  @Input('canOperateReceipt') receipt: ReceiptResponse | null = null;

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly warehouseAccess = inject(WarehouseAccessService);

  private subscription?: Subscription;

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    this.viewContainer.clear();

    this.subscription = this.warehouseAccess
      .canOperateReceipt(this.receipt)
      .subscribe((canOperate) => {
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
