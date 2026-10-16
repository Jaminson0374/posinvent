import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCALE_STATUS } from '../models/scale.model';
import {
  DEFAULT_SCALE_PARSE_PATTERN,
  DEFAULT_SCALE_STABLE_TOKEN,
  ScaleConfigSource,
} from './scale-config.service';
import {
  SerialPortLike,
  WebSerialScaleService,
  parseScaleFrame,
  supportsWebSerial,
} from './web-serial-scale.service';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function makeConfig(
  overrides: Partial<{ baudRate: number; parsePattern: string; stableToken: string }> = {},
): ScaleConfigSource {
  return {
    baudRate: () => overrides.baudRate ?? 9600,
    parsePattern: () => overrides.parsePattern ?? DEFAULT_SCALE_PARSE_PATTERN,
    stableToken: () => overrides.stableToken ?? DEFAULT_SCALE_STABLE_TOKEN,
  };
}

function createFakePort(frames: string[]) {
  let index = 0;
  let releaseBlocked: (() => void) | null = null;

  const reader = {
    read: () => {
      if (index < frames.length) {
        const value = `${frames[index++]}\r\n`;
        return Promise.resolve({ value, done: false });
      }
      return new Promise<{ value: string | undefined; done: boolean }>((resolve) => {
        releaseBlocked = () => resolve({ value: undefined, done: true });
      });
    },
    cancel: () => {
      releaseBlocked?.();
      return Promise.resolve();
    },
    releaseLock: () => undefined,
  };

  const state = { opened: false, openedBaudRate: 0, closed: false };

  const port = {
    get readable() {
      return { pipeThrough: () => ({ getReader: () => reader }) };
    },
    open: async (options: { baudRate: number }) => {
      state.opened = true;
      state.openedBaudRate = options.baudRate;
    },
    close: async () => {
      state.closed = true;
    },
  };

  return { port: port as unknown as SerialPortLike, state };
}

function installSerial(api: unknown): void {
  Object.defineProperty(navigator, 'serial', { configurable: true, value: api });
}

describe('parseScaleFrame', () => {
  it('extracts weight, unit and stability from a default Torrey-style frame', () => {
    const parsed = parseScaleFrame('ST,GS,+   1.234 kg', DEFAULT_SCALE_PARSE_PATTERN, 'ST');
    expect(parsed).not.toBeNull();
    expect(parsed!.weight).toBe(1.234);
    expect(parsed!.unit).toBe('kg');
    expect(parsed!.stable).toBe(true);
  });

  it('marks a frame without the stable token as unstable', () => {
    const parsed = parseScaleFrame('US,GS,+   0.500 kg', DEFAULT_SCALE_PARSE_PATTERN, 'ST');
    expect(parsed).not.toBeNull();
    expect(parsed!.weight).toBe(0.5);
    expect(parsed!.stable).toBe(false);
  });

  it('parses a frame with a different mode token (CAS-style)', () => {
    const parsed = parseScaleFrame('ST,NT,  2.000 kg', DEFAULT_SCALE_PARSE_PATTERN, 'ST');
    expect(parsed).not.toBeNull();
    expect(parsed!.weight).toBe(2);
    expect(parsed!.stable).toBe(true);
  });

  it('returns null for unrecognised frames', () => {
    expect(parseScaleFrame('not-a-frame', DEFAULT_SCALE_PARSE_PATTERN, 'ST')).toBeNull();
    expect(parseScaleFrame('   ', DEFAULT_SCALE_PARSE_PATTERN, 'ST')).toBeNull();
  });

  it('returns null when the configured pattern is not a valid regex', () => {
    expect(parseScaleFrame('ST,GS,1.000 kg', '(', 'ST')).toBeNull();
  });

  it('honours a custom parse expression', () => {
    const pattern = '^(?:\\w+):(-?\\d+(?:\\.\\d+)?)(kg|g)$';
    const parsed = parseScaleFrame('W:3.5kg', pattern, 'ST');
    expect(parsed).not.toBeNull();
    expect(parsed!.weight).toBe(3.5);
    expect(parsed!.unit).toBe('kg');
    expect(parsed!.stable).toBe(false);
  });
});

