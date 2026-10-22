export interface TaxResponsibility {
  id: string;
  code: string;
  name: string;
  excludes: string[];
  sortOrder: number;
}

export interface FiscalResponsibility {
  id: string;
  code: string;
  name: string;
  excludes: string[];
  sortOrder: number;
}

export interface Tax {
  id: string;
  code: string;
  description: string;
  percentage: number;
  observation: string | null;
  dianCode: string | null;
  siigoTaxId: string | null;
  sortOrder: number;
  active: boolean;
}

export interface TaxRequest {
  code: string;
  description: string;
  percentage: number;
  observation: string | null;
  dianCode: string | null;
  siigoTaxId: string | null;
  sortOrder: number;
  active: boolean;
}
