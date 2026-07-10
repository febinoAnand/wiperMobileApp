import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { log } from '@/constants/debug';
import type { AckMessage, BluetoothDeviceInfo, ConnectionStatus, DualWiperReading, SessionReport, WiperReading, WipeRecord } from '@/types/wiper';

import type { BluetoothService, Unsubscribe } from './bluetooth-service';
import { parseLine, type SessionStartData } from './parse-line';
import { ensureBluetoothPermissions } from './permissions';

const DEFAULT_ACK_TIMEOUT_MS = 5000;
const DEFAULT_REPORT_TIMEOUT_MS = 15000;
// If the device goes silent for this long (e.g. powered off or reset mid-connection), the
// underlying socket often doesn't notice on its own - treat it as disconnected ourselves.
const DATA_TIMEOUT_MS = 30000;

function toDeviceInfo(device: BluetoothDevice): BluetoothDeviceInfo {
  return { id: device.address, name: device.name || device.address, bonded: Boolean(device.bonded) };
}

export function createClassicBluetoothService(): BluetoothService {
  let connectedDevice: BluetoothDevice | null = null;
  let dataSubscription: { remove: () => void } | null = null;
  let dataWatchdogHandle: ReturnType<typeof setTimeout> | null = null;

  let dualReadingListeners: ((reading: DualWiperReading) => void)[] = [];
  let readingListeners: ((reading: WiperReading) => void)[] = [];
  let connectionListeners: ((status: ConnectionStatus, device?: BluetoothDeviceInfo) => void)[] = [];
  let pendingAck: { cmd: string; resolve: (ack: AckMessage) => void; timeoutHandle: ReturnType<typeof setTimeout> } | null = null;
  let pendingReport: {
    sessionStart: SessionStartData | null;
    records: WipeRecord[];
    resolve: (report: SessionReport) => void;
    timeoutHandle: ReturnType<typeof setTimeout>;
  } | null = null;

  function emitDualReading(reading: DualWiperReading) {
    dualReadingListeners.forEach((listener) => listener(reading));
  }

  function emitReading(reading: WiperReading) {
    readingListeners.forEach((listener) => listener(reading));
  }

  function emitConnectionChange(status: ConnectionStatus, device?: BluetoothDeviceInfo) {
    connectionListeners.forEach((listener) => listener(status, device));
  }

  function clearDataWatchdog() {
    if (dataWatchdogHandle) {
      clearTimeout(dataWatchdogHandle);
      dataWatchdogHandle = null;
    }
  }

  function resetDataWatchdog() {
    clearDataWatchdog();
    dataWatchdogHandle = setTimeout(() => {
      dataWatchdogHandle = null;
      const device = connectedDevice;
      connectedDevice = null;
      dataSubscription?.remove();
      dataSubscription = null;
      device?.disconnect().catch(() => {});
      emitConnectionChange('disconnected');
    }, DATA_TIMEOUT_MS);
  }

  // The native module's default connection type is "delimited" - it already splits
  // incoming bytes on `\n` and delivers one complete message (delimiter stripped) per event.
  function handleData(event: { data: string }) {
    resetDataWatchdog();
    log('[bluetooth] received:', event.data);

    const message = parseLine(event.data);
    if (!message) {
      return;
    }

    switch (message.kind) {
      case 'dualReading':
        emitDualReading(message.reading);
        return;

      case 'reading':
        emitReading(message.reading);
        return;

      case 'ack':
        if (pendingAck && pendingAck.cmd === message.ack.cmd) {
          clearTimeout(pendingAck.timeoutHandle);
          pendingAck.resolve(message.ack);
          pendingAck = null;
        }
        return;

      case 'sessionStart':
        if (pendingReport) {
          pendingReport.sessionStart = message.data;
        }
        return;

      case 'batch':
        log(`[bluetooth] batch ${message.index}/${message.total}:`, message.records);
        if (pendingReport) {
          pendingReport.records.push(...message.records);
        }
        return;

      case 'sessionEnd':
        if (pendingReport && pendingReport.sessionStart) {
          clearTimeout(pendingReport.timeoutHandle);
          pendingReport.resolve({ ...pendingReport.sessionStart, records: pendingReport.records });
          pendingReport = null;
        }
        return;
    }
  }

  async function writeRaw(data: string) {
    if (!connectedDevice) {
      throw new Error('Not connected to a device');
    }
    log('[bluetooth] send:', data);
    await connectedDevice.write(data.endsWith('\n') ? data : `${data}\n`);
  }

  return {
    async listBondedDevices() {
      await ensureBluetoothPermissions();
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(toDeviceInfo);
    },

    async scanForDevices() {
      await ensureBluetoothPermissions();
      const devices = await RNBluetoothClassic.startDiscovery();
      return devices.map(toDeviceInfo);
    },

    async connect(deviceId: string) {
      emitConnectionChange('connecting');
      try {
        await ensureBluetoothPermissions();
        const device = await RNBluetoothClassic.connectToDevice(deviceId);
        connectedDevice = device;
        dataSubscription = device.onDataReceived(handleData);
        resetDataWatchdog();
        emitConnectionChange('connected', toDeviceInfo(device));
      } catch (error) {
        emitConnectionChange('disconnected');
        throw error;
      }
    },

    async disconnect() {
      clearDataWatchdog();
      dataSubscription?.remove();
      dataSubscription = null;
      await connectedDevice?.disconnect();
      connectedDevice = null;
      emitConnectionChange('disconnected');
    },

    async write(data: string) {
      await writeRaw(data);
    },

    async sendCommand(payload, timeoutMs = DEFAULT_ACK_TIMEOUT_MS) {
      if (pendingAck) {
        throw new Error('Another command is already awaiting a response');
      }

      return new Promise<AckMessage>((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          pendingAck = null;
          reject(new Error(`Timed out waiting for ack to "${payload.cmd}"`));
        }, timeoutMs);

        pendingAck = { cmd: payload.cmd, resolve, timeoutHandle };

        writeRaw(JSON.stringify(payload)).catch((error) => {
          clearTimeout(timeoutHandle);
          pendingAck = null;
          reject(error);
        });
      });
    },

    async fetchSessionReport(wiperNo, timeoutMs = DEFAULT_REPORT_TIMEOUT_MS) {
      if (pendingReport) {
        throw new Error('Another report request is already in progress');
      }

      return new Promise<SessionReport>((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          const partial = pendingReport;
          pendingReport = null;
          // Resolve with whatever batches arrived before the timeout, rather than discarding
          // them, so the UI can still list each sequence even if session_end never arrived.
          if (!partial || (!partial.sessionStart && partial.records.length === 0)) {
            reject(new Error('Timed out waiting for the session report'));
            return;
          }
          resolve({
            wiperNo: partial.sessionStart?.wiperNo ?? wiperNo,
            timestamp: partial.sessionStart?.timestamp ?? Math.floor(Date.now() / 1000),
            duration: partial.sessionStart?.duration ?? 0,
            wipes: partial.sessionStart?.wipes ?? partial.records.length,
            strokes: partial.sessionStart?.strokes ?? Math.floor(partial.records.length / 2),
            records: partial.records,
          });
        }, timeoutMs);

        pendingReport = { sessionStart: null, records: [], resolve, timeoutHandle };

        writeRaw(JSON.stringify({ cmd: 'resend', wiper_no: wiperNo })).catch((error) => {
          clearTimeout(timeoutHandle);
          pendingReport = null;
          reject(error);
        });
      });
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
