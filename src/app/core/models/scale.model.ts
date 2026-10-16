export const SCALE_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
} as const;

export type ScaleStatus = (typeof SCALE_STATUS)[keyof typeof SCALE_STATUS];

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  timestamp: string;
}

export interface ScaleState {
  status: ScaleStatus;
  currentReading: ScaleReading | null;
  errorMessage: string | null;
}

/**
 * Unit-of-measure codes that represent a physical weight. Products whose UoM is
 * one of these must be sold by capturing a scale reading, not by manual quantity.
 */
export const WEIGHT_UOM_CODES: ReadonlySet<string> = new Set([
  'KG',
  'KGS',
  'KILOGRAMO',
  'KILOGRAMOS',
  'G',
  'GR',
  'GRS',
  'GRM',
  'GRAMO',
  'GRAMOS',
  'MG',
  'MILIGRAMO',
  'MILIGRAMOS',
  'LB',
  'LIBRA',
  'LIBRAS',
  'TON',
  'TONELADA',
  'TONELADAS',
]);

/** Returns true when a UoM code (e.g. `KG`, `G`, `UND`) denotes a weight. */
export function isWeightUomCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return WEIGHT_UOM_CODES.has(code.trim().toUpperCase());
}

/** Grams/kilograms/... per one unit, used to normalise a scale reading to kg. */
const KG_PER_UNIT: Readonly<Record<string, number>> = {
  KG: 1,
  KGS: 1,
  KILOGRAMO: 1,
  KILOGRAMOS: 1,
  G: 0.001,
  GR: 0.001,
  GRS: 0.001,
  GRM: 0.001,
  GRAMO: 0.001,
  GRAMOS: 0.001,
  MG: 0.000001,
  MILIGRAMO: 0.000001,
  MILIGRAMOS: 0.000001,
  LB: 0.45359237,
  LIBRA: 0.45359237,
  LIBRAS: 0.45359237,
  TON: 1000,
  TONELADA: 1000,
  TONELADAS: 1000,
};

/** Converts a scale reading into kilograms regardless of the reported unit. */
export function toKilograms(weight: number, unit: string): number {
  if (!Number.isFinite(weight)) return 0;
  const factor = KG_PER_UNIT[(unit ?? '').trim().toUpperCase()] ?? 1;
  return weight * factor;
}
