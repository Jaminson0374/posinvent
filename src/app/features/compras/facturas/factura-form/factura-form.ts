import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SupplierInvoiceService } from '../../../../core/services/supplier-invoice.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { QuickCreateSupplierDialogComponent } from '../../../admin/products/dialogs/quick-create-supplier.dialog';
import type {
  ThirdParty,
  ThirdPartySupplierOption,
} from '../../../../core/models/third-party.model';
import type { PurchaseOrder } from '../../../../core/models/purchase-order.model';
import type { SupplierInvoiceRequest } from '../../../../core/models/supplier-invoice.model';

@Component({
  selector: 'app-factura-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDialogModule,
    MatChipsModule,
    DecimalPipe,
    SlicePipe,
  ],
  templateUrl: './factura-form.html',
  styleUrl: './factura-form.css',
})
export class FacturaFormComponent implements OnInit {
  private readonly service = inject(SupplierInvoiceService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Manual retention is an explicit override of the data-driven retention engine.
   * It is only offered to ADMIN and CONTADOR; every other role always defers to the backend.
   */
  readonly canOverrideRetention = computed(() => {
    const role = this.auth.userRole();
    return role === 'ADMIN' || role === 'CONTADOR';
  });

  readonly linkedOcIds = signal<string[]>([]);
  readonly loadingOc = signal(false);

  readonly ocSearchControl = new FormControl('', { nonNullable: true });
  readonly ocOptions = signal<PurchaseOrder[]>([]);
  readonly ocSearchLoading = signal(false);

  constructor() {
    this.ocSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q || q.trim().length < 2) return of([]);
          this.ocSearchLoading.set(true);
          return this.purchaseOrderService.searchByNumber(q.trim());
        }),
      )
      .subscribe((results) => {
        this.ocSearchLoading.set(false);
        this.ocOptions.set(results);
      });
  }

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = new FormGroup({
    supplierId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    invoiceNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    issueDate: new FormControl(new Date(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dueDate: new FormControl(new Date(), { nonNullable: true, validators: [Validators.required] }),
    subtotal: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    ivaTotal: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    retentionTotal: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  // ── Auto-calculated total ─────────────────────────────────────────
  readonly total = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => {
        const sub = this.form.controls.subtotal.getRawValue() ?? 0;
        const iva = this.form.controls.ivaTotal.getRawValue() ?? 0;
        const ret = this.form.controls.retentionTotal.getRawValue() ?? 0;
        return sub + iva - ret;
      }),
    ),
    { initialValue: 0 },
  );

  ngOnInit(): void {
    const ocId = this.route.snapshot.queryParamMap.get('ocId');
    const supplierId = this.route.snapshot.queryParamMap.get('supplierId');

    if (ocId) {
      this.linkedOcIds.set([ocId]);
      this.loadOcSummary(ocId);
    }

    if (supplierId) {
      this.form.controls.supplierId.setValue(supplierId);
      this.syncSupplierDisplay();
    }
  }

  private loadOcSummary(ocIdOrObj: string | PurchaseOrder): void {
    if (typeof ocIdOrObj === 'string') {
      this.loadingOc.set(true);
      this.purchaseOrderService.getById(ocIdOrObj).subscribe({
        next: (oc) => this.fillFromOc(oc),
        error: () => {
          this.loadingOc.set(false);
        },
      });
    } else {
      this.fillFromOc(ocIdOrObj);
    }
  }

  private fillFromOc(oc: PurchaseOrder): void {
    this.loadingOc.set(false);
    if (!this.form.controls.supplierId.getRawValue() && oc.supplierId) {
      this.form.controls.supplierId.setValue(oc.supplierId);
      this.syncSupplierDisplay();
    }
    const lineTotal = oc.lines.reduce(
      (sum, line) => sum + (line.orderedQty ?? 0) * (line.unitCost ?? 0),
      0,
    );
    this.form.controls.subtotal.setValue(lineTotal);
  }

  removeLinkedOc(id: string): void {
    this.linkedOcIds.update((ids) => ids.filter((i) => i !== id));
  }

  onOcSelected(ev: MatAutocompleteSelectedEvent): void {
    const oc = ev.option.value as PurchaseOrder;
    if (!oc) return;
    if (!this.linkedOcIds().includes(oc.id)) {
      this.linkedOcIds.update((ids) => [...ids, oc.id]);
    }
    this.loadOcSummary(oc);
    this.ocSearchControl.setValue('', { emitEvent: false });
    this.ocOptions.set([]);
  }

  ocLabel(oc: PurchaseOrder): string {
    const total = oc.lines.reduce((s, l) => s + (l.orderedQty ?? 0) * (l.unitCost ?? 0), 0);
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(total);
    return `${oc.documentNumber} — ${oc.supplierName} (${formatted})`;
  }

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  openCreateSupplier(): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) return;
        this.thirdPartyService.reload();
        this.form.controls.supplierId.setValue(supplier.id);
        this.supplierDisplay.setValue(`${supplier.name} (${supplier.numIdentification})`, {
          emitEvent: false,
        });
      });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    const status = tp.active ? '' : ' — inactivo';
    return `${fullName} (${tp.numIdentification})${status}`;
  }

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const toDateStr = (d: unknown): string => {
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d ?? '');
    };

    // retentionTotal stays null unless an ADMIN/CONTADOR typed an explicit override. Null tells
    // the backend to compute the retention data-driven (PurchaseRetentionConfig + ICA).
    const override =
      this.canOverrideRetention() && raw.retentionTotal !== null ? raw.retentionTotal : null;

    const request: SupplierInvoiceRequest = {
      supplierId: raw.supplierId,
      invoiceNumber: raw.invoiceNumber,
      issueDate: toDateStr(raw.issueDate),
      dueDate: toDateStr(raw.dueDate),
      subtotal: raw.subtotal,
      ivaTotal: raw.ivaTotal,
      retentionTotal: override,
      total: raw.subtotal + raw.ivaTotal - (override ?? 0),
      ocIds: this.linkedOcIds(),
      notes: raw.notes || null,
    };

    this.saving.set(true);
    this.error.set(null);

    this.service.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Error al guardar la factura.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
