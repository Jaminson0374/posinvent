import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    DecimalPipe,
  ],
  template: `
    <mat-form-field appearance="outline" class="p-search">
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
        @for (prod of options(); track prod.id) {
          <mat-option [value]="prod">
            <div class="p-search-option">
              <span class="p-search-code">{{ prod.productCode }}</span>
              <span class="p-search-name">{{ prod.name }}</span>
              <span class="p-search-price">{{ prod.salePrice | number: '1.0-0' }}</span>
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
      .p-search {
        width: 100%;
      }
      .p-search-option {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .p-search-code {
        font-size: 0.75rem;
        color: #64748b;
        min-width: 60px;
      }
      .p-search-name {
        font-weight: 500;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .p-search-price {
        font-size: 0.8rem;
        color: #15803d;
      }
    `,
  ],
})
export class ProductSearchComponent {
  private readonly service = inject(ProductService);

  readonly label = input('Producto');
  readonly placeholder = input('Buscar por código, nombre o código de barras...');

  readonly selected = output<{ id: string; name: string; code: string }>();
  readonly cleared = output<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly options = signal<Product[]>([]);
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
            next: (page) => {
              this.options.set(page.content);
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
    const prod = event.option.value as Product;
    this.selected.emit({ id: prod.id, name: prod.name, code: prod.productCode });
    this.searchControl.setValue(prod.name, { emitEvent: false });
  }

  clearDisplayValue(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.options.set([]);
  }
}
