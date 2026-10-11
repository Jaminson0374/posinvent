import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DianService } from '../../../core/services/dian.service';
import type { DianResolution } from '../../../core/models/dian.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-resolution-list',
  imports: [
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './resolution-list.html',
  styleUrl: './resolution-list.css',
})
export class ResolutionListComponent {
  private readonly dianService = inject(DianService);
  readonly resolutions = this.dianService.resolutions;

  readonly displayedColumns = [
    'resolutionNumber',
    'validFrom',
    'validTo',
    'prefix',
    'range',
    'active',
    'actions',
  ];

  delete(id: string): void {
    Swal.fire({
      title: '¿Eliminar resolución?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.dianService.deleteResolution(id).subscribe({
          next: () => {
            this.resolutions.reload();
            Swal.fire('Eliminada', 'Resolución eliminada correctamente.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.message ?? 'Error al eliminar', 'error');
          },
        });
      }
    });
  }

  activate(id: string): void {
    this.dianService.activateResolution(id).subscribe({
      next: () => {
        this.resolutions.reload();
        Swal.fire('Activada', 'Resolución activada correctamente.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message ?? 'Error al activar', 'error');
      },
    });
  }

  deactivate(id: string): void {
    this.dianService.deactivateResolution(id).subscribe({
      next: () => {
        this.resolutions.reload();
        Swal.fire('Desactivada', 'Resolución desactivada correctamente.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message ?? 'Error al desactivar', 'error');
      },
    });
  }
}
