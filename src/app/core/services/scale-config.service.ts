import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const SCALE_BAUD_RATE_KEY = 'pos_scale_baudRate';
export const SCALE_PARSE_PATTERN_KEY = 'pos_scale_parsePattern';
export const SCALE_STABLE_TOKEN_KEY = 'pos_scale_stableToken';

export const DEFAULT_SCALE_BAUD_RATE = 9600;
/** Matches frames like `ST,GS,+   1.234 kg`; group 1 = weight, group 2 = unit. */
export const DEFAULT_SCALE_PARSE_PATTERN =
  '^[A-Za-z]+,[A-Za-z]+,\\s*([+-]?\\s*\\d+(?:\\.\\d+)?)\\s*([A-Za-z]+)';
export const DEFAULT_SCALE_STABLE_TOKEN = 'ST';

/**
 * Minimal reactive view of the scale configuration needed by the Web Serial
 * implementation. Declared as an interface so it can be stubbed in tests.
 */
export interface ScaleConfigSource {
  readonly baudRate: () => number;
  readonly parsePattern: () => string;
  readonly stableToken: () => string;
}

/** Persists the brand-agnostic scale connection settings in localStorage. */
@Injectable({ providedIn: 'root' })
export class ScaleConfigService implements ScaleConfigSource {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _baudRate = signal<number>(
    this.readNumber(SCALE_BAUD_RATE_KEY, DEFAULT_SCALE_BAUD_RATE),
  );
  private readonly _parsePattern = signal<string>(
    this.readString(SCALE_PARSE_PATTERN_KEY, DEFAULT_SCALE_PARSE_PATTERN),
  );
  private readonly _stableToken = signal<string>(
    this.readString(SCALE_STABLE_TOKEN_KEY, DEFAULT_SCALE_STABLE_TOKEN),
  );

  readonly baudRate = this._baudRate.asReadonly();
  readonly parsePattern = this._parsePattern.asReadonly();
  readonly stableToken = this._stableToken.asReadonly();

  setBaudRate(value: number): void {
    const normalized =
      Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_SCALE_BAUD_RATE;
    this._baudRate.set(normalized);
    this.write(SCALE_BAUD_RATE_KEY, String(normalized));
  }

  setParsePattern(value: string): void {
    const normalized = (value ?? '').trim() || DEFAULT_SCALE_PARSE_PATTERN;
    this._parsePattern.set(normalized);
    this.write(SCALE_PARSE_PATTERN_KEY, normalized);
  }

  setStableToken(value: string): void {
    const normalized = (value ?? '').trim() || DEFAULT_SCALE_STABLE_TOKEN;
    this._stableToken.set(normalized);
    this.write(SCALE_STABLE_TOKEN_KEY, normalized);
  }

  reset(): void {
    this._baudRate.set(DEFAULT_SCALE_BAUD_RATE);
    this._parsePattern.set(DEFAULT_SCALE_PARSE_PATTERN);
    this._stableToken.set(DEFAULT_SCALE_STABLE_TOKEN);
    if (this.isBrowser) {
      localStorage.removeItem(SCALE_BAUD_RATE_KEY);
      localStorage.removeItem(SCALE_PARSE_PATTERN_KEY);
      localStorage.removeItem(SCALE_STABLE_TOKEN_KEY);
    }
  }

  private readString(key: string, fallback: string): string {
    if (!this.isBrowser) return fallback;
    const raw = localStorage.getItem(key);
    return raw && raw.trim() ? raw : fallback;
  }

  private readNumber(key: string, fallback: number): number {
    if (!this.isBrowser) return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private write(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }
}
