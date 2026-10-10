import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { FaenaComponent } from './faena';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnimalService } from '../../../../core/services/animal.service';
import { SlaughterService } from '../../../../core/services/slaughter.service';
import type { Animal } from '../../../../core/models/animal.model';
import type { UserRole } from '../../../../core/models/user.model';
import type { SlaughterResponse } from '../../../../core/models/slaughter.model';

const animal: Animal = {
  id: 'a-1',
  supplierId: '12345678-1234-1234-1234-123456789abc',
  icaLotNumber: 'ICA-1',
  species: 'PORCINO',
  liveWeight: 100,
  status: 'RECEIVED',
  receptionDate: '2026-05-14',
  notes: null,
  createdAt: '2026-05-14T10:00:00Z',
};

const slaughterResponse: SlaughterResponse = {
  id: 'sl-1',
  animalId: 'a-1',
  batchId: 'batch-1',
  yieldPct: 60,
  carcassWeight: 60,
  liveWeight: 100,
  purchaseCost: 300000,
  createdAt: '2026-05-15T10:00:00Z',
};

describe('FaenaComponent', () => {
  let fixture: ComponentFixture<FaenaComponent>;
  let component: FaenaComponent;
  let httpMock: HttpTestingController;

  const route = {
    paramMap: new BehaviorSubject(convertToParamMap({ id: 'a-1' })),
    snapshot: { paramMap: convertToParamMap({ id: 'a-1' }) },
  };
  const role = signal<UserRole | null>('ADMIN');
  const authService = { userRole: role };
  const animalService = { reload: vi.fn() };
  const slaughterService = { process: vi.fn() };
  const router = { navigate: vi.fn() };

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    route.paramMap = new BehaviorSubject(convertToParamMap({ id: 'a-1' }));
    role.set('ADMIN');
    animalService.reload.mockReset();
    slaughterService.process.mockReset();
    slaughterService.process.mockReturnValue(throwError(() => new Error('not stubbed')));
    router.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [FaenaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: AnimalService, useValue: animalService },
        { provide: SlaughterService, useValue: slaughterService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FaenaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/animals/a-1').flush(animal);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('expone el id del animal desde la ruta', () => {
    expect(component.animalId()).toBe('a-1');
    expect(component.animal.value()).toEqual(animal);
  });

  it('traduce la especie a etiqueta legible', () => {
    expect(component.speciesLabel()).toBe('Porcino');
  });

  it('calcula el rendimiento típico', () => {
    component.form.controls.carcassWeight.setValue(60);

    expect(component.yieldPct()).toBeCloseTo(60);
    expect(component.yieldWarning()).toBe(false);
  });

  it('marca un rendimiento bajo como atípico', () => {
    component.form.controls.carcassWeight.setValue(40);

    expect(component.yieldPct()).toBeCloseTo(40);
    expect(component.yieldWarning()).toBe(true);
  });

  it('marca un rendimiento alto como atípico', () => {
    component.form.controls.carcassWeight.setValue(80);

    expect(component.yieldWarning()).toBe(true);
  });

  it('calcula el rendimiento en cero sin peso en canal', () => {
    component.form.controls.carcassWeight.setValue(0);
    expect(component.yieldPct()).toBe(0);
    expect(component.yieldWarning()).toBe(false);
  });

  it('solo permite enviar a roles ADMIN y CARNICERO', () => {
    role.set('ADMIN');
    expect(component.allowedToSubmit()).toBe(true);

    role.set('CARNICERO');
    expect(component.allowedToSubmit()).toBe(true);

    role.set('ALMACENISTA');
    expect(component.allowedToSubmit()).toBe(false);
  });

  it('rechaza el envío cuando el rol no tiene permisos', () => {
    role.set('AUXILIAR');

    component.submit();

    expect(slaughterService.process).not.toHaveBeenCalled();
    expect(component.submitError()).toBe('Tu rol no tiene permisos para registrar faena.');
  });

  it('marca el formulario como tocado cuando es inválido', () => {
    component.submit();

    expect(slaughterService.process).not.toHaveBeenCalled();
    expect(component.form.controls.manualJustification.touched).toBe(true);
  });

  it('envía el request normalizado y navega al listado', () => {
    slaughterService.process.mockReset();
    slaughterService.process.mockReturnValue(of(slaughterResponse));

    component.form.patchValue({
      carcassWeight: 60,
      purchaseCost: 300000,
      manualJustification: '  Faena manual  ',
      notes: '   ',
    });

    component.submit();

    expect(slaughterService.process).toHaveBeenCalledWith({
      animalId: 'a-1',
      sourceType: 'MANUAL',
      manualJustification: 'Faena manual',
      carcassWeight: 60,
      purchaseCost: 300000,
      notes: null,
    });
    expect(component.submitSuccess()).toBe('Faena registrada correctamente.');
    expect(animalService.reload).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/animales']);
    expect(component.submitting()).toBe(false);
  });

  it('rechaza un peso en canal mayor al peso vivo', () => {
    component.form.patchValue({
      carcassWeight: 150,
      purchaseCost: 1,
      manualJustification: 'x',
    });

    component.submit();

    expect(slaughterService.process).not.toHaveBeenCalled();
    expect(component.submitError()).toBe(
      'El peso en canal no puede superar el peso vivo del animal.',
    );
  });

  it('expone el mensaje de error del backend', () => {
    slaughterService.process.mockReset();
    slaughterService.process.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Faena rechazada' },
          }),
      ),
    );

    component.form.patchValue({
      carcassWeight: 55,
      purchaseCost: 250000,
      manualJustification: 'Justificación',
    });

    component.submit();

    expect(component.submitError()).toBe('Faena rechazada');
    expect(component.submitting()).toBe(false);
  });

  it('vuelve al listado de animales', () => {
    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/inventario/animales']);
  });
});
