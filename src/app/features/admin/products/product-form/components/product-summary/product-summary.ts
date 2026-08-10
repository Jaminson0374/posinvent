import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-summary',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './product-summary.html',
  styleUrl: './product-summary.css',
})
export class ProductSummaryComponent {
  @Input() code: string | null = null;
  @Input() name: string | null = null;
  @Input() category: string | null = null;
  @Input() uom: string | null = null;
  @Input() cost: number | null = null;
  @Input() margin: number | null = null;
  @Input() salePrice: number | null = null;
  @Input() tax: string | null = null;
  @Input() stock: number | null = null;

  /** The human-readable labels mapped to field values for incomplete-check. */
  private static readonly REQUIRED_FIELDS: { key: keyof ProductSummaryComponent; label: string }[] =
    [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'category', label: 'Categoría' },
      { key: 'uom', label: 'U. Medida' },
    ];

  /** List of field labels where the value is null/empty. */
  get incompleteFields(): string[] {
    return ProductSummaryComponent.REQUIRED_FIELDS.filter((field) => {
      const value = this[field.key];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    }).map((field) => field.label);
  }

  /** Number of incomplete required fields. */
  get incompleteCount(): number {
    return this.incompleteFields.length;
  }

  /** Whether the "Datos incompletos" badge should be shown. */
  get hasIncompleteFields(): boolean {
    return this.incompleteCount > 0;
  }

  /** Format a number as Colombian peso. */
  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return '$' + value.toLocaleString('es-CO');
  }

  /** Format a percentage. */
  formatPercent(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return value + '%';
  }

  /** Format tax display. */
  formatTax(value: string | null): string {
    if (!value) return '—';
    return value === 'EXENTO'
      ? 'Exento'
      : value === 'IVA_5'
        ? 'IVA 5%'
        : value === 'IVA_8'
          ? 'IVA 8%'
          : value === 'IVA_19'
            ? 'IVA 19%'
            : value;
  }

  /** Format stock as integer. */
  formatStock(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return value.toString();
  }

  /** Display string or dash. */
  displayText(value: string | null): string {
    if (!value || value.trim() === '') return '—';
    return value;
  }
}
