export type ThirdPartyBaseType = 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE' | 'BOTH';
export type PersonType = 'NATURAL' | 'JURIDICA';
export type TaxRegime = 'SIMPLE' | 'ORDINARIO';

/** @deprecated use ThirdPartyBaseType */
export type ThirdPartyType = ThirdPartyBaseType;

export interface EmployeeBasicData {
  position: string | null;
  costCenter: string | null;
  workCenter: string | null;
  gender: string | null;
  civilStatus: string | null;
  salesGroup: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  militaryId: string | null;
  isForeigner: boolean;
  natResidentExterior: boolean;
  isDeclarant: boolean;
  associatedSeller: string | null;
  requiresEndowment: boolean;
  isSenior: boolean;
}

export interface ThirdParty {
  id: string;
  numIdentification: string;
  dv: string | null;
  identificationTypeId: string | null;
  identificationTypeCode: string | null;
  thirdPartyCategoryId: string | null;
  thirdPartyCategoryName: string | null;
  type: ThirdPartyBaseType;
  personType: PersonType;
  name: string;
  lastName: string | null;
  commonName: string | null;
  phone: string | null;
  address: string | null;
  departmentId: string | null;
  cityId: string | null;
  email: string | null;
  website: string | null;
  active: boolean;
  creditDays: number;
  creditLimit: number;
  outstanding: number | null;
  priceListId: string | null;
  entryDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  taxContactFirstName: string | null;
  taxContactLastName: string | null;
  taxEmail: string | null;
  billingPhone: string | null;
  taxRegime: TaxRegime;
  taxResponsibilities: string[];
  isGranContribuyente: boolean;
  isAutoretenedor: boolean;
  isAgenteRetencionIva: boolean;
  isRegimenSimple: boolean;
  otherTaxResp: boolean;
  cityCode: string | null;
  dianClassification: string | null;
  employeeData: EmployeeBasicData | null;
  createdAt: string;
}

export interface ThirdPartySupplierOption {
  id: string;
  name: string;
  lastName: string | null;
  numIdentification: string;
  type: ThirdPartyBaseType;
  active: boolean;
}

export interface ThirdPartyRequest {
  numIdentification: string;
  type?: ThirdPartyBaseType;
  dv: string | null;
  identificationTypeId: string | null;
  thirdPartyCategoryId: string | null;
  personType: PersonType;
  name: string;
  lastName: string | null;
  commonName: string | null;
  phone: string | null;
  address: string | null;
  departmentId: string | null;
  cityId: string | null;
  email: string | null;
  website: string | null;
  creditDays: number;
  creditLimit: number;
  priceListId: string | null;
  entryDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  taxContactFirstName: string | null;
  taxContactLastName: string | null;
  taxEmail: string | null;
  billingPhone: string | null;
  taxRegime: TaxRegime;
  taxResponsibilities: string[];
  isGranContribuyente: boolean;
  isAutoretenedor: boolean;
  isAgenteRetencionIva: boolean;
  isRegimenSimple: boolean;
  otherTaxResp: boolean;
  cityCode: string | null;
  dianClassification: string | null;
  employeeData: EmployeeBasicData | null;
}