describe('supportsWebSerial', () => {
  let originalSerial: unknown;

  beforeEach(() => {
    originalSerial = (navigator as unknown as { serial?: unknown }).serial;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serial', { configurable: true, value: originalSerial });
  });

  it('is false when navigator.serial is absent', () => {
    Object.defineProperty(navigator, 'serial', { configurable: true, value: undefined });
    expect(supportsWebSerial()).toBe(false);
  });

  it('is true when navigator.serial is present', () => {
    installSerial({ getPorts: async () => [], requestPort: async () => ({}) });
    expect(supportsWebSerial()).toBe(true);
  });
});

describe('WebSerialScaleService', () => {
  let originalSerial: unknown;

  beforeEach(() => {
    originalSerial = (navigator as unknown as { serial?: unknown }).serial;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serial', { configurable: true, value: originalSerial });
  });

  it('connects to a previously authorised port and opens it with the configured baud rate', async () => {
    const { port, state } = createFakePort([]);
    installSerial({ getPorts: async () => [port], requestPort: async () => port });

    const service = new WebSerialScaleService(makeConfig({ baudRate: 19200 }), 'browser');
    await service.connect();

    expect(state.opened).toBe(true);
    expect(state.openedBaudRate).toBe(19200);
    expect(service.status()).toBe(SCALE_STATUS.CONNECTED);
    expect(service.errorMessage()).toBeNull();
  });

  it('requests a new port when no authorised port exists', async () => {
    const { port } = createFakePort([]);
    let requested = false;
    installSerial({
      getPorts: async () => [],
      requestPort: async () => {
        requested = true;
        return port;
      },
    });

    const service = new WebSerialScaleService(makeConfig(), 'browser');
    await service.connect();

    expect(requested).toBe(true);
    expect(service.status()).toBe(SCALE_STATUS.CONNECTED);
  });

  it('reports ERROR when the Web Serial API is unavailable', async () => {
    Object.defineProperty(navigator, 'serial', { configurable: true, value: undefined });

    const service = new WebSerialScaleService(makeConfig(), 'browser');
    await service.connect();

    expect(service.status()).toBe(SCALE_STATUS.ERROR);
    expect(service.errorMessage()).toContain('Web Serial');
  });

  it('never touches navigator.serial when not in a browser (SSR guard)', async () => {
    installSerial({
      getPorts: async () => {
        throw new Error('should not be called on the server');
      },
      requestPort: async () => {
        throw new Error('should not be called on the server');
      },
    });

    const service = new WebSerialScaleService(makeConfig(), 'server');
    await service.connect();

    expect(service.status()).toBe(SCALE_STATUS.ERROR);
  });

  it('emits readings parsed from the serial frames', async () => {
    const { port } = createFakePort(['ST,GS,+   1.234 kg', 'ST,GS,+   1.500 kg']);
    installSerial({ getPorts: async () => [port], requestPort: async () => port });

    const service = new WebSerialScaleService(makeConfig(), 'browser');
    await service.connect();
    service.startPolling();
    await flush();
    await flush();

    const reading = service.currentReading();
    expect(reading).not.toBeNull();
    expect(reading!.weight).toBe(1.5);
    expect(reading!.unit).toBe('kg');
    expect(reading!.stable).toBe(true);

    await service.disconnect();
  });

  it('cleans up the reader and port on disconnect', async () => {
    const { port, state } = createFakePort(['ST,GS,+   2.000 kg']);
    installSerial({ getPorts: async () => [port], requestPort: async () => port });

    const service = new WebSerialScaleService(makeConfig(), 'browser');
    await service.connect();
    service.startPolling();
    await flush();
    await service.disconnect();

    expect(state.closed).toBe(true);
    expect(service.status()).toBe(SCALE_STATUS.DISCONNECTED);
    expect(service.currentReading()).toBeNull();
  });
});
