/**
 * Pure formatting/derivation helpers for the MVM (merma/rendimiento) screen.
 * Keeping these free of Angular lets the mass-balance math be tested directly.
 */

/** Minimal shape needed to build the mass-balance bar. */
export interface BalanceSource {
  inputWeight: number;
  totalCutsWeight: number;
  wasteWeight: number;
  shrinkWeight: number;
}

export type BalanceSegmentKey = 'cuts' | 'waste' | 'shrink';

export interface BalanceSegment {
  key: BalanceSegmentKey;
  label: string;
  value: number;
  /** Share of the input weight, in percent. */
  pct: number;
  class: string;
}

/**
 * Splits a desposte mass balance into the three stacked-bar segments:
 * cuts (usable), waste (operational) and shrink (technical). Percentages are
 * relative to `inputWeight`; when the input weight is not positive all
 * percentages collapse to 0 to avoid NaN.
 */
export function balanceSegments(source: BalanceSource): BalanceSegment[] {
  const input = Number.isFinite(source.inputWeight) && source.inputWeight > 0 ? source.inputWeight : 0;
  const pctOf = (value: number): number => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return input > 0 ? (safe / input) * 100 : 0;
  };

  return [
    {
      key: 'cuts',
      label: 'Cortes aprovechables',
      value: source.totalCutsWeight,
      pct: pctOf(source.totalCutsWeight),
      class: 'seg-cuts',
    },
    {
      key: 'waste',
      label: 'Desperdicio',
      value: source.wasteWeight,
      pct: pctOf(source.wasteWeight),
      class: 'seg-waste',
    },
    {
      key: 'shrink',
      label: 'Merma técnica',
      value: source.shrinkWeight,
      pct: pctOf(source.shrinkWeight),
      class: 'seg-shrink',
    },
  ];
}

/** Thresholds chosen to flag a yield as healthy (>=90), watch (>=75) or poor. */
export function yieldClass(pct: number): string {
  if (!Number.isFinite(pct)) return 'yield-bad';
  if (pct >= 90) return 'yield-good';
  if (pct >= 75) return 'yield-warn';
  return 'yield-bad';
}

/** Formats a mass delta with an explicit sign for positives. */
export function formatSigned(value: number, digits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(digits)}`;
}
