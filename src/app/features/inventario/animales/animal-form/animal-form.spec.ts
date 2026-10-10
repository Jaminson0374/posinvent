import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { AnimalFormComponent } from './animal-form';
import { AnimalService } from '../../../../core/services/animal.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import type { ThirdPartySupplierOption } from '../../../../core/models/third-party.model';
import type { Animal } from '../../../../core/models/animal.model';

function supplier(overrides: Partial<ThirdPartySupplierOption> = {}): ThirdPartySupplierOption {
  return {
    id: 'sup-1',
    name: 'Proveedor Uno',
    lastName: null,
    numIdentification: '9001',
    type: 'SUPPLIER',
    active: true,
    ...overrides,
  };
}

const animal: Animal = {
  id: 'a-1',
  supplierId: 'sup-1',
  icaLotNumber: 'ICA-1',
  species: 'PORCINO',
  liveWeight: 100,
  status: 'RECEIVED',
  receptionDate: '2026-05-14',
  notes: null,
  createdAt: '2026-05-14T10:00:00Z',
};

describe('AnimalFormComponent', () => {
  let fixture: ComponentFixture<AnimalFormComponent>;
  let component: AnimalFormComponent;

  const suppliersValue = signal<ThirdPartySupplierOption[]>([supplier()]);
  const animalService = { create: vi.fn() };
  const thirdPartyService = {
    supplierOptions: { value: suppliersValue, isLoading: signal(false) },
    reload: vi.fn(),
  };
  let dialogOpen: ReturnType<typeof vi.spyOn>;

  const dialogRef = { close: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    suppliersValue.set([supplier()]);
    animalService.create.mockReset();
    animalService.create.mockReturnValue(of(animal));
    thirdPartyService.reload.mockReset();
    dialogRef.close.mockReset();

    await TestBed.configureTestingModule({
      imports: [AnimalFormComponent, NoopAnimationsModule],
      providers: [
        { provide: AnimalService, useValue: animalService },
        { provide: ThirdPartyService, useValue: thirdPartyService },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimalFormComponent);
    component = fixture.componentInstance;
    // MatDialogModule (imported by the component) provides MatDialog at the
    // component level, so spy on the instance the component actually holds.
    const dialogInstance = (component as unknown as { dialog: MatDialog }).dialog;
    dialogOpen = vi.spyOn(dialogInstance, 'open');
    dialogOpen.mockReturnValue({ afterClosed: () => of(null) } as never);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('filtra los proveedores activos', () => {
    suppliersValue.set([
      supplier({ id: 'sup-1', active: true }),
      supplier({ id: 'sup-2', active: false }),
      supplier({ id: 'sup-3', active: true }),
    ]);
    fixture.detectChanges();

    expect(component.suppliers().map((s) => s.id)).toEqual(['sup-1', 'sup-3']);
  });

  it('inicializa el formulario con valores por defecto', () => {
    expect(component.form.controls.liveWeight.value).toBe(0);
    expect(component.form.controls.entryDate.value).toBeInstanceOf(Date);
    expect(component.form.controls.notes.value).toBe('');
    expect(component.saving()).toBe(false);
  });

  it('no llama al servicio cuando el formulario es inválido', () => {
    component.save();

    expect(animalService.create).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('envía el request normalizado y cierra el diálogo al guardar', () => {
    component.form.patchValue({
      supplierId: 'sup-1',
      icaLotNumber: 'ICA-9',
      species: 'BOVINO',
      liveWeight: 120,
      entryDate: new Date('2026-06-01T00:00:00.000Z'),
      notes: '',
    });

    component.save();

    expect(animalService.create).toHaveBeenCalledWith({
      supplierId: 'sup-1',
      icaLotNumber: 'ICA-9',
      species: 'BOVINO',
      liveWeight: 120,
      receptionDate: '2026-06-01',
      notes: null,
    });
    expect(component.saving()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('conserva las notas cuando están presentes', () => {
    component.form.patchValue({
      supplierId: 'sup-1',
      icaLotNumber: 'ICA-9',
      species: 'OVINO',
      liveWeight: 40,
      entryDate: new Date('2026-06-02T00:00:00.000Z'),
      notes: 'Lote especial',
    });

    component.save();

    expect(animalService.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Lote especial' }),
    );
  });

  it('deja de guardar y no cierra el diálogo cuando el alta falla', () => {
    animalService.create.mockReturnValue(throwError(() => new Error('boom')));

    component.form.patchValue({
      supplierId: 'sup-1',
      icaLotNumber: 'ICA-9',
      species: 'PORCINO',
      liveWeight: 90,
      entryDate: new Date('2026-06-03T00:00:00.000Z'),
      notes: '',
    });

    component.save();

    expect(component.saving()).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cierra el diálogo con false al cancelar', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('asigna proveedor y display al seleccionar una opción', () => {
    const event = {
      option: { value: 'sup-1', viewValue: 'Proveedor Uno (9001)' },
    } as unknown as MatAutocompleteSelectedEvent;

    component.onSupplierSelected(event);

    expect(component.form.controls.supplierId.value).toBe('sup-1');
    expect(component.supplierDisplay.value).toBe('Proveedor Uno (9001)');
  });

  it('abre el diálogo de creación y limpia el display con la opción especial', () => {
    component.supplierDisplay.setValue('algo');
    const event = {
      option: { value: '__create__', viewValue: 'Crear nuevo proveedor' },
    } as unknown as MatAutocompleteSelectedEvent;

    component.onSupplierSelected(event);

    expect(component.supplierDisplay.value).toBe('');
    expect(dialogOpen).toHaveBeenCalled();
  });

  it('aplica el proveedor creado desde el diálogo', () => {
    dialogOpen.mockReturnValue({
      afterClosed: () => of(supplier({ id: 'sup-9', name: 'Nuevo', numIdentification: '777' })),
    } as never);

    component.openCreateSupplier();

    expect(thirdPartyService.reload).toHaveBeenCalled();
    expect(component.form.controls.supplierId.value).toBe('sup-9');
    expect(component.supplierDisplay.value).toBe('Nuevo (777)');
  });

  it('sincroniza el display con el proveedor del formulario', () => {
    component.form.controls.supplierId.setValue('sup-1');

    component.syncSupplierDisplay();

    expect(component.supplierDisplay.value).toBe('Proveedor Uno (9001)');
  });

  it('limpia el display cuando el proveedor no existe', () => {
    component.supplierDisplay.setValue('algo');
    component.form.controls.supplierId.setValue('desconocido');

    component.syncSupplierDisplay();

    expect(component.supplierDisplay.value).toBe('');
  });
});
