export type TaxType = 'EXENTO' | 'IVA_5' | 'IVA_19';
export type CostingMethod =
  | 'PEPS'
  | 'PROMEDIO_PONDERADO'
  | 'ESTANDAR'
  | 'IDENTIFICACION_ESPECIFICA'
  | 'YIELD_COSTING';

import type { ProductPresentation } from './product-presentation.model';

export interface ProductWarehouse {
  id: string | null;
  warehouseId: string;
  locationId: string | null;
  unitOfMeasureId: string | null;
  isDefault: boolean;
}

export interface ProductSupplier {
  id: string | null;
  supplierId: string;
  supplierReference: string | null;
  unitCost: number | null;
  isMain: boolean;
}

export interface ProductImage {
  id: string | null;
  imageUrl: string;
  displayOrder: number;
}

export interface ProductPromotion {
  id: string | null;
  name: string;
  discountPct: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ProductPriceEntry {
  id: string | null;
  priceListId: string;
  price: number;
  profitMargin: number;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  barcode: string | null;
  reference: string | null;
  description: string | null;
  productTypeId: string | null;
  productStateId: string | null;
  brandId: string | null;
  modelId: string | null;
  categoryId: string | null;
  groupId: string | null;
  unitOfMeasureId: string | null;
  costPrice: number;
  profitMargin: number;
  taxType: TaxType;
  salePrice: number;
  costingMethod: CostingMethod;
  initialStock: number;
  minStock: number;
  maxStock: number;
  totalStock: number;
  manufacturedInHouse: boolean;
  costAffectingExp: boolean;
  manageLots: boolean;
  perishable: boolean;
  belongsToProduct: boolean;
  sellBelowMin: boolean;
  inventoriable: boolean;
  serialNumber: string | null;
  originCountry: string | null;
  specifications: string | null;
  incomeAccountId: string | null;
  inventoryAccountId: string | null;
  costOfSalesAcctId: string | null;
  accountingTemplateId: string | null;
  active: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  warehouses: ProductWarehouse[];
  suppliers: ProductSupplier[];
  images: ProductImage[];
  promotions: ProductPromotion[];
  priceEntries: ProductPriceEntry[];
  presentations?: ProductPresentation[];
}

export interface ProductRequest {
  productCode: string;
  name: string;
  barcode: string | null;
  reference: string | null;
  description: string | null;
  productTypeId: string | null;
  productStateId: string | null;
  brandId: string | null;
  modelId: string | null;
  categoryId: string | null;
  groupId: string | null;
  unitOfMeasureId: string | null;
  costPrice: number;
  profitMargin: number;
  taxType: TaxType;
  costingMethod: CostingMethod;
  initialStock: number;
  minStock: number;
  maxStock: number;
  manufacturedInHouse: boolean;
  costAffectingExp: boolean;
  manageLots: boolean;
  perishable: boolean;
  belongsToProduct: boolean;
  sellBelowMin: boolean;
  inventoriable: boolean;
  serialNumber: string | null;
  originCountry: string | null;
  specifications: string | null;
  incomeAccountId: string | null;
  inventoryAccountId: string | null;
  costOfSalesAcctId: string | null;
  accountingTemplateId: string | null;
  version: number;
  warehouses: ProductWarehouse[];
  suppliers: ProductSupplier[];
  images: ProductImage[];
  promotions: ProductPromotion[];
  priceEntries: ProductPriceEntry[];
}
