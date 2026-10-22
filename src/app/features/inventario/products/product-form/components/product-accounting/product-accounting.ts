import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface PucAccountOption {
  id: string;
  code: string;
  name: string;
}

export interface AccountingTemplateOption {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-product-accounting',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './product-accounting.html',
  styleUrl: './product-accounting.css',
})
export class ProductAccountingComponent {
  readonly form = input.required<FormGroup>();
  readonly incomeAccounts = input<PucAccountOption[]>([]);
  readonly inventoryAccounts = input<PucAccountOption[]>([]);
  readonly costAccounts = input<PucAccountOption[]>([]);
  readonly templates = input<AccountingTemplateOption[]>([]);
}
