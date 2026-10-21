import type { SalesDocumentStatus, SalesDocumentType } from '../models/sale.model';

/**
 * Allowed status transitions for a sales document.
 *
 * This is a pure mirror of the backend `SalesDocument.validateTransition` matrix. It must stay
 * dependency-free so every UI surface (detail, quote form, future screens) derives its actions
 * from the same source. The backend remains the authority; this only avoids offering actions it
 * will reject.
 */
export function allowedSalesTransitions(
  type: SalesDocumentType,
  status: SalesDocumentStatus,
): SalesDocumentStatus[] {
  switch (type) {
    case 'QUOTE':
      return quoteTransitions(status);
    case 'ORDER':
      return orderTransitions(status);
    case 'INVOICE':
    case 'CREDIT_NOTE':
    case 'DEBIT_NOTE':
      return invoiceTransitions(status);
    default:
      return [];
  }
}

function quoteTransitions(status: SalesDocumentStatus): SalesDocumentStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['SENT'];
    case 'SENT':
      return ['ACCEPTED', 'REJECTED', 'EXPIRED'];
    default:
      return [];
  }
}

function orderTransitions(status: SalesDocumentStatus): SalesDocumentStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['CANCELLED', 'INVOICED', 'PARTIALLY_INVOICED'];
    case 'PARTIALLY_INVOICED':
      return ['INVOICED', 'PARTIALLY_INVOICED'];
    default:
      return [];
  }
}

function invoiceTransitions(status: SalesDocumentStatus): SalesDocumentStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['ISSUED'];
    case 'ISSUED':
      return ['PAID', 'CANCELLED'];
    default:
      return [];
  }
}
