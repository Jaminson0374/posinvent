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

import {
  WarehouseAccessService,
  type TransferOperationInput,
} from '../../core/services/warehouse-access.service';

/**
 * Renders the host template only when the current user may perform the requested transfer
 * operation. Purely a rendering decision: authorization itself lives in `WarehouseAccessService`.
 */
@Directive({
  selector: '[canOperateTransfer]',
  standalone: true,
})
export class CanOperateTransferDirective implements OnChanges, OnDestroy {
  @Input('canOperateTransfer') operation: TransferOperationInput | null = null;

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly warehouseAccess = inject(WarehouseAccessService);

  private subscription?: Subscription;

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    this.viewContainer.clear();

    if (!this.operation) return;

    this.subscription = this.warehouseAccess
      .canOperateTransfer(this.operation)
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
