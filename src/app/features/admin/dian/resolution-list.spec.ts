import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { ResolutionListComponent } from './resolution-list';
import { DianService } from '../../../core/services/dian.service';
import type { DianResolution } from '../../../core/models/dian.model';

vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

describe('ResolutionListComponent', () => {
  let fixture: ComponentFixture<ResolutionListComponent>;
  let component: ResolutionListComponent;

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

  const resolutionsResource = {
    value: vi.fn<() => DianResolution[] | undefined>(() => [resolution]),
    reload: vi.fn(),
  };

  const dianService = {
    resolutions: resolutionsResource,
    activateResolution: vi.fn(() => of({ ...resolution, active: true })),
    deactivateResolution: vi.fn(() => of({ ...resolution, active: false })),
    deleteResolution: vi.fn(() => of(void 0)),
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    resolutionsResource.value.mockReturnValue([resolution]);
    dianService.activateResolution.mockReturnValue(of({ ...resolution, active: true }));
    dianService.deactivateResolution.mockReturnValue(of({ ...resolution, active: false }));

    await TestBed.configureTestingModule({
      imports: [ResolutionListComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: DianService, useValue: dianService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResolutionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('define las columnas de la tabla', () => {
    expect(component.displayedColumns).toEqual([
      'resolutionNumber',
      'validFrom',
      'validTo',
      'prefix',
      'range',
      'active',
      'actions',
    ]);
  });

  it('renderiza las resoluciones de la lista', () => {
    const table = fixture.debugElement.query(By.css('table'));
    expect(table).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('.mat-mdc-row')).length).toBe(1);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('18764000123456');
    expect(text).toContain('SETP');
  });

  it('activa una resolución, recarga el recurso y notifica', () => {
    component.activate('res-1');

    expect(dianService.activateResolution).toHaveBeenCalledWith('res-1');
    expect(resolutionsResource.reload).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(
      'Activada',
      'Resolución activada correctamente.',
      'success',
    );
  });

  it('desactiva una resolución, recarga el recurso y notifica', () => {
    component.deactivate('res-1');

    expect(dianService.deactivateResolution).toHaveBeenCalledWith('res-1');
    expect(resolutionsResource.reload).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(
      'Desactivada',
      'Resolución desactivada correctamente.',
      'success',
    );
  });

  it('muestra el botón de desactivar cuando la resolución está activa', () => {
    expect(fixture.debugElement.query(By.css('button.deactivate-btn'))).toBeTruthy();
  });

  it('oculta el botón de desactivar cuando la resolución está inactiva', () => {
    resolutionsResource.value.mockReturnValue([{ ...resolution, active: false }]);
    const inactiveFixture = TestBed.createComponent(ResolutionListComponent);
    inactiveFixture.detectChanges();

    expect(inactiveFixture.debugElement.query(By.css('button.deactivate-btn'))).toBeNull();
    expect(inactiveFixture.debugElement.queryAll(By.css('.mat-mdc-row')).length).toBe(1);
  });

  it('reporta el error del backend al desactivar sin recargar', () => {
    dianService.deactivateResolution.mockReturnValue(
      throwError(() => ({ error: { message: 'No se pudo desactivar' } })),
    );

    component.deactivate('res-1');

    expect(resolutionsResource.reload).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith('Error', 'No se pudo desactivar', 'error');
  });
});
