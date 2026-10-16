export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA';

/** Mirrors the backend InvoicePaymentInput / InvoicePaymentBreakdown shape. */
export interface InvoicePayment {
  invoiceId: string;
  appliedAmount: number;
}

/** Mirrors backend PaymentResponse. */
export interface Payment {
  id: string;
  supplierId: string;
  supplierName: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  appliedBreakdown: InvoicePayment[];
}

/** Mirrors backend PaymentRequest. */
export interface PaymentRequest {
  supplierId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  invoicePayments: InvoicePayment[];
}
