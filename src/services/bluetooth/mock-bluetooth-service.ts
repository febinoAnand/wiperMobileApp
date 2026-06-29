import type { BluetoothDeviceInfo, ConnectionStatus, WiperReading } from '@/types/wiper';

import type { BluetoothService, Unsubscribe } from './bluetooth-service';

const MOCK_DEVICES: BluetoothDeviceInfo[] = [
  { id: 'mock-1', name: 'Wiper Module (Simulated)', bonded: true },
  { id: 'mock-2', name: 'HC-05 Serial', bonded: true },
];

// Raw sensor angle isn't centered at 0 - mirrors the real "Deg: 32.61" style readings.
const MOCK_RAW_CENTER_DEG = 45;
const SWING_PERIOD_MS = 1400;
const SWING_AMPLITUDE_DEG = 25;
const EMIT_INTERVAL_MS = 100;

/** Simulates a connected wiper module so the UI is testable without hardware. */
export function createMockBluetoothService(): BluetoothService {
  let readingListeners: ((reading: WiperReading) => void)[] = [];
  let connectionListeners: ((status: ConnectionStatus, device?: BluetoothDeviceInfo) => void)[] = [];
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;
  let count = 0;
  let lastSwingDirection = 1;

  function emitReading(reading: WiperReading) {
    readingListeners.forEach((listener) => listener(reading));
  }

  function emitConnectionChange(status: ConnectionStatus, device?: BluetoothDeviceInfo) {
    connectionListeners.forEach((listener) => listener(status, device));
  }

  function startEmitting() {
    startedAt = Date.now();
    count = 0;
    lastSwingDirection = 1;
    intervalHandle = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const phase = (elapsed % SWING_PERIOD_MS) / SWING_PERIOD_MS;
      const wave = Math.sin(phase * Math.PI * 2);
      const angle = MOCK_RAW_CENTER_DEG + wave * SWING_AMPLITUDE_DEG;
      const direction = wave >= 0 ? 1 : -1;
      if (direction !== lastSwingDirection) {
        count += 1;
        lastSwingDirection = direction;
      }
      const pressure = 2 + Math.random() * 0.4;
      emitReading({ angle, pressure, count, timestamp: Date.now() });
    }, EMIT_INTERVAL_MS);
  }

  return {
    async listBondedDevices() {
      return MOCK_DEVICES;
    },

    async scanForDevices() {
      return MOCK_DEVICES;
    },

    async connect(deviceId: string) {
      emitConnectionChange('connecting');
      const device = MOCK_DEVICES.find((candidate) => candidate.id === deviceId) ?? MOCK_DEVICES[0];
      startEmitting();
      emitConnectionChange('connected', device);
    },

    async disconnect() {
      if (intervalHandle) {
        clearInterval(intervalHandle);
      }
      intervalHandle = null;
      emitConnectionChange('disconnected');
    },

    onReading(callback): Unsubscribe {
      readingListeners.push(callback);
      return () => {
        readingListeners = readingListeners.filter((listener) => listener !== callback);
      };
    },

    onConnectionChange(callback): Unsubscribe {
      connectionListeners.push(callback);
      return () => {
        connectionListeners = connectionListeners.filter((listener) => listener !== callback);
      };
    },
  };
}
