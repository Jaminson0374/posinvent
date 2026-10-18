import '@angular/compiler';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ClientListComponent } from './client-list';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { ThirdParty } from '../../../core/models/third-party.model';
import type { PageResponse } from '../../../core/models/page.model';

const clientRow: ThirdParty = {
  id: 'client-1',
  numIdentification: '900123456',
  dv: '7',
  identificationTypeId: 'id-type-1',
  identificationTypeCode: 'NIT',
  thirdPartyCategoryId: 'category-1',
  thirdPartyCategoryName: 'Cliente',
  type: 'CLIENT',
  personType: 'JURIDICA',
  name: 'Cliente Uno',
  lastName: null,
  commonName: 'Cliente Uno S.A.S.',
  phone: '3001234567',
  address: 'Calle 1 # 2-3',
  departmentId: 'dept-1',
  cityId: 'city-1',
  email: 'cliente1@example.com',
  website: null,
  active: true,
  creditDays: 30,
  creditLimit: 1000000,
  outstanding: 777,
  priceListId: null,
  entryDate: '2026-01-01',
  contactName: 'Contacto Uno',
  contactPhone: '3009876543',
  contactAddress: 'Calle 1 # 2-3',
  contactEmail: 'contacto@example.com',
  taxContactFirstName: 'Ana',
  taxContactLastName: 'Pérez',
  taxEmail: 'tributario@example.com',
  billingPhone: '3005555555',
  taxRegime: 'ORDINARIO',
  taxResponsibilities: ['RESPONSABLE_IVA'],
  isGranContribuyente: false,
  isAutoretenedor: false,
  isAgenteRetencionIva: false,
  isRegimenSimple: false,
  otherTaxResp: false,
  cityCode: '11001',
  dianClassification: null,
  employeeData: null,
  createdAt: '2026-01-01T00:00:00Z',
};

function page<T>(content: T[]): PageResponse<T> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  };
}

describe('ClientListComponent', () => {
  let fixture: ComponentFixture<ClientListComponent>;
  let component: ClientListComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(ThirdPartyService).typeFilter.set('CLIENT');
    fixture = TestBed.createComponent(ClientListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  async function flushClients(clients: ThirdParty[]): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/third-parties?page=0&size=10&type=CLIENT').flush(page(clients));
    httpMock.expectOne('/api/v1/third-parties/suppliers').flush([]);
    httpMock.expectOne('/api/v1/third-parties/employees/available').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders the derived outstanding balance under the Saldo CxC column', async () => {
    await flushClients([clientRow]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.displayedColumns).toContain('outstanding');
    expect(component.displayedColumns).not.toContain('currentBalance');
    expect(text).toContain('Saldo CxC');
    expect(text).toContain('777');
    expect(text).toContain('Cliente Uno');
  });

  it('renders 0 when the derived outstanding balance is null', async () => {
    await flushClients([{ ...clientRow, outstanding: null }]);

    const cell = (fixture.nativeElement as HTMLElement).querySelector(
      'mat-cell.mat-column-outstanding',
    );
    expect(cell?.textContent?.trim()).toBe('0');
  });
});
