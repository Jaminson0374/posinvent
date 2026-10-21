import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule, DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { SaleService } from '../../../core/services/sale.service';
import { ElectronicInvoiceService } from '../../../core/services/electronic-invoice.service';
import {
  STATUS_LABELS,
  type ElectronicInvoice,
  type ProviderError,
} from '../../../core/models/dian.model';
import type {
  SalesDocument,
  SalesDocumentStatus,
} from '../../../core/models/sale.model';
import { allowedSalesTransitions } from '../../../core/domain/sales-transition';
import { CanOperateDocumentDirective } from '../../../shared/directives/can-operate-document.directive';
import Swal from 'sweetalert2';

interface TransitionState {
  target: SalesDocumentStatus;
  label: string;
  color: string;
  icon: string;
}

/** Presentation metadata for each target status the transition matrix can produce. */
const TRANSITION_META: Record<SalesDocumentStatus, Omit<TransitionState, 'target'>> = {
  DRAFT: { label: 'Borrador', color: '', icon: 'edit_note' },
  SENT: { label: 'Enviar', color: 'primary', icon: 'send' },
  ACCEPTED: { label: 'Aceptar', color: 'primary', icon: 'check_circle' },
  REJECTED: { label: 'Rechazar', color: 'warn', icon: 'cancel' },
  EXPIRED: { label: 'Expirada', color: '', icon: 'timer_off' },
  CONFIRMED: { label: 'Confirmar', color: 'primary', icon: 'check_circle' },
  PARTIALLY_INVOICED: { label: 'Facturar parcial', color: 'primary', icon: 'receipt_long' },
  INVOICED: { label: 'Facturar', color: 'primary', icon: 'receipt' },
  ISSUED: { label: 'Emitir', color: 'primary', icon: 'publish' },
  PAID: { label: 'Pagar', color: 'primary', icon: 'payments' },
  CANCELLED: { label: 'Cancelar', color: 'warn', icon: 'cancel' },
};

@Component({
  selector: 'app-sales-document-detail',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    CommonModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    CanOperateDocumentDirective,
  ],
  templateUrl: './sales-document-detail.html',
  styleUrl: './sales-document-detail.css',
})
export class SalesDocumentDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly saleService = inject(SaleService);
  private readonly electronicInvoiceService = inject(ElectronicInvoiceService);

  readonly document = signal<SalesDocument | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly transitioning = signal(false);
  readonly electronicInvoice = signal<ElectronicInvoice | null>(null);
  readonly providerErrors = computed<ProviderError[]>(
    () => this.electronicInvoice()?.errors ?? [],
  );

  readonly typeLabels: Record<string, string> = {
    QUOTE: 'Cotización',
    ORDER: 'Pedido',
    INVOICE: 'Factura',
    CREDIT_NOTE: 'Nota crédito',
    DEBIT_NOTE: 'Nota débito',
  };

  readonly statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviado',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
    EXPIRED: 'Expirado',
    CONFIRMED: 'Confirmado',
    PARTIALLY_INVOICED: 'Parc. Facturado',
    INVOICED: 'Facturado',
    ISSUED: 'Emitido',
    PAID: 'Pagado',
    CANCELLED: 'Cancelado',
  };

  readonly displayedColumns = [
    'lineNumber',
    'productName',
    'quantity',
    'unitPrice',
    'taxType',
    'taxAmount',
    'subtotal',
  ];

  readonly totalIVA = computed(() => {
    const doc = this.document();
    if (!doc) return 0;
    return (doc.totalTax0 || 0) + (doc.totalTax5 || 0) + (doc.totalTax19 || 0);
  });

  readonly availableTransitions = computed<TransitionState[]>(() => {
    const doc = this.document();
    if (!doc) return [];

    return allowedSalesTransitions(doc.type, doc.status).map((target) => ({
      target,
      ...TRANSITION_META[target],
    }));
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadDocument(id);
        this.loadElectronicInvoice(id);
      }
    });
  }

  loadDocument(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.saleService.getDocument(id).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.loading.set(false);
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.loading.set(false);
          this.router.navigate(['/ventas/documentos']);
          return;
        }
        this.error.set(err?.error?.message || 'Error al cargar el documento');
        this.loading.set(false);
      },
    });
  }

  transition(target: SalesDocumentStatus): void {
    const doc = this.document();
    if (!doc) return;

    const label = this.statusLabels[target] || target;
    if (!confirm(`¿${label} este documento?`)) return;

    this.transitioning.set(true);
    this.saleService.transitionDocument(doc.id, target).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.saleService.reload();
        this.transitioning.set(false);
      },
      error: (err) => {
        alert(err?.error?.message || 'Error en la transición');
        this.transitioning.set(false);
      },
    });
  }

  getStatusClass(status: string): string {
    return `chip-status-${status.toLowerCase()}`;
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  viewCxc(): void {
    const doc = this.document();
    if (!doc) return;
    this.router.navigate(['/ventas/cxc'], {
      queryParams: { clientId: doc.clientId },
    });
  }

  createReceipt(): void {
    const doc = this.document();
    if (!doc) return;
    this.router.navigate(['/ventas/recibos/nuevo'], {
      queryParams: { clientId: doc.clientId },
    });
  }

  private loadElectronicInvoice(salesDocId: string): void {
    this.electronicInvoiceService.getBySalesDocument(salesDocId).subscribe({
      next: (ei) => this.electronicInvoice.set(ei),
      error: () => this.electronicInvoice.set(null),
    });
  }

  showDianQr(): void {
    const ei = this.electronicInvoice();
    if (!ei?.qrCode) {
      Swal.fire('Sin QR', 'No hay código QR disponible.', 'info');
      return;
    }
    const statusLabel = STATUS_LABELS[ei.status] ?? ei.status;
    Swal.fire({
      title: 'Factura electrónica',
      html: `<div style="text-align:center">
        <img src="data:image/png;base64,${ei.qrCode}" style="max-width:256px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px" />
        <p style="font-size:12px;color:#64748b;margin-top:12px"><strong>CUFE:</strong> ${ei.cufe ?? 'N/A'}</p>
        <p style="font-size:12px;color:#64748b"><strong>Estado:</strong> ${statusLabel}</p>
      </div>`,
      showCloseButton: true,
      showConfirmButton: false,
    });
  }

  friendlyError(error: ProviderError): string {
    const code = (error.code ?? '').toLowerCase();
    const params = (error.params ?? []).join(' ').toLowerCase();
    if (code.includes('postal') || params.includes('postal_code')) {
      return 'El código postal del cliente es inválido o no existe en la tabla DIAN.';
    }
    if (code.includes('identification') || params.includes('identification')) {
      return 'La identificación fiscal del cliente no es válida.';
    }
    if (code.includes('total_payments') || params.includes('payments')) {
      return 'Los medios de pago no cuadran con el total de la factura.';
    }
    if (code.includes('tax') || params.includes('tax')) {
      return 'La base gravable o el impuesto de una línea no cuadra con el total.';
    }
    return error.message || 'Siigo rechazó la factura por una regla fiscal.';
  }

  correctClientData(): void {
    const clientId = this.document()?.clientId;
    if (!clientId) return;
    this.router.navigate(['/ventas/clientes', clientId]);
  }

  retryDian(): void {
    const ei = this.electronicInvoice();
    if (!ei) return;
    this.electronicInvoiceService.retry(ei.id).subscribe({
      next: () => {
        Swal.fire('Reintentado', 'Reenvío programado.', 'success');
        const doc = this.document();
        if (doc) this.loadElectronicInvoice(doc.id);
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message ?? 'Error al reintentar', 'error');
      },
    });
  }
}
