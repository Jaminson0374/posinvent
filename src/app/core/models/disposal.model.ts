export type DisposalType = 'DECOMISO_SANITARIO' | 'RESIDUO_VENDIBLE' | 'MERMA_PROCESO';

export interface DisposalRequest {
  productId: string;
  batchId?: string | null;
  warehouseId: string;
  disposalType: DisposalType;
  quantity: number;
  reason: string;
  officialDocument?: string | null;
  disposalDate?: string | null;
}

export interface DisposalResponse {
  id: string;
  productId: string;
  batchId: string | null;
  warehouseId: string;
  disposalType: DisposalType;
  quantity: number;
  unitCost: number;
  reason: string;
  officialDocument: string | null;
  disposalDate: string | null;
  journalEntryId: string | null;
  registeredBy: string | null;
  createdAt: string;
}
