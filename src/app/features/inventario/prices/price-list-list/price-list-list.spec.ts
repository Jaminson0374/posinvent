import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { PriceListListComponent } from './price-list-list';
import { PriceListService } from '../../../../core/services/price-list.service';
import { QuickCreatePriceListDialogComponent } from '../dialogs/quick-create-price-list.dialog';
import type { PriceList } from '../../../../core/models/product-catalog.model';

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
  __esModule: true,
}));

const mayorista: PriceList = {
  id: 'pl-1',
  code: 'MAY',
  name: 'Mayorista',
  description: 'Precio mayorista',
  active: true,
};

const minorista: PriceList = {
  id: 'pl-2',
  code: 'MIN',
  name: 'Minorista',
  description: null,
  active: true,
};

describe('PriceListListComponent', () => {
  let fixture: ComponentFixture<PriceListListComponent>;
  let component: PriceListListComponent;

  const priceListsValue = signal<PriceList[]>([mayorista, minorista]);
  const service = {
    priceLists: {
      value: priceListsValue,
      isLoading: signal(false),
      error: signal<string | null>(null),
    },
    deactivate: vi.fn(),
    reload: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const dialog = { open: vi.fn() };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    priceListsValue.set([mayorista, minorista]);
    service.deactivate.mockReset();
    service.deactivate.mockReturnValue(of(undefined));
    service.reload.mockReset();
    dialog.open.mockReset();
    (Swal.fire as ReturnType<typeof vi.fn>).mockReset();
    (Swal.fire as ReturnType<typeof vi.fn>).mockResolvedValue({ isConfirmed: true });

    await TestBed.configureTestingModule({
      imports: [PriceListListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PriceListService, useValue: service },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceListListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('devuelve todas las listas cuando no hay búsqueda', () => {
    expect(component.filteredPriceLists().map((p) => p.id)).toEqual(['pl-1', 'pl-2']);
  });

  it('filtra por código, nombre y descripción', () => {
    component.searchControl.setValue('mayor');
    expect(component.filteredPriceLists().map((p) => p.id)).toEqual(['pl-1']);

    component.searchControl.setValue('minor');
    expect(component.filteredPriceLists().map((p) => p.id)).toEqual(['pl-2']);
  });

  it('abre el diálogo de creación con el nombre inicial recortado', () => {
    component.searchControl.setValue('  Promo  ');

    component.openCreateDialog();

    expect(dialog.open).toHaveBeenCalledWith(
      QuickCreatePriceListDialogComponent,
      expect.objectContaining({ data: { initialName: 'Promo' } }),
    );
  });

  it('abre el diálogo de edición con la lista seleccionada', () => {
    component.openEditDialog(mayorista);

    expect(dialog.open).toHaveBeenCalledWith(
      QuickCreatePriceListDialogComponent,
      expect.objectContaining({ data: { priceList: mayorista } }),
    );
  });

  it('desactiva y recarga cuando el usuario confirma', async () => {
    await component.delete(mayorista);

    expect(service.deactivate).toHaveBeenCalledWith('pl-1');
    expect(service.reload).toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  it('no desactiva cuando el usuario cancela', async () => {
    (Swal.fire as ReturnType<typeof vi.fn>).mockResolvedValue({ isConfirmed: false });

    await component.delete(mayorista);

    expect(service.deactivate).not.toHaveBeenCalled();
    expect(service.reload).not.toHaveBeenCalled();
  });

  it('muestra un error cuando falla la desactivación', async () => {
    service.deactivate.mockReturnValue(throwError(() => ({ error: { message: 'No permitido' } })));

    await component.delete(mayorista);

    expect(service.reload).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledTimes(2);
  });
});
