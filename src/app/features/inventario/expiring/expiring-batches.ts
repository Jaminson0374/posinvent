import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DisposalService } from '../../../core/services/disposal.service';
import type { ExpiringBatch } from '../../../core/models/disposal.model';
import {
  daysUntil,
  toDate,
  urgencyClass,
  urgencyLabel,
  urgencyLevel,
  type UrgencyLevel,
} from './expiring-format';

/** A table row enriched with the derived expiration date and urgency. */
export interface ExpiringRow {
  batch: ExpiringBatch;
  expiresAt: Date | null;
  days: number | null;
  urgency: UrgencyLevel;
}

@Component({
  selector: 'app-expiring-batches',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './expiring-batches.html',
  styleUrl: './expiring-batches.css',
})
export class ExpiringBatchesComponent implements OnInit {
  private readonly service = inject(DisposalService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<ExpiringBatch[]>([]);
  readonly days = signal(30);

  readonly daysOptions: ReadonlyArray<number> = [7, 15, 30, 60, 90];
  readonly columns = ['urgency', 'product', 'warehouse', 'batch', 'expiration', 'days', 'qty'];

  readonly urgencyLabel = urgencyLabel;
  readonly urgencyClass = urgencyClass;

  /** Rows sorted by expiration ascending; unparseable dates sink to the bottom. */
  readonly rows = computed<ExpiringRow[]>(() =>
    this.data()
      .map((batch) => {
        const expiresAt = toDate(batch.expiration_date);
        const days = expiresAt ? daysUntil(expiresAt) : null;
        return {
          batch,
          expiresAt,
          days,
          urgency: days === null ? 'NORMAL' : urgencyLevel(days),
        };
      })
      .sort((a, b) => {
        if (!a.expiresAt && !b.expiresAt) return 0;
        if (!a.expiresAt) return 1;
        if (!b.expiresAt) return -1;
        return a.expiresAt.getTime() - b.expiresAt.getTime();
      }),
  );

  readonly total = computed(() => this.rows().length);
  readonly expiredCount = computed(
    () => this.rows().filter((row) => row.days !== null && row.days < 0).length,
  );
  readonly criticalCount = computed(
    () => this.rows().filter((row) => row.days !== null && row.days >= 0 && row.days <= 7).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.expiringSoon(this.days()).subscribe({
      next: (rows) => {
        this.data.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.data.set([]);
        this.loading.set(false);
        this.error.set('Error al cargar los vencimientos.');
      },
    });
  }

  onDaysChange(days: number): void {
    this.days.set(days);
    this.load();
  }

  goToBatch(row: ExpiringRow): void {
    this.router.navigate(['/inventario/lotes', row.batch.batch_id]);
  }

  formatDays(days: number | null): string {
    if (days === null) return '—';
    return days > 0 ? `+${days}` : `${days}`;
  }
}
