import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-summary',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './product-summary.html',
  styleUrl: './product-summary.css',
})
export class ProductSummaryComponent {
  readonly code = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly category = input<string | null>(null);
  readonly uom = input<string | null>(null);
  readonly cost = input<number | null>(null);
  readonly margin = input<number | null>(null);
  readonly salePrice = input<number | null>(null);
  readonly tax = input<string | null>(null);
  readonly stock = input<number | null>(null);

  /** The human-readable labels mapped to the required field readers for incomplete-check. */
  private readonly requiredFields: { read: () => string | null; label: string }[] = [
    { read: () => this.code(), label: 'Código' },
    { read: () => this.name(), label: 'Nombre' },
    { read: () => this.category(), label: 'Categoría' },
    { read: () => this.uom(), label: 'U. Medida' },
  ];

  /** List of field labels where the value is null/empty. */
  get incompleteFields(): string[] {
    return this.requiredFields
      .filter((field) => {
        const value = field.read();
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      })
      .map((field) => field.label);
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
