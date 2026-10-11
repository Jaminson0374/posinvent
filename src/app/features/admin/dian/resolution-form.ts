import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DianService } from '../../../core/services/dian.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-resolution-form',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './resolution-form.html',
  styleUrl: './resolution-form.css',
})
export class ResolutionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dianService = inject(DianService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly isEdit = signal(false);
  private editId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    resolutionNumber: ['', Validators.required],
    resolutionDate: [new Date(), Validators.required],
    validFrom: [new Date(), Validators.required],
    validTo: [new Date(), Validators.required],
    prefix: [''],
    rangeFrom: [0 as number, [Validators.required, Validators.min(1)]],
    rangeTo: [0 as number, [Validators.required, Validators.min(1)]],
    softwarePin: [''],
    active: [false],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEdit.set(true);
        this.editId = id;
        this.loadResolution(id);
      }
    });
  }

  private loadResolution(id: string): void {
    this.loading.set(true);
    this.dianService.getResolution(id).subscribe({
      next: (r) => {
        this.form.patchValue({
          resolutionNumber: r.resolutionNumber,
          resolutionDate: new Date(r.resolutionDate),
          validFrom: new Date(r.validFrom),
          validTo: new Date(r.validTo),
          prefix: r.prefix,
          rangeFrom: r.rangeFrom,
          rangeTo: r.rangeTo,
          softwarePin: r.softwarePin ?? '',
          active: r.active,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        Swal.fire('Error', err?.error?.message ?? 'Error al cargar resolución', 'error');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body = {
      resolutionNumber: v.resolutionNumber,
      resolutionDate: this.toDateString(v.resolutionDate),
      validFrom: this.toDateString(v.validFrom),
      validTo: this.toDateString(v.validTo),
      prefix: v.prefix,
      rangeFrom: v.rangeFrom,
      rangeTo: v.rangeTo,
      softwarePin: v.softwarePin || null,
      active: v.active,
    };

    this.saving.set(true);
    const request$ = this.editId
      ? this.dianService.updateResolution(this.editId, body)
      : this.dianService.createResolution(body);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire('Guardado', 'Resolución guardada correctamente.', 'success');
        this.router.navigate(['/administracion/dian/resoluciones']);
      },
      error: (err) => {
        this.saving.set(false);
        Swal.fire('Error', err?.error?.message ?? 'Error al guardar', 'error');
      },
    });
  }

  private toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
