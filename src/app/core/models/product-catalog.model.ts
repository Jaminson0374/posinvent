export interface ProductType {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ProductState {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductModel {
  id: string;
  name: string;
  brandId: string | null;
  active: boolean;
}

export interface ProductCatalogCategory {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductGroup {
  id: string;
  name: string;
  categoryId: string | null;
  active: boolean;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  baseUnit: string | null;
  active: boolean;
}

export interface PriceList {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface PucAccount {
  id: string;
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  accountClass: number;
  accountNature: string;
  allowsTransactions: boolean;
  active: boolean;
  updatedAt?: string;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  name: string;
  description: string | null;
  active: boolean;
}
