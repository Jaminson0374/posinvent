import { describe, expect, it } from 'vitest';

import type { Batch } from '../models/batch.model';
import { DESPOSTE_SOURCE_TYPE, type ManualDesposteRequest } from '../models/desposte.model';
import {
  DesposteDomainError,
  planManualDesposteForExistingBatch,
  validateMassBalance,
} from './desposte-slice';

describe('desposte-slice', () => {
  const batch: Batch = {
    id: 'batch-001',
    supplierId: 'supplier-001',
    warehouseId: 'warehouse-canal',
    entryDate: '2026-05-13T08:00:00Z',
    initialWeight: 100,
    purchaseCost: 1_000,
    status: 'OPEN',
    notes: null,
    productId: 'product-001',
    productName: 'Producto Test',
    supplierName: 'Proveedor Test',
    warehouseName: 'Bodega Canal',
    createdBy: 'user-001',
    createdAt: '2026-05-13T08:00:00Z',
    updatedBy: null,
    updatedAt: '2026-05-13T08:00:00Z',
  };

  const request: ManualDesposteRequest = {
    sourceBatchId: batch.id,
    sourceType: DESPOSTE_SOURCE_TYPE.MANUAL,
    manualJustification: 'Slice 1 manual sin integracion de bascula',
    wasteWeight: 4,
    shrinkWeight: 0.5,
    notes: 'Primer slice',
    cuts: [
      {
        productId: 'prod-paleta',
        warehouseId: 'warehouse-cortes',
        weight: 60,
        suggestedSalePrice: 20,
      },
      {
        productId: 'prod-costilla',
        warehouseId: 'warehouse-cortes',
        weight: 35,
        suggestedSalePrice: 10,
      },
    ],
  };

  it('acepta el MVM en el limite exacto de 0.5%', () => {
    const massBalance = validateMassBalance(
      batch.initialWeight,
      request.cuts,
      request.wasteWeight,
      request.shrinkWeight,
    );

    expect(massBalance.withinTolerance).toBe(true);
    expect(massBalance.deviation).toBe(0.5);
    expect(massBalance.tolerance).toBe(0.5);
  });

  it('rechaza el desposte cuando la desviacion supera 0.5%', () => {
    expect(() =>
      validateMassBalance(batch.initialWeight, request.cuts, request.wasteWeight, 0),
    ).toThrowError(
      new DesposteDomainError('MVM excedida: desviacion 1 kg sobre tolerancia 0.5 kg'),
    );
  });

  it('planifica el slice manual, distribuye el costo y cierra el lote origen', () => {
    const result = planManualDesposteForExistingBatch(batch, request);

    expect(result.totalCommercialValue).toBe(1_550);
    expect(result.totalAllocatedCost).toBe(batch.purchaseCost);
    expect(result.cuts).toHaveLength(2);
    expect(result.stockUpserts).toEqual([
      {
        productId: 'prod-paleta',
        batchId: 'batch-001',
        warehouseId: 'warehouse-cortes',
        quantityDelta: 60,
        unitCost: 12.903226,
      },
      {
        productId: 'prod-costilla',
        batchId: 'batch-001',
        warehouseId: 'warehouse-cortes',
        quantityDelta: 35,
        unitCost: 6.451613,
      },
    ]);
    expect(result.sourceBatchTransition).toEqual({
      batchId: 'batch-001',
      previousStatus: 'OPEN',
      nextStatus: 'CLOSED',
      action: 'CLOSE',
    });
  });
});
