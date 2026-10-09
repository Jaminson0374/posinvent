import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, SlicePipe, CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TransferService } from '../../../core/services/transfer.service';
import { TransferResponse } from '../../../core/models/transfer.model';

@Component({
  selector: 'app-transfer-detail',
  standalone: true,
  imports: [DatePipe, SlicePipe, CurrencyPipe, MatTableModule, MatProgressSpinnerModule],
  templateUrl: './transfer-detail.html',
  styles: [
    '.td-page{max-width:800px;margin:0 auto;padding:1rem} .td-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .td-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem 1.5rem;margin-bottom:1.5rem} .td-field{display:flex;flex-direction:column;gap:0.25rem} .td-field-full{grid-column:1/-1} .td-label{font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em} .td-value{font-size:0.95rem;color:#1e293b} .td-status-draft{color:#d97706;font-weight:600} .td-status-confirmed{color:#15803d;font-weight:600} .td-status-cancelled{color:#dc2626;font-weight:600} .td-subtitle{font-size:1.1rem;font-weight:600;margin:1.5rem 0 0.75rem} .td-table{width:100%;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0} .cell-mono{font-family:"Courier New",monospace;font-size:0.8rem;color:#64748b} .spinner-container{display:flex;justify-content:center;padding:48px} .error-msg{color:#ef4444;text-align:center;padding:24px}',
  ],
})
export class TransferDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TransferService);

  readonly transfer = signal<TransferResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de traslado no proporcionado.');
      return;
    }

    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (data) => {
        this.transfer.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el traslado.');
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }
}
