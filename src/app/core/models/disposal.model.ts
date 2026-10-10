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

/** Row returned by GET /disposals/expiring-soon (raw native-query map, snake_case keys). */
export interface ExpiringBatch {
  batch_id: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  /** Postgres DATE may arrive as ISO string, epoch millis, or [y, m, d]. */
  expiration_date: string | number | number[];
  current_qty: number;
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
