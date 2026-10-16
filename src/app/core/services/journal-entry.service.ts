import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { JournalEntry, LedgerRow, TrialBalanceRow } from '../models/journal-entry.model';

@Injectable({ providedIn: 'root' })
export class JournalEntryService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/journal-entries';

  list(
    params: { sourceType?: string; from?: string; to?: string } = {},
  ): Observable<JournalEntry[]> {
    const p = new URLSearchParams();
    if (params.sourceType) p.set('sourceType', params.sourceType);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    return this.http.get<JournalEntry[]>(`${this.base}?${p.toString()}`);
  }

  create(req: {
    entryDate: string;
    description?: string;
    justification: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
  }): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.base, req);
  }

  ledger(accountId: string, from?: string, to?: string): Observable<LedgerRow[]> {
    const p = new URLSearchParams({ accountId });
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return this.http.get<LedgerRow[]>(`${this.base}/ledger?${p.toString()}`);
  }

  trialBalance(from?: string, to?: string): Observable<TrialBalanceRow[]> {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return this.http.get<TrialBalanceRow[]>(`${this.base}/trial-balance?${p.toString()}`);
  }
}
