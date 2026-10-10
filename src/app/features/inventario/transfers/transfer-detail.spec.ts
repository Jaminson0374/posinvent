import '@angular/compiler';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { TransferDetailComponent } from './transfer-detail';
import { TransferService } from '../../../core/services/transfer.service';
import type { TransferResponse } from '../../../core/models/transfer.model';

function createTransfer(overrides: Partial<TransferResponse> = {}): TransferResponse {
  return {
    id: 'tr-1',
    sourceWarehouseId: 'wh-1',
    targetWarehouseId: 'wh-2',
    status: 'CONFIRMED',
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-05-14T10:00:00Z',
    confirmedBy: 'user-2',
    confirmedAt: '2026-05-15T10:00:00Z',
    items: [],
    ...overrides,
  };
}

describe('TransferDetailComponent', () => {
  let fixture: ComponentFixture<TransferDetailComponent>;
  let component: TransferDetailComponent;

  const paramMapGet = vi.fn();
  const route = { snapshot: { paramMap: { get: paramMapGet } } };
  const transferService = { getById: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    paramMapGet.mockReset();
    transferService.getById.mockReset();
    transferService.getById.mockReturnValue(of(createTransfer()));
    paramMapGet.mockReturnValue('tr-1');

    await TestBed.configureTestingModule({
      imports: [TransferDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: TransferService, useValue: transferService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferDetailComponent);
    component = fixture.componentInstance;
  });

  it('crea el componente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('carga el traslado usando el id de la ruta', () => {
    fixture.detectChanges();

    expect(transferService.getById).toHaveBeenCalledWith('tr-1');
    expect(component.transfer()).toEqual(createTransfer());
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('informa error cuando la ruta no trae id', () => {
    paramMapGet.mockReturnValue(null);

    fixture.detectChanges();

    expect(transferService.getById).not.toHaveBeenCalled();
    expect(component.error()).toBe('ID de traslado no proporcionado.');
    expect(component.transfer()).toBeNull();
  });

  it('expone el error cuando falla la carga', () => {
    transferService.getById.mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error al cargar el traslado.');
  });

  it('traduce los estados a etiquetas legibles', () => {
    expect(component.statusLabel('DRAFT')).toBe('Borrador');
    expect(component.statusLabel('CONFIRMED')).toBe('Confirmado');
    expect(component.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(component.statusLabel('OTRO')).toBe('OTRO');
  });
});
