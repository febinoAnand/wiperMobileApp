import type { AckMessage, BluetoothDeviceInfo, ConnectionStatus, DualWiperReading, SessionReport, WiperReading, WipeRecord } from '@/types/wiper';

import type { BluetoothService, Unsubscribe } from './bluetooth-service';

const MOCK_DEVICES: BluetoothDeviceInfo[] = [
  { id: 'mock-1', name: 'Wiper Module (Simulated)', bonded: true },
  { id: 'mock-2', name: 'HC-05 Serial', bonded: true },
];

// Raw sensor angle isn't centered at 0 - mirrors the real "angle: 32.61" style readings.
const MOCK_RAW_CENTER_DEG = 45;
const SWING_PERIOD_MS = 1400;
const SWING_AMPLITUDE_DEG = 25;
const EMIT_INTERVAL_MS = 100;

/** Simulates a connected wiper module so the UI is testable without hardware. */
export function createMockBluetoothService(): BluetoothService {
  let dualReadingListeners: ((reading: DualWiperReading) => void)[] = [];
  let readingListeners: ((reading: WiperReading) => void)[] = [];
  let connectionListeners: ((status: ConnectionStatus, device?: BluetoothDeviceInfo) => void)[] = [];
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;
  let isWiping = false;
  let seq = 0;
  let lastDirection: 'fwd' | 'bwd' | null = null;
  let currentAngle = MOCK_RAW_CENTER_DEG;
  let lastDuration = 60;

  function emitDualReading(reading: DualWiperReading) {
    dualReadingListeners.forEach((listener) => listener(reading));
  }

  function emitReading(reading: WiperReading) {
    readingListeners.forEach((listener) => listener(reading));
  }

  function emitConnectionChange(status: ConnectionStatus, device?: BluetoothDeviceInfo) {
    connectionListeners.forEach((listener) => listener(status, device));
  }

  function startEmitting() {
    startedAt = Date.now();
    intervalHandle = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const phase = (elapsed % SWING_PERIOD_MS) / SWING_PERIOD_MS;
      const wave = Math.sin(phase * Math.PI * 2);
      const angle = MOCK_RAW_CENTER_DEG + wave * SWING_AMPLITUDE_DEG;
      const pressure = 2 + Math.random() * 0.4;
      currentAngle = angle;

      if (!isWiping) {
        emitDualReading({ angleL: angle, angleR: angle - 3.1, pressure, timestamp: Date.now() });
        return;
      }

      const direction: 'fwd' | 'bwd' = wave >= 0 ? 'fwd' : 'bwd';
      if (direction !== lastDirection) {
        seq += 1;
        lastDirection = direction;
      }
      emitReading({ angle, pressure, seq, dir: direction, timestamp: Date.now() });
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

    async write(data: string) {
      console.log('[mock bluetooth] write:', data);
      try {
        const parsed = JSON.parse(data);
        if (parsed?.cmd === 'start') {
          isWiping = true;
          seq = 0;
          lastDirection = null;
          if (typeof parsed.duration === 'number') {
            lastDuration = parsed.duration;
          }
        } else if (parsed?.cmd === 'stop') {
          isWiping = false;
        }
      } catch {
        // ignore malformed commands
      }
    },

    async sendCommand(payload): Promise<AckMessage> {
      console.log('[mock bluetooth] sendCommand:', payload);
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { type: 'ack', cmd: payload.cmd, status: 'ok', angle: currentAngle };
    },

    async fetchSessionReport(wiperNo): Promise<SessionReport> {
      console.log('[mock bluetooth] fetchSessionReport for', wiperNo);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const records: WipeRecord[] = [];
      for (let i = 1; i <= seq; i += 1) {
        records.push({
          seq: i,
          dir: i % 2 === 1 ? 'fwd' : 'bwd',
          angle: MOCK_RAW_CENTER_DEG + (i % 2 === 1 ? SWING_AMPLITUDE_DEG : -SWING_AMPLITUDE_DEG),
          pressure: 2 + Math.random() * 0.4,
        });
      }
      return {
        wiperNo,
        timestamp: Math.floor(Date.now() / 1000),
        duration: lastDuration,
        wipes: seq,
        strokes: Math.floor(seq / 2),
        records,
      };
    },

    onDualReading(callback): Unsubscribe {
      dualReadingListeners.push(callback);
      return () => {
        dualReadingListeners = dualReadingListeners.filter((listener) => listener !== callback);
      };
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
