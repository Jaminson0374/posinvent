import type { Signal } from '@angular/core';
import { ScaleReading, ScaleStatus } from '../models/scale.model';

/**
 * Brand-agnostic scale contract. Implementations may talk to real hardware
 * (Web Serial) or simulate readings; consumers only depend on this token.
 */
export abstract class ScaleService {
  abstract readonly currentReading: Signal<ScaleReading | null>;
  abstract readonly status: Signal<ScaleStatus>;
  abstract readonly errorMessage: Signal<string | null>;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract startPolling(): void;
  abstract stopPolling(): void;
}
