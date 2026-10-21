import { describe, expect, it } from 'vitest';

import type { SalesDocumentStatus, SalesDocumentType } from '../models/sale.model';
import { allowedSalesTransitions } from './sales-transition';

describe('allowedSalesTransitions', () => {
  describe('QUOTE', () => {
    it('allows DRAFT -> SENT only', () => {
      expect(allowedSalesTransitions('QUOTE', 'DRAFT')).toEqual(['SENT']);
    });

    it('allows SENT -> ACCEPTED, REJECTED and EXPIRED', () => {
      expect(allowedSalesTransitions('QUOTE', 'SENT')).toEqual(['ACCEPTED', 'REJECTED', 'EXPIRED']);
    });

    it.each<SalesDocumentStatus>(['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])(
      'returns no transitions from terminal status %s',
      (status) => {
        expect(allowedSalesTransitions('QUOTE', status)).toEqual([]);
      },
    );
  });

  describe('ORDER', () => {
    it('allows DRAFT -> CONFIRMED and CANCELLED', () => {
      expect(allowedSalesTransitions('ORDER', 'DRAFT')).toEqual(['CONFIRMED', 'CANCELLED']);
    });

    it('allows CONFIRMED -> CANCELLED, INVOICED and PARTIALLY_INVOICED', () => {
      expect(allowedSalesTransitions('ORDER', 'CONFIRMED')).toEqual([
        'CANCELLED',
        'INVOICED',
        'PARTIALLY_INVOICED',
      ]);
    });

    it('allows PARTIALLY_INVOICED -> INVOICED and PARTIALLY_INVOICED', () => {
      expect(allowedSalesTransitions('ORDER', 'PARTIALLY_INVOICED')).toEqual([
        'INVOICED',
        'PARTIALLY_INVOICED',
      ]);
    });

    it.each<SalesDocumentStatus>(['INVOICED', 'CANCELLED', 'SENT', 'ACCEPTED'])(
      'returns no transitions from unsupported status %s',
      (status) => {
        expect(allowedSalesTransitions('ORDER', status)).toEqual([]);
      },
    );
  });

  describe.each<SalesDocumentType>(['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'])('%s', (type) => {
    it('allows DRAFT -> ISSUED only', () => {
      expect(allowedSalesTransitions(type, 'DRAFT')).toEqual(['ISSUED']);
    });

    it('allows ISSUED -> PAID and CANCELLED', () => {
      expect(allowedSalesTransitions(type, 'ISSUED')).toEqual(['PAID', 'CANCELLED']);
    });

    it.each<SalesDocumentStatus>(['PAID', 'CANCELLED'])(
      'returns no transitions from %s',
      (status) => {
        expect(allowedSalesTransitions(type, status)).toEqual([]);
      },
    );
  });

  it('returns an empty list for an unknown document type', () => {
    expect(allowedSalesTransitions('UNKNOWN' as SalesDocumentType, 'DRAFT')).toEqual([]);
  });

  it('returns a fresh array that callers cannot mutate to corrupt the matrix', () => {
    const first = allowedSalesTransitions('QUOTE', 'SENT');
    first.pop();

    expect(allowedSalesTransitions('QUOTE', 'SENT')).toEqual(['ACCEPTED', 'REJECTED', 'EXPIRED']);
  });
});
