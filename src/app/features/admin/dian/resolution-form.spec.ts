import { describe, expect, it, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { ResolutionFormComponent } from './resolution-form';
import { DianService } from '../../../core/services/dian.service';
import type { DianResolution, DianResolutionRequest } from '../../../core/models/dian.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

const resolution: DianResolution = {
  id: 'res-1',
  resolutionNumber: '18764000123456',
  resolutionDate: '2026-01-01',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  prefix: 'SETP',
  rangeFrom: 1,
  rangeTo: 1000,
  softwarePin: '12345',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
};

interface Setup {
  fixture: ComponentFixture<ResolutionFormComponent>;
  component: ResolutionFormComponent;
  dianService: {
    getResolution: ReturnType<typeof vi.fn>;
    createResolution: ReturnType<typeof vi.fn>;
    updateResolution: ReturnType<typeof vi.fn>;
  };
  router: Router;
}

async function setup(id?: string): Promise<Setup> {
  const dianService = {
    getResolution: vi.fn(() => of(resolution)),
    createResolution: vi.fn(() => of(resolution)),
    updateResolution: vi.fn(() => of(resolution)),
  };

  await TestBed.configureTestingModule({
    imports: [ResolutionFormComponent, NoopAnimationsModule],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: DianService, useValue: dianService },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap(id ? { id } : {})) },
      },
    ],
  }).compileComponents();

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(ResolutionFormComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, dianService, router };
}

describe('ResolutionFormComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('crea el componente en modo creación', async () => {
    const { component } = await setup();

    expect(component).toBeTruthy();
    expect(component.isEdit()).toBe(false);
  });

  it('define el control active en el formulario', async () => {
    const { component } = await setup();

    expect(component.form.contains('active')).toBe(true);
  });

  it('muestra el checkbox activa y lo vincula al control', async () => {
    const { fixture, component } = await setup();

    const checkbox = fixture.debugElement.query(By.css('input[formControlName="active"]'));
    expect(checkbox).toBeTruthy();
    expect((checkbox.nativeElement as HTMLInputElement).type).toBe('checkbox');

    component.form.get('active')!.setValue(true);
    fixture.detectChanges();
    expect((checkbox.nativeElement as HTMLInputElement).checked).toBe(true);

    component.form.get('active')!.setValue(false);
    fixture.detectChanges();
    expect((checkbox.nativeElement as HTMLInputElement).checked).toBe(false);
  });

  it('carga la resolución y activa el modo edición con :id', async () => {
    const { component, dianService } = await setup('res-1');

    expect(component.isEdit()).toBe(true);
    expect(dianService.getResolution).toHaveBeenCalledWith('res-1');
    expect(component.form.get('resolutionNumber')!.value).toBe('18764000123456');
    expect(component.form.get('active')!.value).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('crea la resolución cuando no hay id de edición', async () => {
    const { component, dianService } = await setup();

    component.form.patchValue({
      resolutionNumber: '999',
      rangeFrom: 1,
      rangeTo: 10,
      active: true,
    });
    component.submit();

    expect(dianService.createResolution).toHaveBeenCalledTimes(1);
    expect(dianService.updateResolution).not.toHaveBeenCalled();

    const body = dianService.createResolution.mock.calls[0][0] as DianResolutionRequest;
    expect(body.resolutionNumber).toBe('999');
    expect(body.active).toBe(true);
    expect(body.rangeFrom).toBe(1);
    expect(body.rangeTo).toBe(10);
  });

  it('actualiza la resolución cuando hay id de edición', async () => {
    const { component, dianService } = await setup('res-1');

    component.form.patchValue({ resolutionNumber: '555' });
    component.submit();

    expect(dianService.updateResolution).toHaveBeenCalledTimes(1);
    expect(dianService.createResolution).not.toHaveBeenCalled();
    expect(dianService.updateResolution.mock.calls[0][0]).toBe('res-1');
    expect(dianService.updateResolution.mock.calls[0][1]).toMatchObject({
      resolutionNumber: '555',
    });
  });

  it('no envía el formulario cuando es inválido', async () => {
    const { component, dianService } = await setup();

    component.form.patchValue({ resolutionNumber: '', rangeFrom: 0, rangeTo: 0 });
    component.submit();

    expect(dianService.createResolution).not.toHaveBeenCalled();
    expect(component.form.get('resolutionNumber')!.touched).toBe(true);
  });

  it('reporta el error del backend al guardar', async () => {
    const { component, dianService } = await setup();

    dianService.createResolution.mockReturnValue(
      throwError(() => ({ error: { message: 'Resolución inválida' } })),
    );

    component.form.patchValue({ resolutionNumber: '999', rangeFrom: 1, rangeTo: 10 });
    component.submit();

    expect(component.saving()).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith('Error', 'Resolución inválida', 'error');
  });
});
