import type { PageResponse } from './page.model';

export const SHIFT_STATUS = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const;
export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS];

export interface Shift {
  id: string;
  cashRegisterId: string;
  cashRegisterName?: string;
  userId: string;
  userName?: string;
  assignedTo?: string | null;
  closedBy?: string | null;
  openingTime: string;
  closingTime: string | null;
  openingAmount: number;
  closingAmount: number | null;
  status: ShiftStatus;
  zReportUrl: string | null;
  createdAt: string;
}

export interface ShiftRequest {
  cashRegisterId: string;
  openingAmount?: number;
  assignedTo?: string;
}

export interface CashCountRequest {
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalCredit: number;
  notes?: string;
}

export interface CashCountLine {
  denominationValue: number;
  denominationType: 'BILL' | 'COIN';
  quantity: number;
}

export interface RegisterCashCountRequest {
  lines: CashCountLine[];
  notes?: string | null;
}

export interface CashCountResponse {
  id: string;
  shiftId: string;
  expectedTotal: number;
  countedTotal: number;
  difference: number;
  createdAt: string;
}

export type { PageResponse };
