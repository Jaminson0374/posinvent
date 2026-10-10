import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { WAREHOUSE_TYPE_LABELS } from '../../../../core/models/warehouse.model';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './warehouse-list.html',
  styleUrl: './warehouse-list.css',
})
export class WarehouseListComponent {
  readonly service = inject(WarehouseService);
  readonly typeLabels = WAREHOUSE_TYPE_LABELS;

  readonly warehouseIcons: Record<string, string> = {
    CANAL: 'inventory',
    CORTES: 'kitchen',
    VISCERAS: 'science',
    EMBUTIDOS: 'fastfood',
    DECOMISOS: 'delete_sweep',
    GENERAL: 'warehouse',
  };
}
