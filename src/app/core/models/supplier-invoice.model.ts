export type InvoiceStatus = 'PENDING' | 'RECONCILED' | 'PAID' | 'DISPUTED';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  ivaTotal: number;
  retentionTotal: number;
  total: number;
  status: InvoiceStatus;
  ocIds: string[];
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SupplierInvoiceRequest {
  supplierId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  ivaTotal: number;
  // Optional manual override. When null the backend computes the retention data-driven from the
  // active PurchaseRetentionConfig catalog (retefuente) plus the company-level ICA rate.
  retentionTotal: number | null;
  total: number;
  ocIds?: string[];
  notes?: string | null;
}

/**
 * Net supplier position.
 * `netPosition = payableOutstanding - advanceBalance`:
 * positive = we owe the supplier; negative = we have credit in our favor.
 */
export interface SupplierBalance {
  supplierId: string;
  payableOutstanding: number;
  advanceBalance: number;
  netPosition: number;
}
