import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import type { Desposte } from '../../../../core/models/desposte.model';
import type { PageResponse } from '../../../../core/models/page.model';
import { DesposteService } from '../../../../core/services/desposte.service';
import { DesposteMvmDetailDialogComponent } from './desposte-mvm-detail-dialog';
import { balanceSegments, formatSigned, yieldClass } from './desposte-mvm-format';

@Component({
  selector: 'app-desposte-mvm',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    SlicePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './desposte-mvm.html',
  styleUrl: './desposte-mvm.css',
})
export class DesposteMvmComponent implements OnInit {
  private readonly service = inject(DesposteService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageData = signal<PageResponse<Desposte> | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly from = signal('');
  readonly to = signal('');

  readonly displayedColumns = [
    'createdAt',
    'sourceBatchId',
    'yieldPercentage',
    'balance',
    'inputWeight',
    'totalCutsWeight',
    'wasteWeight',
    'shrinkWeight',
    'deviation',
    'tolerance',
    'totalCommercialValue',
  ];

  readonly rows = computed<readonly Desposte[]>(() => this.pageData()?.content ?? []);
  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);

  /** Average yield across the loaded page (0 when empty). */
  readonly avgYield = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) return 0;
    return rows.reduce((sum, row) => sum + (row.yieldPercentage || 0), 0) / rows.length;
  });

  readonly outOfToleranceCount = computed(
    () => this.rows().filter((row) => !row.withinTolerance).length,
  );

  /** Share of the loaded page that is outside tolerance, in percent. */
  readonly outOfTolerancePct = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) return 0;
    return (this.outOfToleranceCount() / rows.length) * 100;
  });

  readonly balanceSegments = balanceSegments;
  readonly yieldClass = yieldClass;
  readonly formatSigned = formatSigned;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .list(this.from() || undefined, this.to() || undefined, this.page(), this.size())
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.loading.set(false);
        },
        error: () => {
          this.pageData.set(null);
          this.loading.set(false);
          this.error.set('Error al cargar los despostes.');
        },
      });
  }

  onFromChange(value: string): void {
    this.from.set(value);
  }

  onToChange(value: string): void {
    this.to.set(value);
  }

  applyFilters(): void {
    this.page.set(0);
    this.load();
  }

  clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.page.set(0);
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.load();
  }

  openDetail(desposte: Desposte): void {
    this.dialog.open(DesposteMvmDetailDialogComponent, {
      data: { id: desposte.id },
      width: '760px',
    });
  }
}
