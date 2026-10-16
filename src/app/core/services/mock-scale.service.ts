import { Injectable, signal } from '@angular/core';
import { SCALE_STATUS, ScaleReading, ScaleStatus } from '../models/scale.model';
import { ScaleService } from './scale.service';

/**
 * Simulated scale used as fallback when the Web Serial API is unavailable.
 * Emits random weights every 800ms so the POS flow stays exercisable.
 */
@Injectable({ providedIn: 'root' })
export class MockScaleService extends ScaleService {
  readonly currentReading = signal<ScaleReading | null>(null);
  readonly status = signal<ScaleStatus>(SCALE_STATUS.DISCONNECTED);
  readonly errorMessage = signal<string | null>(null);

  private intervalId: number | null = null;

  async connect(): Promise<void> {
    this.errorMessage.set(null);
    this.status.set(SCALE_STATUS.CONNECTED);
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
  }

  startPolling(): void {
    if (this.intervalId !== null) return;

    this.errorMessage.set(null);
    this.status.set(SCALE_STATUS.CONNECTED);
    this.intervalId = window.setInterval(() => {
      const weight = Math.round((Math.random() * 24.5 + 0.5) * 100) / 100;
      this.currentReading.set({
        weight,
        unit: 'kg',
        stable: true,
        timestamp: new Date().toISOString(),
      });
    }, 800);
  }

  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentReading.set(null);
    this.status.set(SCALE_STATUS.DISCONNECTED);
  }
}
