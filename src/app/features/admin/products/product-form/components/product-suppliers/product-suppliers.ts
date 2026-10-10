import { Component, input, output } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface SupplierOption {
  id: string;
  name: string;
  lastName: string;
  numIdentification: string;
  active: boolean;
}

@Component({
  selector: 'app-product-suppliers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './product-suppliers.html',
  styleUrl: './product-suppliers.css',
})
export class ProductSuppliersComponent {
  readonly suppliersArray = input.required<FormArray>();
  readonly supplierList = input<SupplierOption[]>([]);
  readonly isEditing = input(false);
  readonly addSupplier = output<void>();
  readonly removeSupplier = output<number>();

  supplierLabel(s: SupplierOption): string {
    const fullName = [s.name, s.lastName].filter(Boolean).join(' ');
    const status = s.active ? '' : ' - inactivo';
    return `${fullName} (${s.numIdentification})${status}`;
  }
}
