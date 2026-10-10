import { Component, inject, input, output, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface BatchOption {
  id: string;
  supplierId: string;
  warehouseId: string;
  entryDate: string;
  initialWeight: number;
  status: string;
}

@Component({
  selector: 'app-batch-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    SlicePipe,
  ],
  template: `
    <mat-form-field appearance="outline" class="b-picker">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [(value)]="selectedId" (selectionChange)="onChange()">
        <mat-option [value]="null">— Sin lote —</mat-option>
        @if (loading()) {
          <mat-option disabled>
            <mat-spinner diameter="16" style="display:inline-block;margin-right:8px" />
            Cargando...
          </mat-option>
        }
        @for (b of options(); track b.id) {
          <mat-option [value]="b.id">
            Lote {{ b.id | slice: 0 : 8 }} — {{ b.initialWeight }}kg ({{ b.status }})
          </mat-option>
        }
      </mat-select>
      @if (loading()) {
        <mat-spinner diameter="16" matSuffix />
      }
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .b-picker {
        width: 100%;
      }
    `,
  ],
})
export class BatchPickerComponent {
  private readonly http = inject(HttpClient);

  readonly label = input('Lote');
  readonly warehouseId = input<string | null>(null);

  readonly selected = output<string | null>();

  readonly options = signal<BatchOption[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<string | null>(null);

  constructor() {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading.set(true);
    const params = new URLSearchParams({ size: '100' });
    this.http.get<{ content: BatchOption[] }>(`/api/v1/batches?${params.toString()}`).subscribe({
      next: (page) => {
        const batches = page.content.filter((b) => b.status === 'OPEN');
        this.options.set(batches);
        this.loading.set(false);
      },
      error: () => {
        this.options.set([]);
        this.loading.set(false);
      },
    });
  }

  onChange(): void {
    this.selected.emit(this.selectedId());
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.selected.emit(null);
  }
}
