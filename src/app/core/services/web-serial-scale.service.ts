import { isPlatformBrowser } from '@angular/common';
import { signal } from '@angular/core';
import { SCALE_STATUS, ScaleReading, ScaleStatus } from '../models/scale.model';
import {
  DEFAULT_SCALE_BAUD_RATE,
  DEFAULT_SCALE_PARSE_PATTERN,
  ScaleConfigSource,
} from './scale-config.service';
import { ScaleService } from './scale.service';

/** Minimal shape of a Web Serial port used by this service. */
export interface SerialPortLike {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface SerialApi {
  requestPort(options?: unknown): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

export interface ParsedScaleFrame {
  weight: number;
  unit: string;
  stable: boolean;
}

/**
 * Reads the raw `navigator.serial` API without touching it on the server.
 * Returns null when the Web Serial API is absent (SSR, old browsers).
 */
function getSerialApi(): SerialApi | null {
  if (typeof navigator === 'undefined') return null;
  const candidate = (navigator as unknown as { serial?: SerialApi }).serial;
  return candidate ?? null;
}

/** True only when running in a browser that exposes the Web Serial API. */
export function supportsWebSerial(): boolean {
  return getSerialApi() !== null;
}

/**
 * Parses a scale frame into a numeric weight + unit using a user-configurable
 * regular expression. Group 1 is the weight, group 2 is the unit. A frame is
 * considered stable when it contains the configured stable token.
 */
export function parseScaleFrame(
  frame: string,
  pattern: string,
  stableToken: string,
): ParsedScaleFrame | null {
  const raw = (frame ?? '').trim();
  if (!raw) return null;

  let regex: RegExp;
  try {
    regex = new RegExp(pattern || DEFAULT_SCALE_PARSE_PATTERN);
  } catch {
    return null;
  }

  const match = regex.exec(raw);
  if (!match) return null;

  const weightText = (match[1] ?? '').replace(/\s+/g, '');
  if (!weightText) return null;

  const weight = Number(weightText);
  if (!Number.isFinite(weight)) return null;

  const unit = (match[2] ?? '').trim().toLowerCase() || 'kg';
  const token = (stableToken ?? '').trim().toUpperCase();
  const stable = token.length > 0 && raw.toUpperCase().includes(token);

  return { weight, unit, stable };
}

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Error desconocido al comunicarse con la báscula';
}

/**
 * Real scale implementation over the Web Serial API. Never touches
 * `navigator.serial` outside a browser; `connect()` fails gracefully with an
 * ERROR status when the API is unavailable, so consumers can fall back.
 */
export class WebSerialScaleService extends ScaleService {
  private readonly _currentReading = signal<ScaleReading | null>(null);
  readonly currentReading = this._currentReading.asReadonly();
  private readonly _status = signal<ScaleStatus>(SCALE_STATUS.DISCONNECTED);
  readonly status = this._status.asReadonly();
  private readonly _errorMessage = signal<string | null>(null);
  readonly errorMessage = this._errorMessage.asReadonly();

  private readonly isBrowser: boolean;
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private polling = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly config: ScaleConfigSource,
    platformId: Object,
  ) {
    super();
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async connect(): Promise<void> {
    const serial = this.isBrowser ? getSerialApi() : null;
    if (!serial) {
      this._status.set(SCALE_STATUS.ERROR);
      this._errorMessage.set('Web Serial no está disponible en este navegador');
      return;
    }

    try {
      const knownPorts = await serial.getPorts();
      const port = knownPorts.length > 0 ? knownPorts[0] : await serial.requestPort();
      await port.open({ baudRate: this.resolveBaudRate() });
      this.port = port;
      this._status.set(SCALE_STATUS.CONNECTED);
      this._errorMessage.set(null);
    } catch (err) {
      this.port = null;
      this._status.set(SCALE_STATUS.ERROR);
      this._errorMessage.set(describeError(err));
    }
  }

  startPolling(): void {
    if (!this.port || this.polling) return;
    this.polling = true;
    this._status.set(SCALE_STATUS.CONNECTED);
    this.loopPromise = this.readLoop(this.port);
  }

  stopPolling(): void {
    this.polling = false;
    if (this.reader) {
      void this.reader.cancel().catch(() => undefined);
    }
    this._currentReading.set(null);
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    try {
      await this.loopPromise;
    } catch {
      // Reader teardown errors are non-fatal.
    }
    this.loopPromise = null;

    const port = this.port;
    this.port = null;
    if (port) {
      try {
        await port.close();
      } catch {
        // The port may already be closed by the OS/browser.
      }
    }

    if (this._status() !== SCALE_STATUS.ERROR) {
      this._status.set(SCALE_STATUS.DISCONNECTED);
    }
  }

  private resolveBaudRate(): number {
    const value = Number(this.config.baudRate());
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_SCALE_BAUD_RATE;
  }

  private async readLoop(port: SerialPortLike): Promise<void> {
    if (!port.readable) return;

    const decoderStream = port.readable.pipeThrough(
      new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>,
    );
    const reader = decoderStream.getReader();
    this.reader = reader;

    let buffer = '';
    try {
      while (this.polling) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) this.handleFrame(line);
        }
      }
    } catch (err) {
      if (this.polling) {
        this._status.set(SCALE_STATUS.ERROR);
        this._errorMessage.set(describeError(err));
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released after cancel().
      }
      if (this.reader === reader) this.reader = null;
    }
  }

  private handleFrame(frame: string): void {
    const parsed = parseScaleFrame(frame, this.config.parsePattern(), this.config.stableToken());
    if (!parsed) return;
    this._currentReading.set({
      weight: parsed.weight,
      unit: parsed.unit,
      stable: parsed.stable,
      timestamp: new Date().toISOString(),
    });
  }
}
