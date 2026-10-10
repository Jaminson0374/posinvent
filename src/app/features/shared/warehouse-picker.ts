import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WarehouseService } from '../../core/services/warehouse.service';
import { Warehouse } from '../../core/models/warehouse.model';

@Component({
  selector: 'app-warehouse-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="w-picker">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [formControl]="searchControl"
        [placeholder]="placeholder()"
        [matAutocomplete]="auto"
      />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onSelected($event)">
        @if (loading()) {
          <mat-option disabled>
            <mat-spinner diameter="16" style="display:inline-block;margin-right:8px" />
            Buscando...
          </mat-option>
        }
        @for (wh of options(); track wh.id) {
          <mat-option [value]="wh">
            <div class="w-picker-option">
              <span class="w-picker-name">{{ wh.name }}</span>
              <span class="w-picker-type">{{ wh.warehouseType }}</span>
            </div>
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .w-picker {
        width: 100%;
      }
      .w-picker-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .w-picker-name {
        font-weight: 500;
      }
      .w-picker-type {
        font-size: 0.75rem;
        color: #64748b;
      }
    `,
  ],
})
export class WarehousePickerComponent {
  private readonly service = inject(WarehouseService);

  readonly label = input('Bodega');
  readonly placeholder = input('Buscar bodega...');

  readonly selected = output<string>();
  readonly cleared = output<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly options = signal<Warehouse[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        const q = value.trim();
        if (q.length >= 2) {
          this.loading.set(true);
          this.service.search(q).subscribe({
            next: (results) => {
              this.options.set(results);
              this.loading.set(false);
            },
            error: () => {
              this.options.set([]);
              this.loading.set(false);
            },
          });
        } else if (!q) {
          this.options.set([]);
          this.cleared.emit();
        }
      });
  }

  onSelected(event: MatAutocompleteSelectedEvent): void {
    const wh = event.option.value as Warehouse;
    this.selected.emit(wh.id);
    this.searchControl.setValue(wh.name, { emitEvent: false });
  }

  clearDisplayValue(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.options.set([]);
  }
}
