export interface JournalEntryLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  justification: string | null;
  createdAt: string;
  lines: JournalEntryLine[];
}

export interface LedgerRow {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  accountId: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
}
