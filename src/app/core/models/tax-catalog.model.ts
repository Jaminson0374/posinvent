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
  name: string;
  sortOrder: number;
}
