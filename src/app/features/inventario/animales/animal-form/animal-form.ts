import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { AnimalService } from '../../../../core/services/animal.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { QuickCreateSupplierDialogComponent } from '../../products/dialogs/quick-create-supplier.dialog';
import type { ThirdParty } from '../../../../core/models/third-party.model';
import type { AnimalRequest, Species } from '../../../../core/models/animal.model';

@Component({
  selector: 'app-animal-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './animal-form.html',
})
export class AnimalFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly animalService = inject(AnimalService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly ref = inject(MatDialogRef<AnimalFormComponent>);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);

  readonly suppliers = computed(() =>
    (this.thirdPartyService.supplierOptions.value() ?? []).filter((tp) => tp.active),
  );

  readonly supplierDisplay = new FormControl('');

  readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    icaLotNumber: ['', Validators.required],
    species: ['', Validators.required],
    liveWeight: [0, [Validators.required, Validators.min(0.001)]],
    entryDate: [new Date(), Validators.required],
    notes: [''],
  });

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const date =
      raw.entryDate instanceof Date ? raw.entryDate.toISOString().split('T')[0] : raw.entryDate;

    const request: AnimalRequest = {
      supplierId: raw.supplierId,
      icaLotNumber: raw.icaLotNumber,
      species: raw.species as Species,
      liveWeight: raw.liveWeight,
      receptionDate: date,
      notes: raw.notes || null,
    };

    this.animalService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    this.ref.close(false);
  }

  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  openCreateSupplier(): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) return;
        this.thirdPartyService.reload();
        this.form.controls.supplierId.setValue(supplier.id);
        this.supplierDisplay.setValue(`${supplier.name} (${supplier.numIdentification})`, {
          emitEvent: false,
        });
      });
  }
}
