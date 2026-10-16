export type PurchaseOrderStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export type TaxType = 'EXENTO' | 'IVA_5' | 'IVA_19';

export const TAX_RATES: Record<TaxType, number> = {
  EXENTO: 0,
  IVA_5: 5,
  IVA_19: 19,
};

export const TAX_LABELS: Record<TaxType, string> = {
  EXENTO: 'Exento',
  IVA_5: 'IVA 5%',
  IVA_19: 'IVA 19%',
};

export interface PurchaseLineItem {
  id?: string;
  productId: string;
  warehouseId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  discountPct: number;
  taxType: TaxType;
  lineNumber: number;
}

export interface PurchaseLineItemResponse extends PurchaseLineItem {
  productName: string;
  warehouseName: string;
  remainingQty: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  documentNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  dueDate?: string;
  supplierAddress?: string;
  buyerId?: string;
  buyerName?: string;
  paymentMethod?: string;
  supportDocumentType?: string;
  supportDocumentNumber?: string;
  currency?: string;
  notes: string | null;
  lines: PurchaseLineItemResponse[];
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface PurchaseOrderRequest {
  supplierId: string;
  orderDate: string;
  dueDate?: string | null;
  buyerId?: string | null;
  paymentMethod?: string | null;
  supportDocumentType?: string | null;
  supportDocumentNumber?: string | null;
  currency?: string | null;
  notes?: string | null;
  lines: Omit<PurchaseLineItem, 'id' | 'receivedQty'>[];
}
