import { Component, computed, input, output, signal } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ProductGeneralDisplayControls {
  typeDisplay: FormControl<string | null>;
  stateDisplay: FormControl<string | null>;
  brandDisplay: FormControl<string | null>;
  modelDisplay: FormControl<string | null>;
  categoryDisplay: FormControl<string | null>;
  groupDisplay: FormControl<string | null>;
  uomDisplay: FormControl<string | null>;
  taxDisplay: FormControl<string | null>;
}

@Component({
  selector: 'app-product-general',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './product-general.html',
  styleUrl: './product-general.css',
})
export class ProductGeneralComponent {
  readonly form = input.required<FormGroup>();
  readonly displayControls = input<ProductGeneralDisplayControls>();
  readonly taxOptions = input<Array<{ code: string; label: string }>>([]);
  readonly canCreateTax = input(false);
  readonly createTaxRequested = output<string>();

  readonly taxFilter = signal('');
  readonly filteredTaxOptions = computed(() => {
    const query = this.taxFilter().trim().toLowerCase();
    const options = this.taxOptions();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.code.toLowerCase().includes(query) ||
        option.label.toLowerCase().includes(query),
    );
  });

  // Getters that always return a valid FormControl for template binding
  get typeDc(): FormControl<string | null> {
    return this.displayControls()?.typeDisplay ?? (this._typeFallback as FormControl<string | null>);
  }
  get stateDc(): FormControl<string | null> {
    return (
      this.displayControls()?.stateDisplay ?? (this._stateFallback as FormControl<string | null>)
    );
  }
  get brandDc(): FormControl<string | null> {
    return (
      this.displayControls()?.brandDisplay ?? (this._brandFallback as FormControl<string | null>)
    );
  }
  get modelDc(): FormControl<string | null> {
    return (
      this.displayControls()?.modelDisplay ?? (this._modelFallback as FormControl<string | null>)
    );
  }
  get catDc(): FormControl<string | null> {
    return (
      this.displayControls()?.categoryDisplay ?? (this._catFallback as FormControl<string | null>)
    );
  }
  get groupDc(): FormControl<string | null> {
    return (
      this.displayControls()?.groupDisplay ?? (this._groupFallback as FormControl<string | null>)
    );
  }
  get uomDc(): FormControl<string | null> {
    return this.displayControls()?.uomDisplay ?? (this._uomFallback as FormControl<string | null>);
  }
  get taxDc(): FormControl<string | null> {
    return this.displayControls()?.taxDisplay ?? (this._taxFallback as FormControl<string | null>);
  }

  onTaxInput(value: string): void {
    this.taxFilter.set(value);
  }

  onTaxSelected(code: string): void {
    if (code === '__create__') {
      this.createTaxRequested.emit(this.taxFilter());
      return;
    }
    const option = this.taxOptions().find((item) => item.code === code);
    this.form().get('taxType')?.setValue(code);
    this.taxDc.setValue(option?.label ?? code, { emitEvent: false });
    this.taxFilter.set('');
  }

  syncTaxDisplay(): void {
    const code = this.form().get('taxType')?.value as string | null;
    const option = this.taxOptions().find((item) => item.code === code);
    this.taxDc.setValue(option?.label ?? code ?? '', { emitEvent: false });
    this.taxFilter.set('');
  }

  private readonly _typeFallback = new FormControl('');
  private readonly _stateFallback = new FormControl('');
  private readonly _brandFallback = new FormControl('');
  private readonly _modelFallback = new FormControl('');
  private readonly _catFallback = new FormControl('');
  private readonly _groupFallback = new FormControl('');
  private readonly _uomFallback = new FormControl('');
  private readonly _taxFallback = new FormControl('');
}
