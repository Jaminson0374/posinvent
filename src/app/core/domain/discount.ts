// ── Discounts ──────────────────────────────────────────────────────────────
// Pure calculation mirrored from the backend DiscountEngineService so the POS
// display matches checkout to the cent. Rules (discount BEFORE IVA):
//   * line discount over gross = qty × unitPrice, clamped to [0, gross];
//   * document discount (% or amount) over the already line-discounted net,
//     prorated per line with the rounding residue pushed to the last line;
//   * tax is computed on the discounted base: total = net + tax0 + tax5 + tax19;
//   * every partial result is rounded HALF_UP to 2 decimals.
// Reference numbers: backend DiscountTotalsIntegrationTest, asserted by
// pos-venta.spec.ts ("mirrors the backend DiscountTotalsIntegrationTest numbers").

export type DiscountType = 'NONE' | 'PCT' | 'AMOUNT';

/** HALF_UP rounding to 2 decimals, mirroring BigDecimal.setScale(2, HALF_UP). */
export function roundHalfUp2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Less-than-one clamp helper for percentage inputs. */
function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

/** Line discount over the gross amount, clamped to [0, gross]. Mirrors calculateLineDiscount. */
export function calculateLineDiscount(
  gross: number,
  discountType: DiscountType | string | null | undefined,
  discountValue: number | null | undefined,
): number {
  const base = roundHalfUp2(gross);
  const value = discountValue ?? 0;
  let raw: number;

  switch (normalizeDiscountType(discountType)) {
    case 'PCT':
      raw = roundHalfUp2((base * clampPercent(value)) / 100);
      break;
    case 'AMOUNT':
      raw = value;
      break;
    default:
      raw = 0;
  }

  return roundHalfUp2(Math.min(Math.max(raw, 0), base));
}

/** Document discount over the already line-discounted net, clamped to that net. */
export function calculateDocumentDiscount(
  netBeforeDocument: number,
  discountType: DiscountType | string | null | undefined,
  discountValue: number | null | undefined,
): number {
  const base = roundHalfUp2(netBeforeDocument);
  const value = discountValue ?? 0;
  let raw: number;

  switch (normalizeDiscountType(discountType)) {
    case 'PCT':
      raw = roundHalfUp2((base * clampPercent(value)) / 100);
      break;
    case 'AMOUNT':
      raw = value;
      break;
    default:
      raw = 0;
  }

  return roundHalfUp2(Math.min(Math.max(raw, 0), base));
}

export function normalizeDiscountType(value: string | null | undefined): DiscountType {
  const normalized = (value ?? '').trim().toUpperCase();
  return normalized === 'PCT' || normalized === 'AMOUNT' ? normalized : 'NONE';
}

export interface DiscountLineInput {
  gross: number;
  /** Tax rate as a percentage (19, 5 or 0) — the backend passes percentages. */
  taxRatePercent: number;
  discountType?: DiscountType | string | null;
  discountValue?: number | null;
}

export interface DiscountLineResult {
  gross: number;
  taxRatePercent: number;
  lineDiscount: number;
  baseGravable: number;
  documentAllocated: number;
  finalBase: number;
  taxAmount: number;
}

export interface DiscountTotals {
  lines: DiscountLineResult[];
  netBeforeDocument: number;
  net: number;
  tax0: number;
  tax5: number;
  tax19: number;
  total: number;
  lineDiscountTotal: number;
  documentDiscount: number;
  discountTotal: number;
}

/** Full document calculation mirroring DiscountEngineService.calculate. */
export function computeDiscountTotals(
  lines: readonly DiscountLineInput[],
  documentDiscountType?: DiscountType | string | null,
  documentDiscountValue?: number | null,
): DiscountTotals {
  const results: DiscountLineResult[] = [];
  let netBeforeDoc = 0;
  let lineDiscountTotal = 0;

  for (const input of lines) {
    const gross = roundHalfUp2(input.gross);
    const lineDiscount = calculateLineDiscount(
      gross,
      input.discountType,
      input.discountValue,
    );
    const baseGravable = roundHalfUp2(Math.max(gross - lineDiscount, 0));
    netBeforeDoc = roundHalfUp2(netBeforeDoc + baseGravable);
    lineDiscountTotal = roundHalfUp2(lineDiscountTotal + lineDiscount);

    results.push({
      gross,
      taxRatePercent: roundHalfUp2(input.taxRatePercent),
      lineDiscount,
      baseGravable,
      documentAllocated: 0,
      finalBase: baseGravable,
      taxAmount: 0,
    });
  }

  const documentDiscount = calculateDocumentDiscount(
    netBeforeDoc,
    documentDiscountType,
    documentDiscountValue,
  );

  // Prorate the document discount per line; push the rounding residue to the last
  // line so sum(allocations) == documentDiscount exactly.
  let allocated = 0;
  for (let i = 0; i < results.length; i++) {
    const current = results[i];
    let lineDoc: number;

    if (i === results.length - 1) {
      lineDoc = Math.max(documentDiscount - allocated, 0);
    } else if (netBeforeDoc === 0) {
      lineDoc = 0;
    } else {
      lineDoc = roundHalfUp2((documentDiscount * current.baseGravable) / netBeforeDoc);
      allocated = roundHalfUp2(allocated + lineDoc);
    }

    const finalBase = roundHalfUp2(Math.max(current.baseGravable - lineDoc, 0));
    const taxAmount = roundHalfUp2((finalBase * current.taxRatePercent) / 100);

    results[i] = { ...current, documentAllocated: lineDoc, finalBase, taxAmount };
  }

  const net = roundHalfUp2(Math.max(netBeforeDoc - documentDiscount, 0));
  let tax0 = 0;
  let tax5 = 0;
  let tax19 = 0;

  for (const result of results) {
    if (result.taxRatePercent === 0) {
      tax0 = roundHalfUp2(tax0 + result.taxAmount);
    } else if (result.taxRatePercent === 5) {
      tax5 = roundHalfUp2(tax5 + result.taxAmount);
    } else {
      tax19 = roundHalfUp2(tax19 + result.taxAmount);
    }
  }

  const total = roundHalfUp2(net + tax0 + tax5 + tax19);
  const discountTotal = roundHalfUp2(lineDiscountTotal + documentDiscount);

  return {
    lines: results,
    netBeforeDocument: netBeforeDoc,
    net,
    tax0,
    tax5,
    tax19,
    total,
    lineDiscountTotal,
    documentDiscount,
    discountTotal,
  };
}
