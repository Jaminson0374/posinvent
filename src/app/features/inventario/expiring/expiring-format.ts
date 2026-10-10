const MS_PER_DAY = 86_400_000;

export type UrgencyLevel = 'EXPIRED' | 'CRITICAL' | 'HIGH' | 'UPCOMING' | 'NORMAL';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normalizes the raw `expiration_date` value shipped by the backend.
 * The native query returns a `java.sql.Date` inside a raw map, so the wire
 * value can be an ISO string, epoch milliseconds, or a `[y, m, d]` array.
 * Returns `null` for any value that cannot be interpreted as a date.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // Date-only strings are parsed as local calendar dates to avoid the
    // timezone shift that `new Date('2026-01-31')` (UTC midnight) introduces.
    const dateOnly = DATE_ONLY.exec(trimmed);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const local = new Date(year, month - 1, day);
      return Number.isNaN(local.getTime()) ? null : local;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (Array.isArray(value)) {
    const [year, month, day] = value;
    if (
      typeof year !== 'number' ||
      typeof month !== 'number' ||
      typeof day !== 'number' ||
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return null;
    }
    // Calendar array [y, m, d] uses a 1-based month (January = 1).
    const local = new Date(year, month - 1, day);
    return Number.isNaN(local.getTime()) ? null : local;
  }

  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Whole days from `from` (default: now) to `expiration`, both normalized to
 * local midnight. Negative means the expiration date is in the past.
 */
export function daysUntil(expiration: Date, from: Date = new Date()): number {
  return Math.ceil((startOfDay(expiration).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function urgencyLevel(days: number): UrgencyLevel {
  if (days < 0) return 'EXPIRED';
  if (days <= 7) return 'CRITICAL';
  if (days <= 15) return 'HIGH';
  if (days <= 30) return 'UPCOMING';
  return 'NORMAL';
}

export function urgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'EXPIRED':
      return 'Vencido';
    case 'CRITICAL':
      return 'Crítico';
    case 'HIGH':
      return 'Alto';
    case 'UPCOMING':
      return 'Próximo';
    case 'NORMAL':
      return 'Normal';
  }
}

export function urgencyClass(level: UrgencyLevel): string {
  switch (level) {
    case 'EXPIRED':
      return 'urgency-expired';
    case 'CRITICAL':
      return 'urgency-critical';
    case 'HIGH':
      return 'urgency-high';
    case 'UPCOMING':
      return 'urgency-upcoming';
    case 'NORMAL':
      return 'urgency-normal';
  }
}
