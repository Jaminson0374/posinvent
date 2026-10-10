import { Component, input, output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface WarehouseOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-product-inventory',
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
  templateUrl: './product-inventory.html',
  styleUrl: './product-inventory.css',
})
export class ProductInventoryComponent {
  readonly form = input.required<FormGroup>();
  readonly warehousesArray = input.required<FormArray>();
  readonly warehouseList = input<WarehouseOption[]>([]);
  readonly isEditing = input(false);
  readonly addWarehouse = output<void>();
  readonly removeWarehouse = output<number>();

  readonly costingOptions = [
    { value: 'PEPS', label: 'PEPS (Primero en entrar, primero en salir)' },
    { value: 'PROMEDIO_PONDERADO', label: 'Promedio Ponderado' },
    { value: 'ESTANDAR', label: 'Estándar' },
    { value: 'IDENTIFICACION_ESPECIFICA', label: 'Identificación Específica' },
    { value: 'YIELD_COSTING', label: 'Yield Costing' },
  ];

  readonly checkboxes = [
    {
      controlName: 'inventoriable',
      label: 'Inventariable',
      helper: 'El producto se controla en inventario',
    },
    {
      controlName: 'manufacturedInHouse',
      label: 'Elaborado en casa',
      helper: 'Producido internamente en la empresa',
    },
    {
      controlName: 'costAffectingExp',
      label: 'Gasto afecta costo',
      helper: 'Los gastos asociados impactan el costo del producto',
    },
    {
      controlName: 'manageLots',
      label: 'Maneja lotes',
      helper: 'Se requiere trazabilidad por número de lote',
    },
    {
      controlName: 'perishable',
      label: 'Perecedero',
      helper: 'Producto con fecha de vencimiento',
    },
    {
      controlName: 'belongsToProduct',
      label: 'Pertenece a un producto',
      helper: 'Es componente o parte de otro artículo',
    },
    {
      controlName: 'sellBelowMin',
      label: 'Vender bajo mínimo',
      helper: 'Permite ventas aunque el stock esté por debajo del mínimo',
    },
  ];
}
