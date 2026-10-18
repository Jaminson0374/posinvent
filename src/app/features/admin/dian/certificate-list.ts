import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { DianService } from '../../../core/services/dian.service';
import type { DigitalCertificate } from '../../../core/models/dian.model';
import { CertificateUploadDialogComponent } from './certificate-upload-dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-certificate-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './certificate-list.html',
  styleUrl: './certificate-list.css',
})
export class CertificateListComponent {
  private readonly dianService = inject(DianService);
  private readonly dialog = inject(MatDialog);
  readonly certificates = this.dianService.certificates;

  readonly displayedColumns = ['alias', 'issuer', 'expirationDate', 'status', 'actions'];

  openUploadDialog(): void {
    const ref = this.dialog.open(CertificateUploadDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.certificates.reload();
      }
    });
  }

  delete(id: string): void {
    Swal.fire({
      title: '¿Eliminar certificado?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.dianService.deleteCertificate(id).subscribe({
          next: () => {
            this.certificates.reload();
            Swal.fire('Eliminado', 'Certificado eliminado.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.message ?? 'Error al eliminar', 'error');
          },
        });
      }
    });
  }

  isExpiringSoon(expirationDate: string): boolean {
    const daysLeft = Math.ceil(
      (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return daysLeft < 30;
  }
}
