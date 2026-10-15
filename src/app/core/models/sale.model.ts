export const SALES_DOCUMENT_TYPE = {
  QUOTE: 'QUOTE',
  ORDER: 'ORDER',
  INVOICE: 'INVOICE',
  CREDIT_NOTE: 'CREDIT_NOTE',
  DEBIT_NOTE: 'DEBIT_NOTE',
} as const;
export type SalesDocumentType = (typeof SALES_DOCUMENT_TYPE)[keyof typeof SALES_DOCUMENT_TYPE];

export const SALES_DOCUMENT_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_INVOICED: 'PARTIALLY_INVOICED',
  INVOICED: 'INVOICED',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type SalesDocumentStatus =
  (typeof SALES_DOCUMENT_STATUS)[keyof typeof SALES_DOCUMENT_STATUS];

export interface SalesDocument {
  id: string;
  type: SalesDocumentType;
  status: SalesDocumentStatus;
  documentNumber: string;
  clientId: string;
  clientName: string | null;
  warehouseId: string;
  shiftId: string | null;
  cashRegisterId: string | null;
  sourceDocumentId: string | null;
  totalNet: number;
  totalTax0: number;
  totalTax5: number;
  totalTax8: number;
  totalTax19: number;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  items: SaleItem[];
  dueDate: string | null;
  isCreditSale: boolean;
}

export interface SaleItem {
  id: string;
  documentId: string;
  productId: string;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  taxType: string;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  lineNumber: number;
  batchId: string | null;
}

export interface SalesDocumentRequest {
  type: SalesDocumentType;
  clientId: string;
  warehouseId: string;
  shiftId?: string;
  cashRegisterId?: string;
  sourceDocumentId?: string;
}

export interface SaleItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxType: string;
  batchId?: string | null;
}

export interface TransitionRequest {
  targetStatus: SalesDocumentStatus;
}
